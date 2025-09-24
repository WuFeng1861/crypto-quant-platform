import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { CreateBacktestDto } from './dto/create-backtest.dto';
import { BacktestResult } from './entities/backtest-result.entity';
import { BacktestTrade } from './entities/backtest-trade.entity';

@Controller('backtest')
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Post()
  async runBacktest(@Body() createBacktestDto: CreateBacktestDto): Promise<{ success: boolean; message: string; backtestId?: number }> {
    try {
      return await this.backtestService.runBacktest(createBacktestDto);
    } catch (error) {
      throw new HttpException(
        `回测执行失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll(): Promise<BacktestResult[]> {
    return this.backtestService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<BacktestResult> {
    const result = await this.backtestService.findOne(+id);
    if (!result) {
      throw new HttpException('回测结果不存在', HttpStatus.NOT_FOUND);
    }
    return result;
  }

  @Get(':id/trades')
  async getTrades(@Param('id') id: string): Promise<BacktestTrade[]> {
    const result = await this.backtestService.findOne(+id);
    if (!result) {
      throw new HttpException('回测结果不存在', HttpStatus.NOT_FOUND);
    }
    return this.backtestService.getBacktestTrades(+id);
  }
}