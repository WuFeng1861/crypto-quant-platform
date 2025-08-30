import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PriceDataService } from './price-data.service';
import { CreatePriceDataDto } from './dto/create-price-data.dto';
import { CreateTradingPairDto } from './dto/create-trading-pair.dto';
import { CreateTimeframeDto } from './dto/create-timeframe.dto';
import { PriceData } from './entities/price-data.entity';
import { TradingPair } from './entities/trading-pair.entity';
import { Timeframe } from './entities/timeframe.entity';

@Controller('price-data')
export class PriceDataController {
  constructor(private readonly priceDataService: PriceDataService) {}

  // Price Data endpoints
  @Post()
  async createPriceData(@Body() createPriceDataDto: CreatePriceDataDto): Promise<PriceData> {
    try {
      return await this.priceDataService.createPriceData(createPriceDataDto);
    } catch (error) {
      throw new HttpException(
        `创建价格数据失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAllPriceData(): Promise<PriceData[]> {
    return this.priceDataService.findAllPriceData();
  }

  @Get('range')
  async findPriceDataByRange(
    @Query('pairId') pairId: string,
    @Query('timeframeId') timeframeId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ): Promise<PriceData[]> {
    return this.priceDataService.findPriceDataByRange(
      +pairId,
      +timeframeId,
      +startTime,
      +endTime,
    );
  }

  @Get(':id')
  async findOnePriceData(@Param('id') id: string): Promise<PriceData> {
    const priceData = await this.priceDataService.findOnePriceData(+id);
    if (!priceData) {
      throw new HttpException('价格数据不存在', HttpStatus.NOT_FOUND);
    }
    return priceData;
  }

  // Trading Pair endpoints
  @Post('trading-pairs')
  async createTradingPair(@Body() createTradingPairDto: CreateTradingPairDto): Promise<TradingPair> {
    try {
      return await this.priceDataService.createTradingPair(createTradingPairDto);
    } catch (error) {
      throw new HttpException(
        `创建交易对失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('trading-pairs')
  async findAllTradingPairs(): Promise<TradingPair[]> {
    return this.priceDataService.findAllTradingPairs();
  }

  @Get('trading-pairs/:id')
  async findOneTradingPair(@Param('id') id: string): Promise<TradingPair> {
    const tradingPair = await this.priceDataService.findOneTradingPair(+id);
    if (!tradingPair) {
      throw new HttpException('交易对不存在', HttpStatus.NOT_FOUND);
    }
    return tradingPair;
  }

  @Get('trading-pairs/symbol/:symbol')
  async findTradingPairBySymbol(@Param('symbol') symbol: string): Promise<TradingPair> {
    const tradingPair = await this.priceDataService.findTradingPairBySymbol(symbol);
    if (!tradingPair) {
      throw new HttpException('交易对不存在', HttpStatus.NOT_FOUND);
    }
    return tradingPair;
  }

  // Timeframe endpoints
  @Post('timeframes')
  async createTimeframe(@Body() createTimeframeDto: CreateTimeframeDto): Promise<Timeframe> {
    try {
      return await this.priceDataService.createTimeframe(createTimeframeDto);
    } catch (error) {
      throw new HttpException(
        `创建时间周期失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('timeframes')
  async findAllTimeframes(): Promise<Timeframe[]> {
    return this.priceDataService.findAllTimeframes();
  }

  @Get('timeframes/:id')
  async findOneTimeframe(@Param('id') id: string): Promise<Timeframe> {
    const timeframe = await this.priceDataService.findOneTimeframe(+id);
    if (!timeframe) {
      throw new HttpException('时间周期不存在', HttpStatus.NOT_FOUND);
    }
    return timeframe;
  }

  @Get('timeframes/name/:name')
  async findTimeframeByName(@Param('name') name: string): Promise<Timeframe> {
    const timeframe = await this.priceDataService.findTimeframeByName(name);
    if (!timeframe) {
      throw new HttpException('时间周期不存在', HttpStatus.NOT_FOUND);
    }
    return timeframe;
  }
}