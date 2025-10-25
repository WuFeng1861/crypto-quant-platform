import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiStrategyGeneratorService } from './ai-strategy-generator.service';
import { AiStrategyGeneratorController } from './ai-strategy-generator.controller';
import { StrategiesModule } from '../strategies/strategies.module';
import { IndicatorsModule } from '../indicators/indicators.module';

@Module({
  imports: [
    HttpModule,
    StrategiesModule,
    IndicatorsModule,
  ],
  controllers: [AiStrategyGeneratorController],
  providers: [AiStrategyGeneratorService],
  exports: [AiStrategyGeneratorService],
})
export class AiStrategyGeneratorModule {}