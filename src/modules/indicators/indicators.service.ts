import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { RedisService } from '../common/services/redis.service';
import { ProcessExecutorService } from '../common/services/process-executor.service';
import { PriceDataService } from '../price-data/price-data.service';

export type IndicatorWithParameters = Indicator & {
  parameters?: IndicatorParameter[];
};

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
  ) { }

  async findByName(name: string): Promise<Indicator | null> {
    return this.indicatorRepository.findOne({ where: { name } });
  }

  async create(createIndicatorDto: CreateIndicatorDto): Promise<IndicatorWithParameters> {
    const indicator = this.indicatorRepository.create({
      name: createIndicatorDto.name,
      description: createIndicatorDto.description,
      calculationCode: createIndicatorDto.calculationCode,
    });

    const savedIndicator = await this.indicatorRepository.save(indicator);

    let savedParameters: IndicatorParameter[] = [];
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

      savedParameters = await this.parameterRepository.save(parameters);
    }

    await this.clearIndicatorCache(savedIndicator.id);

    return {
      ...savedIndicator,
      parameters: savedParameters,
    };
  }

  async findAll(): Promise<IndicatorWithParameters[]> {
    const cacheKey = 'indicators:all';

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const indicators = await this.indicatorRepository.find();
        // 获取每个指标的参数
        const indicatorsWithParams = await Promise.all(
          indicators.map(async (indicator) => {
            const parameters = await this.parameterRepository.find({
              where: { indicatorId: indicator.id }
            });
            return {
              ...indicator,
              parameters,
            };
          })
        );
        return indicatorsWithParams;
      },
      3600 // 缓存1小时
    );
  }

  async findOne(id: number): Promise<IndicatorWithParameters> {
    const cacheKey = `indicator:detail:${id}`;

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const indicator = await this.indicatorRepository.findOne({ where: { id } });
        if (!indicator) {
          return null;
        }

        // 获取指标参数
        const parameters = await this.parameterRepository.find({
          where: { indicatorId: id }
        });

        return {
          ...indicator,
          parameters,
        };
      },
      3600 // 缓存1小时
    );
  }

  async update(id: number, updateIndicatorDto: UpdateIndicatorDto): Promise<IndicatorWithParameters> {
    const indicator = await this.indicatorRepository.findOne({ where: { id } });
    if (!indicator) {
      throw new Error(`Indicator with id ${id} not found`);
    }

    // 更新基本信息
    if (updateIndicatorDto.name) indicator.name = updateIndicatorDto.name;
    if (updateIndicatorDto.description) indicator.description = updateIndicatorDto.description;
    if (updateIndicatorDto.calculationCode) indicator.calculationCode = updateIndicatorDto.calculationCode;

    await this.indicatorRepository.save(indicator);

    // 如果提供了参数，则更新参数
    if (updateIndicatorDto.parameters) {
      // 先删除旧参数
      await this.parameterRepository.delete({ indicatorId: id });

      // 添加新参数
      if (updateIndicatorDto.parameters.length > 0) {
        const parameters = updateIndicatorDto.parameters.map(param => {
          return this.parameterRepository.create({
            indicatorId: id,
            name: param.name,
            description: param.description,
            defaultValue: param.defaultValue,
            paramType: param.paramType,
          });
        });

        await this.parameterRepository.save(parameters);
      }
    }

    // 清除相关缓存
    await this.clearIndicatorCache(id);

    // 返回更新后的指标
    return this.findOne(id);
  }

  /**
   * 删除指标
   * @param id 指标ID
   */
  async remove(id: number): Promise<void> {
    const indicator = await this.indicatorRepository.findOne({ where: { id } });
    if (!indicator) {
      throw new Error(`Indicator with id ${id} not found`);
    }

    // 1. 删除指标参数
    await this.parameterRepository.delete({ indicatorId: id });

    // 2. 删除指标本身
    await this.indicatorRepository.delete(id);

    // 3. 清除相关缓存
    await this.clearIndicatorCache(id);
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

  /**
   * 清除指标相关缓存
   */
  private async clearIndicatorCache(indicatorId: number): Promise<void> {
    // 清除单个指标缓存
    await this.redisService.delete(`indicator:detail:${indicatorId}`);
    await this.redisService.delete(`indicator:${indicatorId}`);
    await this.redisService.delete(`indicator_params_list:${indicatorId}`);

    // 清除所有指标列表缓存
    await this.redisService.delete('indicators:all');
  }
}