import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { RedisService } from '../common/services/redis.service';
import { ProcessExecutorService } from '../common/services/process-executor.service';
import { PriceDataService } from '../price-data/price-data.service';

@Injectable()
export class IndicatorsService {
  constructor(
    @InjectRepository(Indicator)
    private indicatorRepository: Repository<Indicator>,
    @InjectRepository(IndicatorParameter)
    private parameterRepository: Repository<IndicatorParameter>,
    private redisService: RedisService,
    private processExecutor: ProcessExecutorService,
    private priceDataService: PriceDataService,
  ) {}

  async create(createIndicatorDto: CreateIndicatorDto): Promise<Indicator> {
    // 创建指标
    const indicator = this.indicatorRepository.create({
      name: createIndicatorDto.name,
      description: createIndicatorDto.description,
      calculationCode: createIndicatorDto.calculationCode,
    });

    const savedIndicator = await this.indicatorRepository.save(indicator);

    // 创建指标参数
    if (createIndicatorDto.parameters && createIndicatorDto.parameters.length > 0) {
      const parameters = createIndicatorDto.parameters.map(param => {
        return this.parameterRepository.create({
          indicatorId: savedIndicator.id,
          name: param.name,
          description: param.description,
          defaultValue: param.defaultValue,
          paramType: param.paramType,
        });
      });

      await this.parameterRepository.save(parameters);
    }

    // 保存到Redis
    await this.saveIndicatorToRedis(savedIndicator.id);

    return savedIndicator;
  }

  async findAll(): Promise<Indicator[]> {
    const cacheKey = 'indicators:all';
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        return this.indicatorRepository.find();
      },
      3600 // 缓存1小时
    );
  }

  async findOne(id: number): Promise<Indicator> {
    const cacheKey = `indicator:basic:${id}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        return this.indicatorRepository.findOne({ where: { id } });
      },
      3600 // 缓存1小时
    );
  }

  async getIndicatorParameters(indicatorId: number): Promise<IndicatorParameter[]> {
    const cacheKey = `indicator_params_list:${indicatorId}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        return this.parameterRepository.find({ where: { indicatorId } });
      },
      3600 // 缓存1小时
    );
  }

  async findParameterById(parameterId: number): Promise<IndicatorParameter | null> {
    const cacheKey = `indicator_param_detail:${parameterId}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        return this.parameterRepository.findOne({ where: { id: parameterId } });
      },
      3600 // 缓存1小时
    );
  }

  async calculateIndicator(
    indicatorId: number, 
    priceData: any[], 
    parameters: Record<string, any>
  ): Promise<any[]> {
    // 从Redis获取指标
    const indicator = await this.getIndicatorFromRedis(indicatorId);
    if (!indicator) {
      // 如果Redis中不存在，从数据库获取
      const dbIndicator = await this.findOne(indicatorId);
      if (!dbIndicator) {
        throw new Error(`Indicator with id ${indicatorId} not found`);
      }
      
      // 保存到Redis
      await this.saveIndicatorToRedis(indicatorId);
      
      return this.executeIndicatorCode(dbIndicator.calculationCode, priceData, parameters);
    }
    
    return this.executeIndicatorCode(indicator.calculationCode, priceData, parameters);
  }

  /**
   * 使用price-data模块的数据计算指标
   * @param indicatorId 指标ID
   * @param pairId 交易对ID
   * @param timeframeId 时间框架ID
   * @param startTime 开始时间戳
   * @param endTime 结束时间戳
   * @param parameters 指标参数
   * @returns 计算结果
   */
  async calculateIndicatorWithPriceData(
    indicatorId: number,
    pairId: number,
    timeframeId: number,
    startTime: number,
    endTime: number,
    parameters: Record<string, any>
  ): Promise<any[]> {
    // 获取价格数据
    const priceData = await this.priceDataService.findPriceDataByRange(
      pairId,
      timeframeId,
      startTime,
      endTime
    );

    if (!priceData || priceData.length === 0) {
      throw new Error('未找到指定时间范围内的价格数据');
    }

    // 计算指标
    return this.calculateIndicator(indicatorId, priceData, parameters);
  }

  /**
   * 使用交易对符号和时间框架名称计算指标
   * @param indicatorId 指标ID
   * @param symbol 交易对符号 (如: BTCUSDT)
   * @param timeframeName 时间框架名称 (如: 1h, 4h, 1d)
   * @param startTime 开始时间戳
   * @param endTime 结束时间戳
   * @param parameters 指标参数
   * @returns 计算结果
   */
  async calculateIndicatorBySymbol(
    indicatorId: number,
    symbol: string,
    timeframeName: string,
    startTime: number,
    endTime: number,
    parameters: Record<string, any>
  ): Promise<any[]> {
    // 根据符号查找交易对
    const tradingPair = await this.priceDataService.findTradingPairBySymbol(symbol);
    if (!tradingPair) {
      throw new Error(`未找到交易对: ${symbol}`);
    }

    // 根据名称查找时间框架
    const timeframe = await this.priceDataService.findTimeframeByName(timeframeName);
    if (!timeframe) {
      throw new Error(`未找到时间框架: ${timeframeName}`);
    }

    // 使用ID计算指标
    return this.calculateIndicatorWithPriceData(
      indicatorId,
      tradingPair.id,
      timeframe.id,
      startTime,
      endTime,
      parameters
    );
  }

  private async executeIndicatorCode(
    code: string, 
    priceData: any[], 
    parameters: Record<string, any>
  ): Promise<any[]> {
    try {
      // 准备要在子进程中执行的代码
      const workerCode = `
        ${code}
      `;
      
      // 准备传递给子进程的数据
      const processData = {
        priceData: JSON.parse(JSON.stringify(priceData)), // 深拷贝防止修改原始数据
        parameters
      };
      
      // 在子进程中执行代码
      return await this.processExecutor.executeInProcess(
        workerCode,
        processData,
        10 * 60 * 1000 // 10分钟超时
      );
    } catch (error) {
      throw new Error(`Error executing indicator code: ${error.message}`);
    }
  }

  private async saveIndicatorToRedis(indicatorId: number): Promise<void> {
    const indicator = await this.indicatorRepository.findOne({ where: { id: indicatorId } });
    if (!indicator) {
      throw new Error(`Indicator with id ${indicatorId} not found`);
    }

    const parameters = await this.parameterRepository.find({ where: { indicatorId } });

    // 保存指标和参数到Redis
    await this.redisService.set(`indicator:${indicatorId}`, {
      ...indicator,
      parameters,
    });
  }

  private async getIndicatorFromRedis(indicatorId: number): Promise<Indicator & { parameters: IndicatorParameter[] } | null> {
    return this.redisService.getOrSet(
      `indicator:${indicatorId}`,
      async () => {
        // 当Redis中没有数据时，这个函数会被调用
        const indicator = await this.indicatorRepository.findOne({ where: { id: indicatorId } });
        if (!indicator) {
          return null;
        }
        
        // 获取指标参数
        const parameters = await this.parameterRepository.find({ where: { indicatorId } });
        
        // 返回完整的指标对象
        return {
          ...indicator,
          parameters,
        };
      },
      3600 // 缓存1小时
    );
  }
}