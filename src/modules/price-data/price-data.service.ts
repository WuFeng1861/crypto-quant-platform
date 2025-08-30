import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PriceData } from './entities/price-data.entity';
import { TradingPair } from './entities/trading-pair.entity';
import { Timeframe } from './entities/timeframe.entity';
import { CreatePriceDataDto } from './dto/create-price-data.dto';
import { CreateTradingPairDto } from './dto/create-trading-pair.dto';
import { CreateTimeframeDto } from './dto/create-timeframe.dto';

@Injectable()
export class PriceDataService {
  constructor(
    @InjectRepository(PriceData)
    private priceDataRepository: Repository<PriceData>,
    @InjectRepository(TradingPair)
    private tradingPairRepository: Repository<TradingPair>,
    @InjectRepository(Timeframe)
    private timeframeRepository: Repository<Timeframe>,
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
    return this.priceDataRepository.find({
      where: {
        pairId,
        timeframeId,
        timestamp: Between(startTime, endTime),
      },
      order: { timestamp: 'ASC' },
    });
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
}