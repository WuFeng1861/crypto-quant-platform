import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PriceData } from './entities/price-data.entity';
import { TradingPair } from './entities/trading-pair.entity';
import { Timeframe } from './entities/timeframe.entity';
import { CreatePriceDataDto } from './dto/create-price-data.dto';
import { CreateTradingPairDto } from './dto/create-trading-pair.dto';
import { CreateTimeframeDto } from './dto/create-timeframe.dto';
import { RedisService } from '../common/services/redis.service';

@Injectable()
export class PriceDataService {
  constructor(
    @InjectRepository(PriceData)
    private priceDataRepository: Repository<PriceData>,
    @InjectRepository(TradingPair)
    private tradingPairRepository: Repository<TradingPair>,
    @InjectRepository(Timeframe)
    private timeframeRepository: Repository<Timeframe>,
    private redisService: RedisService,
  ) {}

  // Price Data methods
  async createPriceData(createPriceDataDto: CreatePriceDataDto): Promise<PriceData> {
    const priceData = this.priceDataRepository.create(createPriceDataDto);
    return this.priceDataRepository.save(priceData);
  }

  async findAllPriceData(): Promise<PriceData[]> {
    return this.priceDataRepository.find();
  }

  async findPriceDataByRange(
    pairId: number,
    timeframeId: number,
    startTime: number,
    endTime: number,
  ): Promise<PriceData[]> {
    // 先从Redis获取缓存的价格数据
    const cachedData = await this.getPriceDataFromRedis(pairId, timeframeId);
    
    if (cachedData && cachedData.length > 0) {
      // 从缓存数据中过滤时间范围
      return cachedData.filter(data => 
        data.timestamp >= startTime && data.timestamp <= endTime
      ).sort((a, b) => a.timestamp - b.timestamp);
    }

    // 如果Redis中没有数据，从数据库获取并缓存
    const dbData = await this.priceDataRepository.find({
      where: { pairId, timeframeId },
      order: { timestamp: 'ASC' },
    });

    // 将数据存入Redis
    if (dbData.length > 0) {
      await this.savePriceDataToRedis(pairId, timeframeId, dbData);
    }

    // 过滤时间范围并返回
    return dbData.filter(data => 
      data.timestamp >= startTime && data.timestamp <= endTime
    );
  }

  async findOnePriceData(id: number): Promise<PriceData> {
    return this.priceDataRepository.findOne({ where: { id } });
  }

  // Trading Pair methods
  async createTradingPair(createTradingPairDto: CreateTradingPairDto): Promise<TradingPair> {
    const tradingPair = this.tradingPairRepository.create(createTradingPairDto);
    return this.tradingPairRepository.save(tradingPair);
  }

  async findAllTradingPairs(): Promise<TradingPair[]> {
    return this.tradingPairRepository.find();
  }

  async findOneTradingPair(id: number): Promise<TradingPair> {
    return this.tradingPairRepository.findOne({ where: { id } });
  }

  async findTradingPairBySymbol(symbol: string): Promise<TradingPair> {
    return this.tradingPairRepository.findOne({ where: { symbol } });
  }

  // Timeframe methods
  async createTimeframe(createTimeframeDto: CreateTimeframeDto): Promise<Timeframe> {
    const timeframe = this.timeframeRepository.create(createTimeframeDto);
    return this.timeframeRepository.save(timeframe);
  }

  async findAllTimeframes(): Promise<Timeframe[]> {
    return this.timeframeRepository.find();
  }

  async findOneTimeframe(id: number): Promise<Timeframe> {
    return this.timeframeRepository.findOne({ where: { id } });
  }

  async findTimeframeByName(name: string): Promise<Timeframe> {
    return this.timeframeRepository.findOne({ where: { name } });
  }

  /**
   * 将所有价格数据预加载到Redis中
   * @param pairId 交易对ID
   * @param timeframeId 时间框架ID
   */
  async preloadPriceDataToRedis(pairId: number, timeframeId: number): Promise<void> {
    const allData = await this.priceDataRepository.find({
      where: { pairId, timeframeId },
      order: { timestamp: 'ASC' },
    });

    if (allData.length > 0) {
      await this.savePriceDataToRedis(pairId, timeframeId, allData);
    }
  }

