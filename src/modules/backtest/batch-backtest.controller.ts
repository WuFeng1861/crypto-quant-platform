import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { BatchBacktestService } from './batch-backtest.service';
import { CreateBatchBacktestDto } from './dto/create-batch-backtest.dto';
import {
  BatchBacktestQueryDto,
  BatchBacktestItemsQueryDto,
  RetryBatchBacktestDto,
  ForceRetryBatchBacktestDto,
} from './dto/batch-backtest-query.dto';
import { BatchBacktestStatus } from './entities/batch-backtest.entity';

@Controller('backtest/batch')
export class BatchBacktestController {
  constructor(private readonly batchBacktestService: BatchBacktestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBatchBacktestDto) {
    const batch = await this.batchBacktestService.createBatchBacktest(dto);
    return {
      success: true,
      data: {
        batchId: batch.id,
        totalPairs: batch.totalPairs,
        status: batch.status,
      },
      message: '批量回测任务创建成功',
    };
  }

  @Get()
  async findAll(@Query() query: BatchBacktestQueryDto) {
    const { items, total } = await this.batchBacktestService.findAll(
      query.page,
      query.limit,
      query.status,
    );
    return {
      success: true,
      data: {
        items,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total,
        },
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const batch = await this.batchBacktestService.findOne(id);
    const progress = batch.totalPairs > 0
      ? Math.round((batch.completedPairs / batch.totalPairs) * 100)
      : 0;

    return {
      success: true,
      data: {
        id: batch.id,
        strategyId: batch.strategyId,
        timeframeId: batch.timeframeId,
        status: batch.status,
        totalPairs: batch.totalPairs,
        completedPairs: batch.completedPairs,
        failedPairs: batch.failedPairs,
        currentPairId: batch.currentPairId,
        progress,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        createdAt: batch.createdAt,
      },
    };
  }

  @Get(':id/items')
  async findItems(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: BatchBacktestItemsQueryDto,
  ) {
    const { items, total } = await this.batchBacktestService.findItems(
      id,
      query.page,
      query.limit,
      query.status,
    );
    return {
      success: true,
      data: {
        items,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 50,
          total,
        },
      },
    };
  }

  @Post(':id/start')
  async start(@Param('id', ParseIntPipe) id: number) {
    const batch = await this.batchBacktestService.startBatchBacktest(id);
    return {
      success: true,
      data: {
        id: batch.id,
        status: batch.status,
      },
      message: '批量回测任务已启动',
    };
  }

  @Post(':id/pause')
  async pause(@Param('id', ParseIntPipe) id: number) {
    const batch = await this.batchBacktestService.pauseBatchBacktest(id);
    return {
      success: true,
      data: {
        id: batch.id,
        status: batch.status,
        pauseRequested: batch.pauseRequested,
      },
      message: '暂停请求已发送，当前交易对完成后暂停',
    };
  }

  @Post(':id/resume')
  async resume(@Param('id', ParseIntPipe) id: number) {
    const batch = await this.batchBacktestService.resumeBatchBacktest(id);
    return {
      success: true,
      data: {
        id: batch.id,
        status: batch.status,
      },
      message: '批量回测任务已继续',
    };
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const batch = await this.batchBacktestService.cancelBatchBacktest(id);
    return {
      success: true,
      data: {
        id: batch.id,
        status: batch.status,
      },
      message: '批量回测任务已取消',
    };
  }

  @Post(':id/retry')
  async retry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: RetryBatchBacktestDto,
  ) {
    const batch = await this.batchBacktestService.retryFailedItems(id, dto);
    return {
      success: true,
      data: {
        id: batch.id,
        status: batch.status,
      },
      message: '失败任务重试已启动',
    };
  }

  @Post(':id/force-retry')
  async forceRetry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForceRetryBatchBacktestDto,
  ) {
    const batch = await this.batchBacktestService.forceRetryItems(id, dto);
    return {
      success: true,
      data: {
        id: batch.id,
        status: batch.status,
        retryPairIds: dto.pairIds,
      },
      message: '强制重试已启动',
    };
  }

  @Get(':id/summary')
  async getSummary(@Param('id', ParseIntPipe) id: number) {
    const summary = await this.batchBacktestService.getSummary(id);
    return {
      success: true,
      data: summary,
    };
  }
}
