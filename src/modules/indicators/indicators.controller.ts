import { Controller, Get, Post, Body, Param, HttpException, HttpStatus, Patch, Delete } from '@nestjs/common';
import { IndicatorsService } from './indicators.service';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import {
  CalculateIndicatorDto,
  CalculateWithPriceDataDto,
  CalculateBySymbolDto
} from './dto/calculate-indicator.dto';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';

@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) { }

  @Post()
  async create(@Body() createIndicatorDto: CreateIndicatorDto): Promise<Indicator> {
    try {
      return await this.indicatorsService.create(createIndicatorDto);
    } catch (error) {
      throw new HttpException(
        `创建指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateIndicatorDto: UpdateIndicatorDto,
  ): Promise<Indicator> {
    try {
      return await this.indicatorsService.update(+id, updateIndicatorDto);
    } catch (error) {
      throw new HttpException(
        `更新指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.indicatorsService.remove(+id);
      return {
        success: true,
        message: '指标删除成功',
      };
    } catch (error) {
      throw new HttpException(
        `删除指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll(): Promise<Indicator[]> {
    return this.indicatorsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Indicator> {
    const indicator = await this.indicatorsService.findOne(+id);
    if (!indicator) {
      throw new HttpException('指标不存在', HttpStatus.NOT_FOUND);
    }
    return indicator;
  }

  @Get(':id/parameters')
  async getParameters(@Param('id') id: string): Promise<IndicatorParameter[]> {
    const indicator = await this.indicatorsService.findOne(+id);
    if (!indicator) {
      throw new HttpException('指标不存在', HttpStatus.NOT_FOUND);
    }
    return this.indicatorsService.getIndicatorParameters(+id);
  }

  @Post(':id/calculate')
  async calculate(
    @Param('id') id: string,
    @Body() data: CalculateIndicatorDto,
  ): Promise<any[]> {
    try {
      return await this.indicatorsService.calculateIndicator(
        +id,
        data.priceData,
        data.parameters,
      );
    } catch (error) {
      throw new HttpException(
        `计算指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/calculate-with-data')
  async calculateWithPriceData(
    @Param('id') id: string,
    @Body() data: CalculateWithPriceDataDto,
  ): Promise<any[]> {
    try {
      return await this.indicatorsService.calculateIndicatorWithPriceData(
        +id,
        data.pairId,
        data.timeframeId,
        data.startTime,
        data.endTime,
        data.parameters,
      );
    } catch (error) {
      throw new HttpException(
        `使用价格数据计算指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/calculate-by-symbol')
  async calculateBySymbol(
    @Param('id') id: string,
    @Body() data: CalculateBySymbolDto,
  ): Promise<any[]> {
    try {
      return await this.indicatorsService.calculateIndicatorBySymbol(
        +id,
        data.symbol,
        data.timeframeName,
        data.startTime,
        data.endTime,
        data.parameters,
      );
    } catch (error) {
      throw new HttpException(
        `使用交易对符号计算指标失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}