import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
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

  @Get('with-details/all')
  async findAllWithIndicatorsAndConditions() {
    try {
      return await this.strategiesService.findAllStrategiesWithIndicatorsAndConditions();
    } catch (error) {
      throw new HttpException(
        `获取策略详情失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('with-details/:id')
  async findOneWithIndicatorsAndConditions(@Param('id') id: string) {
    try {
      return await this.strategiesService.findOneStrategyWithIndicatorsAndConditions(+id);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('策略不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `获取策略详情失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateStrategyDto: UpdateStrategyDto): Promise<Strategy> {
    try {
      return await this.strategiesService.update(+id, updateStrategyDto);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('策略不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `更新策略失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.strategiesService.remove(+id);
      return { message: '策略删除成功' };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('策略不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `删除策略失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id/indicators/:indicatorId')
  async updateIndicator(
    @Param('id') strategyId: string,
    @Param('indicatorId') indicatorId: string,
    @Body() updateData: { priority?: number; parameters?: Array<{ parameterId: number; value: string }> }
  ): Promise<{ message: string }> {
    try {
      await this.strategiesService.updateStrategyIndicator(+strategyId, +indicatorId, updateData);
      return { message: '指标更新成功' };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('策略或指标不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `更新指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id/indicators/:indicatorId')
  async removeIndicator(
    @Param('id') strategyId: string,
    @Param('indicatorId') indicatorId: string
  ): Promise<{ message: string }> {
    try {
      await this.strategiesService.removeStrategyIndicator(+strategyId, +indicatorId);
      return { message: '指标删除成功' };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('策略或指标不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `删除指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id/conditions/:conditionId')
  async updateCondition(
    @Param('id') strategyId: string,
    @Param('conditionId') conditionId: string,
    @Body() updateData: any
  ): Promise<{ message: string }> {
    try {
      await this.strategiesService.updateStrategyCondition(+strategyId, +conditionId, updateData);
      return { message: '条件更新成功' };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('策略或条件不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `更新条件失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id/conditions/:conditionId')
  async removeCondition(
    @Param('id') strategyId: string,
    @Param('conditionId') conditionId: string
  ): Promise<{ message: string }> {
    try {
      await this.strategiesService.removeStrategyCondition(+strategyId, +conditionId);
      return { message: '条件删除成功' };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('策略或条件不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `删除条件失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}