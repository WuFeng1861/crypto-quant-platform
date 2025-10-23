import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiIndicatorGeneratorController } from './ai-indicator-generator.controller';
import { AiIndicatorGeneratorService } from './ai-indicator-generator.service';
import { IndicatorsModule } from '../indicators/indicators.module';
import { Indicator } from '../indicators/entities/indicator.entity';
import { IndicatorParameter } from '../indicators/entities/indicator-parameter.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Indicator, IndicatorParameter]),
    IndicatorsModule,
  ],
  controllers: [AiIndicatorGeneratorController],
  providers: [AiIndicatorGeneratorService],
  exports: [AiIndicatorGeneratorService],
})
export class AiIndicatorGeneratorModule {}