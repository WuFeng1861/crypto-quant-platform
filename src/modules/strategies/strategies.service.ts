import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from './entities/strategy.entity';
import { StrategyIndicator } from './entities/strategy-indicator.entity';
import { StrategyIndicatorParam } from './entities/strategy-indicator-param.entity';
import { StrategyCondition } from './entities/strategy-condition.entity';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { RedisService } from '../common/services/redis.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { StrategyIndicatorWithParams } from './interfaces/strategy-indicator-with-params.interface';

@Injectable()
export class StrategiesService {
  constructor(
    @InjectRepository(Strategy)
    private strategyRepository: Repository<Strategy>,
    @InjectRepository(StrategyIndicator)
    private strategyIndicatorRepository: Repository<StrategyIndicator>,
    @InjectRepository(StrategyIndicatorParam)
    private strategyIndicatorParamRepository: Repository<StrategyIndicatorParam>,
    @InjectRepository(StrategyCondition)
    private strategyConditionRepository: Repository<StrategyCondition>,
    private redisService: RedisService,
    private indicatorsService: IndicatorsService,
  ) {}

  async create(createStrategyDto: CreateStrategyDto): Promise<Strategy> {
    // 创建策略
    const strategy = this.strategyRepository.create({
      name: createStrategyDto.name,
      description: createStrategyDto.description,
      positionType: createStrategyDto.positionType || 'both',
      buyFee: createStrategyDto.buyFee || 0,
      sellFee: createStrategyDto.sellFee || 0,
      liquidationThreshold: createStrategyDto.liquidationThreshold || 90,
    });

    const savedStrategy = await this.strategyRepository.save(strategy);

    // 创建策略指标关联
    if (createStrategyDto.indicators && createStrategyDto.indicators.length > 0) {
      for (const indicatorDto of createStrategyDto.indicators) {
        // 检查指标是否存在
        const indicator = await this.indicatorsService.findOne(indicatorDto.indicatorId);
        if (!indicator) {
          throw new Error(`Indicator with id ${indicatorDto.indicatorId} not found`);
        }

        // 创建策略指标关联
        const strategyIndicator = this.strategyIndicatorRepository.create({
          strategyId: savedStrategy.id,
          indicatorId: indicatorDto.indicatorId,
          priority: indicatorDto.priority || 0,
        });

        const savedStrategyIndicator = await this.strategyIndicatorRepository.save(strategyIndicator);

        // 创建策略指标参数
        if (indicatorDto.parameters && indicatorDto.parameters.length > 0) {
          const params = indicatorDto.parameters.map(param => {
            return this.strategyIndicatorParamRepository.create({
              strategyIndicatorId: savedStrategyIndicator.id,
              parameterId: param.parameterId,
              value: param.value,
            });
          });

          await this.strategyIndicatorParamRepository.save(params);
        }
      }
    }

    // 创建策略条件
    if (createStrategyDto.conditions && createStrategyDto.conditions.length > 0) {
      for (const conditionDto of createStrategyDto.conditions) {
        // 创建策略条件
        const strategyCondition = this.strategyConditionRepository.create({
          strategyId: savedStrategy.id,
          indicatorIndex: conditionDto.indicatorIndex,
          comparisonType: conditionDto.comparisonType,
          comparedIndicatorIndex: conditionDto.comparedIndicatorIndex,
          constantValue: conditionDto.constantValue,
          operator: conditionDto.operator,
          conditionType: conditionDto.conditionType,
          action: conditionDto.action,
          priority: conditionDto.priority || 0,
        });

        await this.strategyConditionRepository.save(strategyCondition);
      }
    }

    // 保存到Redis
    await this.saveStrategyToRedis(savedStrategy.id);

    // 清除所有策略列表缓存，因为新增了策略
    await this.clearAllStrategiesCache();

    return savedStrategy;
  }

