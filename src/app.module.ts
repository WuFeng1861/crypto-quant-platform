import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './modules/common/common.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { StrategiesModule } from './modules/strategies/strategies.module';
import { BacktestModule } from './modules/backtest/backtest.module';
import { PriceDataModule } from './modules/price-data/price-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '666666',
      database: process.env.DB_DATABASE || 'crypto_data',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    CommonModule,
    IndicatorsModule,
    StrategiesModule,
    BacktestModule,
    PriceDataModule,
  ],
})
export class AppModule {}