  /**
   * 批量预加载所有交易对和时间框架的数据到Redis
   */
  async preloadAllPriceDataToRedis(): Promise<void> {
    const pairs = await this.findAllTradingPairs();
    const timeframes = await this.findAllTimeframes();

    for (const pair of pairs) {
      for (const timeframe of timeframes) {
        try {
          await this.preloadPriceDataToRedis(pair.id, timeframe.id);
          console.log(`已预加载 ${pair.symbol} - ${timeframe.name} 的价格数据到Redis`);
        } catch (error) {
          console.error(`预加载 ${pair.symbol} - ${timeframe.name} 失败:`, error.message);
        }
      }
    }
  }

  /**
   * 从Redis获取价格数据
   * @param pairId 交易对ID
   * @param timeframeId 时间框架ID
   * @returns 价格数据数组
   */
  private async getPriceDataFromRedis(pairId: number, timeframeId: number): Promise<PriceData[]> {
    const key = `price_data:${pairId}:${timeframeId}`;
    const cachedData = await this.redisService.get(key);
    
    if (cachedData) {
      // 将缓存的数据转换回PriceData对象
      return cachedData.map(data => ({
        ...data,
        timestamp: Number(data.timestamp),
        openPrice: Number(data.openPrice),
        highPrice: Number(data.highPrice),
        lowPrice: Number(data.lowPrice),
        closePrice: Number(data.closePrice),
        volume: Number(data.volume),
        volumeCurrency: Number(data.volumeCurrency),
        volumeCurrencyQuote: Number(data.volumeCurrencyQuote),
      }));
    }
    
    return null;
  }

  /**
   * 将价格数据保存到Redis
   * @param pairId 交易对ID
   * @param timeframeId 时间框架ID
   * @param data 价格数据数组
   */
  private async savePriceDataToRedis(pairId: number, timeframeId: number, data: PriceData[]): Promise<void> {
    const key = `price_data:${pairId}:${timeframeId}`;
    
    // 转换数据格式以便存储
    const cacheData = data.map(item => ({
      id: item.id,
      pairId: item.pairId,
      timeframeId: item.timeframeId,
      timestamp: item.timestamp,
      openPrice: item.openPrice,
      highPrice: item.highPrice,
      lowPrice: item.lowPrice,
      closePrice: item.closePrice,
      volume: item.volume,
      volumeCurrency: item.volumeCurrency,
      volumeCurrencyQuote: item.volumeCurrencyQuote,
      confirmed: item.confirmed,
      createdAt: item.createdAt,
    }));

    // 设置缓存，过期时间为1小时
    await this.redisService.set(key, cacheData, 3600);
  }

  /**
   * 清除指定交易对和时间框架的Redis缓存
   * @param pairId 交易对ID
   * @param timeframeId 时间框架ID
   */
  async clearPriceDataCache(pairId: number, timeframeId: number): Promise<void> {
    const key = `price_data:${pairId}:${timeframeId}`;
    await this.redisService.delete(key);
  }

  /**
   * 清除所有价格数据缓存
   */
  async clearAllPriceDataCache(): Promise<void> {
    const pattern = 'price_data:*';
    // 由于RedisService可能没有keys方法，我们使用简单的删除方式
    // 获取所有交易对和时间框架组合来删除缓存
    const pairs = await this.findAllTradingPairs();
    const timeframes = await this.findAllTimeframes();
    
    for (const pair of pairs) {
      for (const timeframe of timeframes) {
        const key = `price_data:${pair.id}:${timeframe.id}`;
        try {
          await this.redisService.delete(key);
        } catch (error) {
          // 忽略删除不存在key的错误
        }
      }
    }
  }

  /**
   * 添加新的价格数据并更新Redis缓存
   * @param createPriceDataDto 价格数据DTO
   * @returns 创建的价格数据
   */
  async createPriceDataWithCache(createPriceDataDto: CreatePriceDataDto): Promise<PriceData> {
    // 创建价格数据
    const priceData = await this.createPriceData(createPriceDataDto);
    
    // 更新Redis缓存
    const cachedData = await this.getPriceDataFromRedis(priceData.pairId, priceData.timeframeId);
    if (cachedData) {
      // 如果缓存存在，添加新数据并重新排序
      cachedData.push(priceData);
      cachedData.sort((a, b) => a.timestamp - b.timestamp);
      await this.savePriceDataToRedis(priceData.pairId, priceData.timeframeId, cachedData);
    }
    
    return priceData;
  }
}