  async findAll(): Promise<Strategy[]> {
    const cacheKey = 'strategies:all';
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        return this.strategyRepository.find();
      },
      3600 // 缓存1小时
    );
  }

  async findOne(id: number): Promise<Strategy> {
    const cacheKey = `strategy:basic:${id}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const strategy = await this.strategyRepository.findOne({ where: { id } });
        if (!strategy) {
          throw new NotFoundException(`Strategy with ID ${id} not found`);
        }
        return strategy;
      },
      3600 // 缓存1小时
    );
  }

  async getStrategyIndicators(strategyId: number): Promise<StrategyIndicatorWithParams[]> {
    const cacheKey = `strategy:indicators:${strategyId}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const indicators = await this.strategyIndicatorRepository.find({
          where: { strategyId },
          order: { priority: 'ASC' },
        });

        const result: StrategyIndicatorWithParams[] = [];
        for (const indicator of indicators) {
          const params = await this.strategyIndicatorParamRepository.find({
            where: { strategyIndicatorId: indicator.id },
          });

          result.push({
            ...indicator,
            parameters: params,
          });
        }

        return result;
      },
      3600 // 缓存1小时
    );
  }

  async getStrategyConditions(strategyId: number): Promise<StrategyCondition[]> {
    const cacheKey = `strategy:conditions:${strategyId}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        return this.strategyConditionRepository.find({
          where: { strategyId },
          order: { priority: 'ASC' },
        });
      },
      3600 // 缓存1小时
    );
  }

  private async saveStrategyToRedis(strategyId: number): Promise<void> {
    const strategy = await this.strategyRepository.findOne({ where: { id: strategyId } });
    if (!strategy) {
      throw new Error(`Strategy with id ${strategyId} not found`);
    }

    const indicators = await this.getStrategyIndicators(strategyId);
    const conditions = await this.getStrategyConditions(strategyId);

    // 保存策略、指标和条件到Redis
    await this.redisService.set(`strategy:${strategyId}`, {
      ...strategy,
      indicators,
      conditions,
    });
  }

  async getStrategyFromRedis(strategyId: number): Promise<(Strategy & { indicators: StrategyIndicatorWithParams[]; conditions: StrategyCondition[] }) | null> {
    // 使用Redis服务的getOrSet方法，处理缓存击穿
    return this.redisService.getOrSet(
      `strategy:${strategyId}`,
      async () => {
        // 当Redis中没有数据时，这个函数会被调用
        const strategy = await this.findOne(strategyId);
        if (!strategy) {
          return null;
        }
        
        // 获取策略的指标和条件
        const indicators = await this.getStrategyIndicators(strategyId);
        const conditions = await this.getStrategyConditions(strategyId);
        
        // 返回完整的策略对象
        return {
          ...strategy,
          indicators,
          conditions,
        };
      },
      3600 // 缓存1小时
    );
  }

  /**
   * 清除策略相关的所有缓存
   * @param strategyId 策略ID
   */
  async clearStrategyCache(strategyId: number): Promise<void> {
    const cacheKeys = [
      `strategy:${strategyId}`,
      `strategy:basic:${strategyId}`,
      `strategy:full:${strategyId}`,
      `strategy:indicators:${strategyId}`,
      `strategy:conditions:${strategyId}`,
      'strategies:all',
      'strategies:all:with-details'
    ];

    for (const key of cacheKeys) {
      await this.redisService.delete(key);
    }
  }

  /**
   * 清除所有策略缓存
   */
  async clearAllStrategiesCache(): Promise<void> {
    const cacheKeys = [
      'strategies:all',
      'strategies:all:with-details'
    ];

    for (const key of cacheKeys) {
      await this.redisService.delete(key);
    }
  }

  /**
   * 获取所有策略及其指标和条件信息
   * @returns 包含指标和条件的完整策略列表
   */
  async findAllStrategiesWithIndicatorsAndConditions(): Promise<(Strategy & { indicators: StrategyIndicatorWithParams[]; conditions: StrategyCondition[] })[]> {
    const cacheKey = 'strategies:all:with-details';
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const strategies = await this.strategyRepository.find();
        const result = [];

        for (const strategy of strategies) {
          const indicators = await this.getStrategyIndicators(strategy.id);
          const conditions = await this.getStrategyConditions(strategy.id);
          
          result.push({
            ...strategy,
            indicators,
            conditions,
          });
        }

        return result;
      },
      3600 // 缓存1小时
    );
  }

  /**
   * 获取单个策略及其指标和条件信息
   * @param id 策略ID
   * @returns 包含指标和条件的完整策略信息
   */
  async findOneStrategyWithIndicatorsAndConditions(id: number): Promise<Strategy & { indicators: StrategyIndicatorWithParams[]; conditions: StrategyCondition[] }> {
    const cacheKey = `strategy:full:${id}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const strategy = await this.strategyRepository.findOne({ where: { id } });
        if (!strategy) {
          throw new NotFoundException(`Strategy with ID ${id} not found`);
        }

        const indicators = await this.getStrategyIndicators(id);
        const conditions = await this.getStrategyConditions(id);

        return {
          ...strategy,
          indicators,
          conditions,
        };
      },
      3600 // 缓存1小时
    );
  }
}