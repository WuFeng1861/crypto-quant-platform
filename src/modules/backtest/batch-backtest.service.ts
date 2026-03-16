import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BatchBacktest, BatchBacktestStatus } from './entities/batch-backtest.entity';
import { BatchBacktestItem, BatchBacktestItemStatus } from './entities/batch-backtest-item.entity';
import { CreateBatchBacktestDto } from './dto/create-batch-backtest.dto';
import { RetryBatchBacktestDto, ForceRetryBatchBacktestDto } from './dto/batch-backtest-query.dto';
import { TradingPair } from '../common/entities/trading-pair.entity';
import { BacktestService } from './backtest.service';
import { StrategiesService } from '../strategies/strategies.service';

const MAX_RETRIES = 3;
const PAUSE_TIMEOUT_MS = 5 * 60 * 1000; // 5分钟
const ITEM_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟

@Injectable()
export class BatchBacktestService {
  private activeExecutions: Map<number, boolean> = new Map();

  constructor(
    @InjectRepository(BatchBacktest)
    private batchBacktestRepository: Repository<BatchBacktest>,
    @InjectRepository(BatchBacktestItem)
    private batchBacktestItemRepository: Repository<BatchBacktestItem>,
    @InjectRepository(TradingPair)
    private tradingPairRepository: Repository<TradingPair>,
    private backtestService: BacktestService,
    private strategiesService: StrategiesService,
  ) {}

  async createBatchBacktest(dto: CreateBatchBacktestDto): Promise<BatchBacktest> {
    // 验证策略是否存在
    const strategy = await this.strategiesService.findOne(dto.strategyId);
    if (!strategy) {
      throw new BadRequestException({
        code: 'STRATEGY_NOT_FOUND',
        message: `策略不存在: ${dto.strategyId}`
      });
    }

    // 获取交易对列表
    let pairIds: number[];
    if (dto.pairIds && dto.pairIds.length > 0) {
      pairIds = dto.pairIds;
    } else {
      // 自动获取所有交易对
      const pairs = await this.tradingPairRepository.find();
      pairIds = pairs.map(p => p.id);
    }

    // 验证交易对数量限制
    if (pairIds.length > 500) {
      throw new BadRequestException({
        code: 'PAIR_LIMIT_EXCEEDED',
        message: `交易对数量超过上限（最大 500 个），当前数量：${pairIds.length}`
      });
    }

    // 验证交易对是否存在
    const existingPairs = await this.tradingPairRepository.findBy({ id: In(pairIds) });
    if (existingPairs.length !== pairIds.length) {
      const existingIds = existingPairs.map(p => p.id);
      const invalidIds = pairIds.filter(id => !existingIds.includes(id));
      throw new BadRequestException({
        code: 'PAIR_NOT_FOUND',
        message: `交易对不存在: ${invalidIds.join(', ')}`
      });
    }

    // 创建批量任务
    const batchBacktest = this.batchBacktestRepository.create({
      strategyId: dto.strategyId,
      timeframeId: dto.timeframeId,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      initialCapital: dto.initialCapital,
      earlyStopThreshold: dto.earlyStopThreshold,
      positionDivision: dto.positionDivision,
      status: BatchBacktestStatus.PENDING,
      totalPairs: pairIds.length,
      completedPairs: 0,
      failedPairs: 0,
    });

    const savedBatch = await this.batchBacktestRepository.save(batchBacktest);

    // 创建子任务
    const items = pairIds.map(pairId =>
      this.batchBacktestItemRepository.create({
        batchId: savedBatch.id,
        pairId,
        status: BatchBacktestItemStatus.PENDING,
        retries: 0,
      })
    );

    await this.batchBacktestItemRepository.save(items);

    return savedBatch;
  }

  async findAll(page: number = 1, limit: number = 20, status?: BatchBacktestStatus): Promise<{ items: BatchBacktest[]; total: number }> {
    const where = status ? { status } : {};
    const [items, total] = await this.batchBacktestRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async findOne(id: number): Promise<BatchBacktest> {
    const batch = await this.batchBacktestRepository.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException({
        code: 'BATCH_NOT_FOUND',
        message: `批量任务不存在: ${id}`
      });
    }
    return batch;
  }

