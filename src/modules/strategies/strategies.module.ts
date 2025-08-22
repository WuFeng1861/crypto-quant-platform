import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Strategy } from './entities/strategy.entity';
import { StrategyIndicator } from './entities/strategy-indicator.entity';
import { StrategyIndicatorParam } from './entities/strategy-indicator-param.entity';
import { StrategyCondition } from './entities/strategy-condition.entity';
import { StrategiesService } from './strategies.service';
import { StrategiesController } from './strategies.controller';
import { IndicatorsModule } from '../indicators/indicators.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Strategy, StrategyIndicator, StrategyIndicatorParam, StrategyCondition]),
    IndicatorsModule,
  ],
  controllers: [StrategiesController],
  providers: [StrategiesService],
  exports: [StrategiesService],
})
export class StrategiesModule {}