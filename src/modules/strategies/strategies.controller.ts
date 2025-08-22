import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { Strategy } from './entities/strategy.entity';

@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Post()
  async create(@Body() createStrategyDto: CreateStrategyDto): Promise<Strategy> {
    try {
      return await this.strategiesService.create(createStrategyDto);
    } catch (error) {
      throw new HttpException(
        `创建策略失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll(): Promise<Strategy[]> {
    return this.strategiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Strategy> {
    const strategy = await this.strategiesService.findOne(+id);
    if (!strategy) {
      throw new HttpException('策略不存在', HttpStatus.NOT_FOUND);
    }
    return strategy;
  }

  @Get(':id/indicators')
  async getIndicators(@Param('id') id: string): Promise<any[]> {
    const strategy = await this.strategiesService.findOne(+id);
    if (!strategy) {
      throw new HttpException('策略不存在', HttpStatus.NOT_FOUND);
    }
    return this.strategiesService.getStrategyIndicators(+id);
  }
}