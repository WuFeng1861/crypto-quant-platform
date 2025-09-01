import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Indicator } from './entities/indicator.entity';
import { IndicatorParameter } from './entities/indicator-parameter.entity';
import { IndicatorsService } from './indicators.service';
import { IndicatorsController } from './indicators.controller';
import { CommonServicesModule } from '../common/services/common-services.module';
import { PriceDataModule } from '../price-data/price-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Indicator, IndicatorParameter]),
    CommonServicesModule,
    PriceDataModule,
  ],
  controllers: [IndicatorsController],
  providers: [IndicatorsService],
  exports: [IndicatorsService],
})
export class IndicatorsModule {}
