import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { RedisService } from '../common/services/redis.service';
import { ProcessExecutorService } from '../common/services/process-executor.service';

@Injectable()
export class IndicatorsService {
  constructor(
    @InjectRepository(Indicator)
    private indicatorRepository: Repository<Indicator>,
    @InjectRepository(IndicatorParameter)
    private parameterRepository: Repository<IndicatorParameter>,
    private redisService: RedisService,
    private processExecutor: ProcessExecutorService,
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