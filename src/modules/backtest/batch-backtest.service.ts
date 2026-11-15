import { Injectable } from '@nestjs/common';
import {
  BusinessException,
  StrategyNotFoundException,
  PairNotFoundException,
  PairLimitExceededException,
  QueueFullException,
  BatchNotFoundException,
  InvalidStatusException,
} from '../common/exceptions/business.exception';
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
const MAX_PAIR_LIMIT = 10000; // 交易对数量上限
const MAX_QUEUE_LENGTH = 100; // 队列最大长度

interface QueueItem {
  id: number;
  type: 'batch' | 'single';
  data: any;
  queuedAt: Date;
}

@Injectable()
export class BatchBacktestService {
  private activeExecutions: Map<number, boolean> = new Map();
  private backtestQueue: QueueItem[] = [];
  private isProcessingQueue: boolean = false;
  private currentTask: QueueItem | null = null;

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
      throw new StrategyNotFoundException(dto.strategyId);
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
    if (pairIds.length > MAX_PAIR_LIMIT) {
      throw new PairLimitExceededException(pairIds.length, MAX_PAIR_LIMIT);
    }

    // 验证交易对是否存在
    const existingPairs = await this.tradingPairRepository.findBy({ id: In(pairIds) });
    if (existingPairs.length !== pairIds.length) {
      const existingIds = existingPairs.map(p => p.id);
      const invalidIds = pairIds.filter(id => !existingIds.includes(id));
      throw new PairNotFoundException(invalidIds);
    }

    // 检查队列是否已满
    if (this.backtestQueue.length >= MAX_QUEUE_LENGTH) {
      throw new QueueFullException(MAX_QUEUE_LENGTH);
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
      status: BatchBacktestStatus.QUEUED,
      totalPairs: pairIds.length,
      completedPairs: 0,
      failedPairs: 0,
      progress: 0,
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

    // 添加到队列
    this.backtestQueue.push({
      id: savedBatch.id,
      type: 'batch',
      data: savedBatch,
      queuedAt: new Date(),
    });

    // 触发队列处理
    this.processQueue();

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
      throw new BatchNotFoundException(id);
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
      throw new InvalidStatusException(batch.status, 'PENDING or PAUSED');
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
      throw new InvalidStatusException(batch.status, 'RUNNING');
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
      throw new InvalidStatusException(batch.status, 'PAUSED');
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
      throw new BusinessException('INVALID_STATUS', `任务已完成或已取消，无法取消，当前状态: ${batch.status}`);
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
      throw new BusinessException('NO_RETRYABLE_TASKS', '没有可重试的失败任务');
    }

    // 过滤掉已达到重试次数上限的任务
    const retryableItems = failedItems.filter(item => item.retries < MAX_RETRIES);

    if (retryableItems.length === 0) {
      throw new BusinessException('MAX_RETRIES_REACHED', '子任务已达到最大重试次数（3次）');
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
      throw new BusinessException('INVALID_PARAMS', '请指定要强制重试的交易对');
    }

    // 获取指定的子任务
    const items = await this.batchBacktestItemRepository.find({
      where: {
        batchId: id,
        pairId: In(dto.pairIds),
      }
    });

    if (items.length === 0) {
      throw new BusinessException('ITEMS_NOT_FOUND', '指定的子任务不存在');
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

    // 记录没有价格数据的交易对
    const noDataPairs: number[] = [];

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
        await this.executeItem(batch, item, noDataPairs);
      }

