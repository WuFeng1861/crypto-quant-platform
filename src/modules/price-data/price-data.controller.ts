import { Controller, Get, Post, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
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
      return await this.priceDataService.createPriceDataWithCache(createPriceDataDto);
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
    const numericPairId = Number(pairId);
    const numericTimeframeId = Number(timeframeId);
    const numericStartTime = Number(startTime);
    const numericEndTime = Number(endTime);
    
    if (isNaN(numericPairId) || isNaN(numericTimeframeId) || isNaN(numericStartTime) || isNaN(numericEndTime)) {
      throw new HttpException('所有参数必须是数字', HttpStatus.BAD_REQUEST);
    }
    
    return this.priceDataService.findPriceDataByRange(
      numericPairId,
      numericTimeframeId,
      numericStartTime,
      numericEndTime,
    );
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

  @Get('trading-pairs-all')
  async findAllTradingPairs(): Promise<TradingPair[]> {
    console.log("findAllTradingPairs");
    return this.priceDataService.findAllTradingPairs();
  }

  @Get('trading-pairs/:id')
  async findOneTradingPair(@Param('id') id: string): Promise<TradingPair> {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new HttpException('ID必须是数字trading-pairs', HttpStatus.BAD_REQUEST);
    }
    const tradingPair = await this.priceDataService.findOneTradingPair(numericId);
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

  @Get('timeframes-all')
  async findAllTimeframes(): Promise<Timeframe[]> {
    return this.priceDataService.findAllTimeframes();
  }

  @Get('timeframes/:id')
  async findOneTimeframe(@Param('id') id: string): Promise<Timeframe> {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new HttpException('ID必须是数字timeframes', HttpStatus.BAD_REQUEST);
    }
    const timeframe = await this.priceDataService.findOneTimeframe(numericId);
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

  // 缓存管理接口
  @Post('cache/preload/:pairId/:timeframeId')
  async preloadPriceDataToRedis(
    @Param('pairId') pairId: string,
    @Param('timeframeId') timeframeId: string,
  ): Promise<{ message: string }> {
    const numericPairId = Number(pairId);
    const numericTimeframeId = Number(timeframeId);
    
    if (isNaN(numericPairId) || isNaN(numericTimeframeId)) {
      throw new HttpException('交易对ID和时间框架ID必须是数字preloadPriceDataToRedis', HttpStatus.BAD_REQUEST);
    }
    
    try {
      await this.priceDataService.preloadPriceDataToRedis(numericPairId, numericTimeframeId);
      return { message: `成功预加载交易对${numericPairId}和时间框架${numericTimeframeId}的数据到Redis` };
    } catch (error) {
      throw new HttpException(
        `预加载数据失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('cache/preload-all')
  async preloadAllPriceDataToRedis(): Promise<{ message: string }> {
    try {
      await this.priceDataService.preloadAllPriceDataToRedis();
      return { message: '成功预加载所有价格数据到Redis' };
    } catch (error) {
      throw new HttpException(
        `预加载所有数据失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('cache/clear/:pairId/:timeframeId')
  async clearPriceDataCache(
    @Param('pairId') pairId: string,
    @Param('timeframeId') timeframeId: string,
  ): Promise<{ message: string }> {
    const numericPairId = Number(pairId);
    const numericTimeframeId = Number(timeframeId);
    
    if (isNaN(numericPairId) || isNaN(numericTimeframeId)) {
      throw new HttpException('交易对ID和时间框架ID必须是数字clearPriceDataCache', HttpStatus.BAD_REQUEST);
    }
    
    try {
      await this.priceDataService.clearPriceDataCache(numericPairId, numericTimeframeId);
      return { message: `成功清除交易对${numericPairId}和时间框架${numericTimeframeId}的缓存` };
    } catch (error) {
      throw new HttpException(
        `清除缓存失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('cache/clear-all')
  async clearAllPriceDataCache(): Promise<{ message: string }> {
    try {
      await this.priceDataService.clearAllPriceDataCache();
      return { message: '成功清除所有价格数据缓存' };
    } catch (error) {
      throw new HttpException(
        `清除所有缓存失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 动态路由必须放在最后
  @Get(':id')
  async findOnePriceData(@Param('id') id: string): Promise<PriceData> {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new HttpException('ID必须是数字findOnePriceData', HttpStatus.BAD_REQUEST);
    }
    const priceData = await this.priceDataService.findOnePriceData(numericId);
    if (!priceData) {
      throw new HttpException('价格数据不存在', HttpStatus.NOT_FOUND);
    }
    return priceData;
  }
}