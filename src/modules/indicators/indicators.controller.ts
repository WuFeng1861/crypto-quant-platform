import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { IndicatorsService } from './indicators.service';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';

@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

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
    @Body() data: { priceData: any[]; parameters: Record<string, any> },
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
}