      // 打印没有价格数据的交易对汇总
      if (noDataPairs.length > 0) {
        console.log(`[批量回测] 任务 ${batchId} 完成，以下交易对没有价格数据被跳过: ${noDataPairs.join(', ')}`);
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

  private async executeItem(
    batch: BatchBacktest,
    item: BatchBacktestItem,
    noDataPairs?: number[],
  ): Promise<void> {
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
        // 检查是否是因为没有价格数据
        const errorMessage = result.message || '';
        if (errorMessage.includes('No price data found')) {
          console.log(`[批量回测] 交易对 ${item.pairId} 在指定时间段没有价格数据，跳过`);

          // 记录到无数据列表
          if (noDataPairs) {
            noDataPairs.push(item.pairId);
          }

          // 标记为跳过（使用特殊状态或标记）
          await this.batchBacktestItemRepository.update(item.id, {
            status: BatchBacktestItemStatus.FAILED,
            errorMessage: 'SKIP_NO_DATA: 指定时间段没有价格数据',
            completedAt: new Date(),
          });

          // 不增加失败计数，因为这不是真正的失败
          return;
        }

        // 其他执行失败
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

      // 检查是否是因为没有价格数据
      const errorMessage = error.message || '';
      if (errorMessage.includes('No price data found')) {
        console.log(`[批量回测] 交易对 ${item.pairId} 在指定时间段没有价格数据，跳过`);

        // 记录到无数据列表
        if (noDataPairs) {
          noDataPairs.push(item.pairId);
        }

        // 标记为跳过
        await this.batchBacktestItemRepository.update(item.id, {
          status: BatchBacktestItemStatus.FAILED,
          errorMessage: 'SKIP_NO_DATA: 指定时间段没有价格数据',
          completedAt: new Date(),
        });

        // 不增加失败计数
        return;
      }

      await this.batchBacktestItemRepository.update(item.id, {
        status: BatchBacktestItemStatus.FAILED,
        errorMessage: error.message || '执行异常',
        completedAt: new Date(),
      });

      await this.batchBacktestRepository.increment({ id: batch.id }, 'failedPairs', 1);
    }
  }

  // ==================== 队列管理方法 ====================

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.backtestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.backtestQueue.length > 0) {
        const queueItem = this.backtestQueue.shift();
        if (!queueItem) continue;

        this.currentTask = queueItem;

        try {
          if (queueItem.type === 'batch') {
            // 更新任务状态为 pending
            await this.batchBacktestRepository.update(queueItem.id, {
              status: BatchBacktestStatus.PENDING,
            });

            // 启动批量回测
            await this.startBatchBacktest(queueItem.id);
          }
        } catch (error) {
          console.error(`处理队列任务 ${queueItem.id} 失败:`, error);
        }

        // 等待当前任务完成
        await this.waitForTaskCompletion(queueItem.id);
        this.currentTask = null;
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 等待任务完成
   */
  private async waitForTaskCompletion(batchId: number): Promise<void> {
    const maxWaitTime = 24 * 60 * 60 * 1000; // 最大等待24小时
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const batch = await this.batchBacktestRepository.findOne({ where: { id: batchId } });

      if (!batch || ['completed', 'cancelled', 'failed'].includes(batch.status)) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<any> {
    const queueLength = this.backtestQueue.length;
    const isProcessing = this.isProcessingQueue;

    // 计算预估等待时间（基于平均执行时间）
    let estimatedWaitTime = 0;
    if (isProcessing && this.currentTask) {
      // 当前任务剩余时间 + 队列中任务平均时间
      estimatedWaitTime = queueLength * 300; // 假设每个任务平均5分钟
    }

    return {
      isProcessing,
      currentTask: this.currentTask ? {
        id: this.currentTask.id,
        type: this.currentTask.type,
        startedAt: new Date(),
      } : null,
      queueLength,
      maxQueueLength: MAX_QUEUE_LENGTH,
      estimatedWaitTime,
    };
  }

  /**
   * 获取队列列表
   */
  async getQueueList(page: number = 1, limit: number = 20): Promise<any> {
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = this.backtestQueue.slice(start, end);

    // 获取任务详情
    const detailedItems = await Promise.all(
      items.map(async (item, index) => {
        const batch = await this.batchBacktestRepository.findOne({
          where: { id: item.id },
        });

        return {
          id: item.id,
          type: item.type,
          strategyId: batch?.strategyId,
          totalPairs: batch?.totalPairs,
          status: 'queued',
          queuedAt: item.queuedAt,
          estimatedStartTime: new Date(Date.now() + index * 300000), // 预估开始时间
        };
      })
    );

    return {
      items: detailedItems,
      pagination: {
        page,
        limit,
        total: this.backtestQueue.length,
      },
    };
  }

  /**
   * 取消队列中的任务
   */
  async cancelQueueTask(taskId: number): Promise<void> {
    // 检查是否是当前正在执行的任务
    if (this.currentTask && this.currentTask.id === taskId) {
      throw new BusinessException('TASK_ALREADY_STARTED', '任务已开始执行，无法从队列移除，请使用取消任务接口');
    }

    // 从队列中移除
    const index = this.backtestQueue.findIndex(item => item.id === taskId);
    if (index === -1) {
      throw new BatchNotFoundException(taskId);
    }

    this.backtestQueue.splice(index, 1);

    // 更新任务状态为取消
    await this.batchBacktestRepository.update(taskId, {
      status: BatchBacktestStatus.CANCELLED,
    });
  }
}
