import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VM } from 'vm2';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { RedisService } from '../common/services/redis.service';

@Injectable()
export class IndicatorsService {
  constructor(
    @InjectRepository(Indicator)
    private indicatorRepository: Repository<Indicator>,
    @InjectRepository(IndicatorParameter)
    private parameterRepository: Repository<IndicatorParameter>,
    private redisService: RedisService,
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
    return this.indicatorRepository.find();
  }

  async findOne(id: number): Promise<Indicator> {
    return this.indicatorRepository.findOne({ where: { id } });
  }

  async getIndicatorParameters(indicatorId: number): Promise<IndicatorParameter[]> {
    return this.parameterRepository.find({ where: { indicatorId } });
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

  private async executeIndicatorCode(
    code: string, 
    priceData: any[], 
    parameters: Record<string, any>
  ): Promise<any[]> {
    try {
      // 使用VM2安全执行指标代码
      const vm = new VM({
        timeout: 5000, // 5秒超时
        sandbox: {
          priceData: JSON.parse(JSON.stringify(priceData)), // 深拷贝防止修改原始数据
          parameters,
          console: {
            log: () => {}, // 禁用控制台输出
          },
        },
      });

      // 包装代码，确保返回结果
      const wrappedCode = `
        (function() {
          ${code}
          if (typeof calculate !== 'function') {
            throw new Error('Indicator code must export a calculate function');
          }
          return calculate(priceData, parameters);
        })()
      `;

      return vm.run(wrappedCode);
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

  private async getIndicatorFromRedis(indicatorId: number): Promise<any> {
    return this.redisService.get(`indicator:${indicatorId}`);
  }
}