  async findItems(batchId: number, page: number = 1, limit: number = 50, status?: string): Promise<{ items: BatchBacktestItem[]; total: number }> {
    const where: any = { batchId };
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.batchBacktestItemRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async startBatchBacktest(id: number): Promise<BatchBacktest> {
    const batch = await this.findOne(id);

    if (batch.status !== BatchBacktestStatus.PENDING && batch.status !== BatchBacktestStatus.PAUSED) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: `任务状态不允许启动，当前状态: ${batch.status}`
      });
    }

    await this.batchBacktestRepository.update(id, {
      status: BatchBacktestStatus.RUNNING,
      startedAt: new Date(),
      pauseRequested: false,
      pauseTimeoutAt: null,
    });

    // 异步执行批量回测
    this.executeBatchBacktest(id).catch(error => {
      console.error(`批量回测 ${id} 执行失败:`, error);
    });

    return this.findOne(id);
  }

  async pauseBatchBacktest(id: number): Promise<BatchBacktest> {
    const batch = await this.findOne(id);

    if (batch.status !== BatchBacktestStatus.RUNNING) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: `任务未在执行中，当前状态: ${batch.status}`
      });
    }

    await this.batchBacktestRepository.update(id, {
      pauseRequested: true,
      pauseTimeoutAt: new Date(Date.now() + PAUSE_TIMEOUT_MS),
    });

    return this.findOne(id);
  }

  async resumeBatchBacktest(id: number): Promise<BatchBacktest> {
    const batch = await this.findOne(id);

    if (batch.status !== BatchBacktestStatus.PAUSED) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: `任务未在暂停状态，当前状态: ${batch.status}`
      });
    }

    await this.batchBacktestRepository.update(id, {
      status: BatchBacktestStatus.RUNNING,
      pauseRequested: false,
      pauseTimeoutAt: null,
    });

    // 异步继续执行
    this.executeBatchBacktest(id).catch(error => {
      console.error(`批量回测 ${id} 继续执行失败:`, error);
    });

    return this.findOne(id);
  }

  async cancelBatchBacktest(id: number): Promise<BatchBacktest> {
    const batch = await this.findOne(id);

    if (batch.status === BatchBacktestStatus.COMPLETED || batch.status === BatchBacktestStatus.CANCELLED) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: `任务已完成或已取消，无法取消，当前状态: ${batch.status}`
      });
    }

    await this.batchBacktestRepository.update(id, {
      status: BatchBacktestStatus.CANCELLED,
      completedAt: new Date(),
    });

    // 取消未执行的子任务
    await this.batchBacktestItemRepository.update(
      { batchId: id, status: BatchBacktestItemStatus.PENDING },
      { status: BatchBacktestItemStatus.CANCELLED }
    );

    return this.findOne(id);
  }

  async retryFailedItems(id: number, dto?: RetryBatchBacktestDto): Promise<BatchBacktest> {
    const batch = await this.findOne(id);

    // 获取失败的子任务
    const where: any = {
      batchId: id,
      status: BatchBacktestItemStatus.FAILED,
    };

    if (dto?.pairIds && dto.pairIds.length > 0) {
      where.pairId = In(dto.pairIds);
    }

    const failedItems = await this.batchBacktestItemRepository.find({ where });

    if (failedItems.length === 0) {
      throw new BadRequestException({
        code: 'NO_RETRYABLE_TASKS',
        message: '没有可重试的失败任务'
      });
    }

    // 过滤掉已达到重试次数上限的任务
    const retryableItems = failedItems.filter(item => item.retries < MAX_RETRIES);

    if (retryableItems.length === 0) {
      throw new BadRequestException({
        code: 'MAX_RETRIES_REACHED',
        message: '子任务已达到最大重试次数（3次）',
        details: {
          pairIds: failedItems.map(item => item.pairId),
          retries: MAX_RETRIES
        }
      });
    }

    // 重置可重试任务的状态
    for (const item of retryableItems) {
      await this.batchBacktestItemRepository.update(item.id, {
        status: BatchBacktestItemStatus.PENDING,
        retries: item.retries + 1,
        errorMessage: null,
      });
    }

    // 更新批量任务状态
    await this.batchBacktestRepository.update(id, {
      status: BatchBacktestStatus.RUNNING,
    });

    // 异步执行
    this.executeBatchBacktest(id).catch(error => {
      console.error(`批量回测 ${id} 重试执行失败:`, error);
    });

    return this.findOne(id);
  }

  async forceRetryItems(id: number, dto: ForceRetryBatchBacktestDto): Promise<BatchBacktest> {
    const batch = await this.findOne(id);

    if (!dto.pairIds || dto.pairIds.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_PARAMS',
        message: '请指定要强制重试的交易对'
      });
    }

    // 获取指定的子任务
    const items = await this.batchBacktestItemRepository.find({
      where: {
        batchId: id,
        pairId: In(dto.pairIds),
      }
    });

    if (items.length === 0) {
      throw new BadRequestException({
        code: 'ITEMS_NOT_FOUND',
        message: '指定的子任务不存在'
      });
    }

    // 重置任务状态（不增加重试次数）
    for (const item of items) {
      await this.batchBacktestItemRepository.update(item.id, {
        status: BatchBacktestItemStatus.PENDING,
        errorMessage: null,
      });
    }

    // 更新批量任务状态
    await this.batchBacktestRepository.update(id, {
      status: BatchBacktestStatus.RUNNING,
    });

    // 异步执行
    this.executeBatchBacktest(id).catch(error => {
      console.error(`批量回测 ${id} 强制重试执行失败:`, error);
    });

    return this.findOne(id);
  }

  async getSummary(id: number): Promise<any> {
    const batch = await this.findOne(id);

    const items = await this.batchBacktestItemRepository.find({
      where: { batchId: id, status: BatchBacktestItemStatus.COMPLETED },
    });

    if (items.length === 0) {
      return {
        batchId: id,
        totalPairs: batch.totalPairs,
        completedPairs: batch.completedPairs,
        failedPairs: batch.failedPairs,
        summary: null,
      };
    }

    // 获取回测结果详情
    const backtestIds = items
      .filter(item => item.backtestResultId)
      .map(item => item.backtestResultId);

    // TODO: 从 backtest_results 表获取详细统计数据
    // 这里简化处理，返回基础统计

    return {
      batchId: id,
      totalPairs: batch.totalPairs,
      completedPairs: batch.completedPairs,
      failedPairs: batch.failedPairs,
      summary: {
        completedItems: items.length,
      },
    };
  }

  private async executeBatchBacktest(batchId: number): Promise<void> {
    // 防止重复执行
    if (this.activeExecutions.get(batchId)) {
      return;
    }
    this.activeExecutions.set(batchId, true);

    try {
      const batch = await this.findOne(batchId);

      // 获取待执行的子任务
      const pendingItems = await this.batchBacktestItemRepository.find({
        where: {
          batchId,
          status: In([BatchBacktestItemStatus.PENDING, BatchBacktestItemStatus.FAILED]),
        },
        order: { id: 'ASC' },
      });

      for (const item of pendingItems) {
        // 检查是否请求暂停
        const currentBatch = await this.findOne(batchId);

        if (currentBatch.pauseRequested) {
          // 检查是否超时
          if (currentBatch.pauseTimeoutAt && new Date() > currentBatch.pauseTimeoutAt) {
            // 超时，取消当前子任务
            await this.batchBacktestItemRepository.update(item.id, {
              status: BatchBacktestItemStatus.FAILED,
              errorMessage: '暂停超时，任务被取消',
              completedAt: new Date(),
            });
          }

          await this.batchBacktestRepository.update(batchId, {
            status: BatchBacktestStatus.PAUSED,
            pauseRequested: false,
            pauseTimeoutAt: null,
          });

          this.activeExecutions.delete(batchId);
          return;
        }

        if (currentBatch.status === BatchBacktestStatus.CANCELLED) {
          this.activeExecutions.delete(batchId);
          return;
        }

        // 执行子任务
        await this.executeItem(batch, item);
      }

      // 更新批量任务状态为完成
      await this.batchBacktestRepository.update(batchId, {
        status: BatchBacktestStatus.COMPLETED,
        completedAt: new Date(),
      });

    } catch (error) {
      console.error(`批量回测 ${batchId} 执行异常:`, error);

      // 数据库连接中断处理
      if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
        await this.batchBacktestRepository.update(batchId, {
          status: BatchBacktestStatus.PAUSED,
        });
      } else {
        await this.batchBacktestRepository.update(batchId, {
          status: BatchBacktestStatus.FAILED,
        });
      }
    } finally {
      this.activeExecutions.delete(batchId);
    }
  }

  private async executeItem(batch: BatchBacktest, item: BatchBacktestItem): Promise<void> {
    try {
      // 更新子任务状态为执行中
      await this.batchBacktestItemRepository.update(item.id, {
        status: BatchBacktestItemStatus.RUNNING,
        startedAt: new Date(),
        timeoutAt: new Date(Date.now() + ITEM_TIMEOUT_MS),
      });

      // 执行回测
      const result = await this.backtestService.runBacktest({
        strategyId: batch.strategyId,
        pairId: item.pairId,
        timeframeId: batch.timeframeId,
        startTime: batch.startTime.toISOString(),
        endTime: batch.endTime.toISOString(),
        initialCapital: batch.initialCapital,
        earlyStopThreshold: batch.earlyStopThreshold,
        positionDivision: batch.positionDivision,
      });

      if (result.success && result.backtestId) {
        // 执行成功
        await this.batchBacktestItemRepository.update(item.id, {
          status: BatchBacktestItemStatus.COMPLETED,
          backtestResultId: result.backtestId,
          completedAt: new Date(),
        });

        // 更新完成计数
        await this.batchBacktestRepository.increment({ id: batch.id }, 'completedPairs', 1);
      } else {
        // 执行失败
        await this.batchBacktestItemRepository.update(item.id, {
          status: BatchBacktestItemStatus.FAILED,
          errorMessage: result.message || '回测执行失败',
          completedAt: new Date(),
        });

        // 更新失败计数
        await this.batchBacktestRepository.increment({ id: batch.id }, 'failedPairs', 1);
      }

    } catch (error) {
      console.error(`子任务 ${item.id} 执行失败:`, error);

      await this.batchBacktestItemRepository.update(item.id, {
        status: BatchBacktestItemStatus.FAILED,
        errorMessage: error.message || '执行异常',
        completedAt: new Date(),
      });

      await this.batchBacktestRepository.increment({ id: batch.id }, 'failedPairs', 1);
    }
  }
}
