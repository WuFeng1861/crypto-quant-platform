import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BacktestResult, BacktestStatus } from '../backtest/entities/backtest-result.entity';
import { BacktestTrade } from '../backtest/entities/backtest-trade.entity';
import { BacktestService } from '../backtest/backtest.service';
import { CreateBacktestDto } from '../backtest/dto/create-backtest.dto';

@Injectable()
export class StartupService {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    @InjectRepository(BacktestResult)
    private backtestResultRepository: Repository<BacktestResult>,
    @InjectRepository(BacktestTrade)
    private backtestTradeRepository: Repository<BacktestTrade>,
    private backtestService: BacktestService,
  ) {}

  /**
   * 应用启动时的初始化检查
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('开始检查进行中的回测任务...');
    
    try {
      // 查找所有状态为 RUNNING 的回测任务
      const runningBacktests = await this.backtestResultRepository.find({
        where: { status: BacktestStatus.RUNNING },
        order: { createdAt: 'ASC' }
      });

      if (runningBacktests.length === 0) {
        this.logger.log('没有发现进行中的回测任务');
        return;
      }

      this.logger.log(`发现 ${runningBacktests.length} 个进行中的回测任务，开始清理并重新执行...`);

      // 处理每个进行中的回测任务
      for (const backtest of runningBacktests) {
        await this.handleRunningBacktest(backtest);
      }

      this.logger.log('所有进行中的回测任务处理完成');
    } catch (error) {
      this.logger.error('检查进行中的回测任务时发生错误:', error);
    }
  }

  /**
   * 处理单个进行中的回测任务
   */
  private async handleRunningBacktest(backtest: BacktestResult): Promise<void> {
    try {
      this.logger.log(`处理回测任务 ID: ${backtest.id}`);

      // 1. 删除该回测ID对应的交易数据
      await this.clearBacktestTradeData(backtest.id);

      // 2. 重置回测结果状态和数据
      await this.resetBacktestResult(backtest);

      // 3. 重新执行回测
      await this.restartBacktest(backtest);

      this.logger.log(`回测任务 ID: ${backtest.id} 处理完成`);
    } catch (error) {
      this.logger.error(`处理回测任务 ID: ${backtest.id} 时发生错误:`, error);
      
      // 如果处理失败，将状态设置为失败
      await this.backtestResultRepository.update(backtest.id, {
        status: BacktestStatus.FAILED,
        earlyStopReason: `启动时重新执行失败: ${error.message}`,
        earlyStopped: true,
        earlyStopTime: new Date()
      });
    }
  }

  /**
   * 清理回测交易数据
   */
  private async clearBacktestTradeData(backtestId: number): Promise<void> {
    this.logger.log(`清理回测 ID: ${backtestId} 的交易数据...`);
    
    const deleteResult = await this.backtestTradeRepository.delete({ backtestId });
    
    this.logger.log(`已删除 ${deleteResult.affected || 0} 条交易记录`);
  }

  /**
   * 重置回测结果数据
   */
  private async resetBacktestResult(backtest: BacktestResult): Promise<void> {
    this.logger.log(`重置回测 ID: ${backtest.id} 的结果数据...`);
    
    await this.backtestResultRepository.update(backtest.id, {
      finalCapital: 0,
      totalProfit: 0,
      profitRate: 0,
      maxDrawdown: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      sharpeRatio: 0,
      earlyStopped: false,
      earlyStopReason: null,
      earlyStopTime: null,
      status: BacktestStatus.RUNNING,
      updatedAt: new Date()
    });
  }

  /**
   * 重新执行回测
   */
  private async restartBacktest(backtest: BacktestResult): Promise<void> {
    this.logger.log(`重新执行回测 ID: ${backtest.id}...`);
    
    // 构造回测参数
    const createBacktestDto: CreateBacktestDto = {
      strategyId: backtest.strategyId,
      pairId: backtest.pairId,
      timeframeId: backtest.timeframeId,
      startTime: backtest.startTime.getTime().toString(),
      endTime: backtest.endTime.getTime().toString(),
      initialCapital: backtest.initialCapital,
      // 这些参数可能不在原始记录中，使用默认值
      earlyStopThreshold: 10, // 默认10%
      positionDivision: 1, // 默认全仓
    };

    // 调用回测服务重新执行
    const result = await this.backtestService.runBacktest(createBacktestDto);
    
    if (!result.success) {
      throw new Error(`重新执行回测失败: ${result.message}`);
    }
    
    this.logger.log(`回测 ID: ${backtest.id} 重新执行成功`);
  }

  /**
   * 获取进行中的回测任务数量
   */
  async getRunningBacktestsCount(): Promise<number> {
    return this.backtestResultRepository.count({
      where: { status: BacktestStatus.RUNNING }
    });
  }

  /**
   * 手动触发检查和重启进行中的回测任务
   */
  async manualCheckAndRestart(): Promise<{ success: boolean; message: string; processedCount: number }> {
    try {
      const runningBacktests = await this.backtestResultRepository.find({
        where: { status: BacktestStatus.RUNNING },
        order: { createdAt: 'ASC' }
      });

      if (runningBacktests.length === 0) {
        return {
          success: true,
          message: '没有发现进行中的回测任务',
          processedCount: 0
        };
      }

      for (const backtest of runningBacktests) {
        await this.handleRunningBacktest(backtest);
      }

      return {
        success: true,
        message: `成功处理了 ${runningBacktests.length} 个进行中的回测任务`,
        processedCount: runningBacktests.length
      };
    } catch (error) {
      return {
        success: false,
        message: `处理失败: ${error.message}`,
        processedCount: 0
      };
    }
  }
}