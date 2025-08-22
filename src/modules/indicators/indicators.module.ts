import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';
import { IndicatorsService } from './indicators.service';
import { IndicatorsController } from './indicators.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Indicator, IndicatorParameter]),
  ],
  controllers: [IndicatorsController],
  providers: [IndicatorsService],
  exports: [IndicatorsService],
})
export class IndicatorsModule {}