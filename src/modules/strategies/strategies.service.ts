import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from './entities/strategy.entity';
import { StrategyIndicator } from './entities/strategy-indicator.entity';
import { StrategyIndicatorParam } from './entities/strategy-indicator-param.entity';
import { StrategyCondition } from './entities/strategy-condition.entity';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { RedisService } from '../common/services/redis.service';
import { IndicatorsService } from '../indicators/indicators.service';

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
          indicatorId: conditionDto.indicatorId,
          comparisonType: conditionDto.comparisonType,
          comparedIndicatorId: conditionDto.comparedIndicatorId,
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

    return savedStrategy;
  }

  async findAll(): Promise<Strategy[]> {
    return this.strategyRepository.find();
  }

  async findOne(id: number): Promise<Strategy> {
    return this.strategyRepository.findOne({ where: { id } });
  }

  async getStrategyIndicators(strategyId: number): Promise<any[]> {
    const indicators = await this.strategyIndicatorRepository.find({
      where: { strategyId },
      order: { priority: 'ASC' },
    });

    const result = [];
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
  }

  async getStrategyConditions(strategyId: number): Promise<StrategyCondition[]> {
    return this.strategyConditionRepository.find({
      where: { strategyId },
      order: { priority: 'ASC' },
    });
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

  async getStrategyFromRedis(strategyId: number): Promise<any> {
    return this.redisService.get(`strategy:${strategyId}`);
  }
}