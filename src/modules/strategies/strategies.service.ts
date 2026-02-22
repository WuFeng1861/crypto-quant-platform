import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from './entities/strategy.entity';
import { StrategyIndicator } from './entities/strategy-indicator.entity';
import { StrategyIndicatorParam } from './entities/strategy-indicator-param.entity';
import { StrategyCondition } from './entities/strategy-condition.entity';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
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
  ) { }

  async findByName(name: string): Promise<Strategy | null> {
    return this.strategyRepository.findOne({ where: { name } });
  }

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
          priority: conditionDto.priority || 1,
          group: conditionDto.group || 1,
          customCode: conditionDto.customCode || '',
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

  /**
   * 更新策略
   * @param id 策略ID
   * @param updateStrategyDto 更新数据
   * @returns 更新后的策略
   */
  async update(id: number, updateStrategyDto: UpdateStrategyDto): Promise<Strategy> {
    const strategy = await this.strategyRepository.findOne({ where: { id } });
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    // 更新策略基本信息
    if (updateStrategyDto.name !== undefined) strategy.name = updateStrategyDto.name;
    if (updateStrategyDto.description !== undefined) strategy.description = updateStrategyDto.description;
    if (updateStrategyDto.positionType !== undefined) strategy.positionType = updateStrategyDto.positionType;
    if (updateStrategyDto.buyFee !== undefined) strategy.buyFee = updateStrategyDto.buyFee;
    if (updateStrategyDto.sellFee !== undefined) strategy.sellFee = updateStrategyDto.sellFee;
    if (updateStrategyDto.liquidationThreshold !== undefined) strategy.liquidationThreshold = updateStrategyDto.liquidationThreshold;
    if (updateStrategyDto.takeProfitRatio !== undefined) strategy.takeProfitRatio = updateStrategyDto.takeProfitRatio;
    if (updateStrategyDto.stopLossRatio !== undefined) strategy.stopLossRatio = updateStrategyDto.stopLossRatio;

    const updatedStrategy = await this.strategyRepository.save(strategy);

    // 更新指标
    if (updateStrategyDto.indicators) {
      await this.updateStrategyIndicators(id, updateStrategyDto.indicators);
    }

    // 更新条件
    if (updateStrategyDto.conditions) {
      await this.updateStrategyConditions(id, updateStrategyDto.conditions);
    }

    // 清除缓存
    await this.clearStrategyCache(id);

    return updatedStrategy;
  }

  /**
   * 删除策略
   * @param id 策略ID
   */
  async remove(id: number): Promise<void> {
    const strategy = await this.strategyRepository.findOne({ where: { id } });
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    // 删除策略指标参数
    const strategyIndicators = await this.strategyIndicatorRepository.find({ where: { strategyId: id } });
    for (const indicator of strategyIndicators) {
      await this.strategyIndicatorParamRepository.delete({ strategyIndicatorId: indicator.id });
    }

    // 删除策略指标
    await this.strategyIndicatorRepository.delete({ strategyId: id });

    // 删除策略条件
    await this.strategyConditionRepository.delete({ strategyId: id });

    // 删除策略
    await this.strategyRepository.delete(id);

    // 清除缓存
    await this.clearStrategyCache(id);
    await this.clearAllStrategiesCache();
  }

  /**
   * 更新策略指标
   * @param strategyId 策略ID
   * @param indicatorId 指标ID
   * @param updateData 更新数据
   */
  async updateStrategyIndicator(
    strategyId: number,
    indicatorId: number,
    updateData: { priority?: number; parameters?: Array<{ parameterId: number; value: string }> }
  ): Promise<void> {
    const strategyIndicator = await this.strategyIndicatorRepository.findOne({
      where: { strategyId, indicatorId }
    });

    if (!strategyIndicator) {
      throw new NotFoundException(`Strategy indicator not found`);
    }

    // 更新优先级
    if (updateData.priority !== undefined) {
      strategyIndicator.priority = updateData.priority;
      await this.strategyIndicatorRepository.save(strategyIndicator);
    }

    // 更新参数
    if (updateData.parameters) {
      // 删除现有参数
      await this.strategyIndicatorParamRepository.delete({ strategyIndicatorId: strategyIndicator.id });

      // 添加新参数
      const params = updateData.parameters.map(param => {
        return this.strategyIndicatorParamRepository.create({
          strategyIndicatorId: strategyIndicator.id,
          parameterId: param.parameterId,
          value: param.value,
        });
      });

      await this.strategyIndicatorParamRepository.save(params);
    }

    // 清除缓存
    await this.clearStrategyCache(strategyId);
  }

  /**
   * 删除策略指标
   * @param strategyId 策略ID
   * @param indicatorId 指标ID
   */
  async removeStrategyIndicator(strategyId: number, indicatorId: number): Promise<void> {
    const strategyIndicator = await this.strategyIndicatorRepository.findOne({
      where: { strategyId, indicatorId }
    });

    if (!strategyIndicator) {
      throw new NotFoundException(`Strategy indicator not found`);
    }

    // 删除指标参数
    await this.strategyIndicatorParamRepository.delete({ strategyIndicatorId: strategyIndicator.id });

    // 删除指标
    await this.strategyIndicatorRepository.delete({ id: strategyIndicator.id });

    // 清除缓存
    await this.clearStrategyCache(strategyId);
  }

  /**
   * 更新策略条件
   * @param strategyId 策略ID
   * @param conditionId 条件ID
   * @param updateData 更新数据
   */
  async updateStrategyCondition(strategyId: number, conditionId: number, updateData: any): Promise<void> {
    const condition = await this.strategyConditionRepository.findOne({
      where: { id: conditionId, strategyId }
    });

    if (!condition) {
      throw new NotFoundException(`Strategy condition not found`);
    }

    // 更新条件字段
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && condition.hasOwnProperty(key)) {
        condition[key] = updateData[key];
      }
    });

    await this.strategyConditionRepository.save(condition);

    // 清除缓存
    await this.clearStrategyCache(strategyId);
  }

  /**
   * 删除策略条件
   * @param strategyId 策略ID
   * @param conditionId 条件ID
   */
  async removeStrategyCondition(strategyId: number, conditionId: number): Promise<void> {
    const condition = await this.strategyConditionRepository.findOne({
      where: { id: conditionId, strategyId }
    });

    if (!condition) {
      throw new NotFoundException(`Strategy condition not found`);
    }

    await this.strategyConditionRepository.delete({ id: conditionId });

    // 清除缓存
    await this.clearStrategyCache(strategyId);
  }

  /**
   * 批量更新策略指标
   * @param strategyId 策略ID
   * @param indicators 指标数据
   */
  private async updateStrategyIndicators(strategyId: number, indicators: any[]): Promise<void> {
    // 获取现有指标
    const existingIndicators = await this.strategyIndicatorRepository.find({ where: { strategyId } });

    // 处理更新和新增
    for (const indicatorDto of indicators) {
      if (indicatorDto.id) {
        // 更新现有指标
        const existing = existingIndicators.find(i => i.id === indicatorDto.id);
        if (existing) {
          existing.priority = indicatorDto.priority || existing.priority;
          await this.strategyIndicatorRepository.save(existing);

          // 更新参数
          if (indicatorDto.parameters) {
            await this.strategyIndicatorParamRepository.delete({ strategyIndicatorId: existing.id });
            const params = indicatorDto.parameters.map(param => {
              return this.strategyIndicatorParamRepository.create({
                strategyIndicatorId: existing.id,
                parameterId: param.parameterId,
                value: param.value,
              });
            });
            await this.strategyIndicatorParamRepository.save(params);
          }
        }
      } else {
        // 新增指标
        const newIndicator = this.strategyIndicatorRepository.create({
          strategyId,
          indicatorId: indicatorDto.indicatorId,
          priority: indicatorDto.priority || 0,
        });

        const savedIndicator = await this.strategyIndicatorRepository.save(newIndicator);

        // 添加参数
        if (indicatorDto.parameters) {
          const params = indicatorDto.parameters.map(param => {
            return this.strategyIndicatorParamRepository.create({
              strategyIndicatorId: savedIndicator.id,
              parameterId: param.parameterId,
              value: param.value,
            });
          });
          await this.strategyIndicatorParamRepository.save(params);
        }
      }
    }

    // 删除不在更新列表中的指标
    const updateIds = indicators.filter(i => i.id).map(i => i.id);
    const toDelete = existingIndicators.filter(i => !updateIds.includes(i.id));

    for (const indicator of toDelete) {
      await this.strategyIndicatorParamRepository.delete({ strategyIndicatorId: indicator.id });
      await this.strategyIndicatorRepository.delete({ id: indicator.id });
    }
  }

  /**
   * 批量更新策略条件
   * @param strategyId 策略ID
   * @param conditions 条件数据
   */
  private async updateStrategyConditions(strategyId: number, conditions: any[]): Promise<void> {
    // 获取现有条件
    const existingConditions = await this.strategyConditionRepository.find({ where: { strategyId } });

    // 处理更新和新增
    for (const conditionDto of conditions) {
      if (conditionDto.id) {
        // 更新现有条件
        const existing = existingConditions.find(c => c.id === conditionDto.id);
        if (existing) {
          Object.keys(conditionDto).forEach(key => {
            if (conditionDto[key] !== undefined && existing.hasOwnProperty(key) && key !== 'id') {
              existing[key] = conditionDto[key];
            }
          });
          await this.strategyConditionRepository.save(existing);
        }
      } else {
        // 新增条件
        const newCondition = this.strategyConditionRepository.create({
          strategyId,
          ...conditionDto,
        });
        await this.strategyConditionRepository.save(newCondition);
      }
    }

    // 删除不在更新列表中的条件
    const updateIds = conditions.filter(c => c.id).map(c => c.id);
    const toDelete = existingConditions.filter(c => !updateIds.includes(c.id));

    for (const condition of toDelete) {
      await this.strategyConditionRepository.delete({ id: condition.id });
    }
  }
}