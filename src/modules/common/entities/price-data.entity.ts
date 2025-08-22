import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('price_data')
export class PriceData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pair_id' })
  pairId: number;

  @Column({ name: 'timeframe_id' })
  timeframeId: number;

  @Column({ type: 'bigint' })
  timestamp: number;

  @Column({ name: 'open_price', type: 'decimal', precision: 20, scale: 8 })
  openPrice: number;

  @Column({ name: 'high_price', type: 'decimal', precision: 20, scale: 8 })
  highPrice: number;

  @Column({ name: 'low_price', type: 'decimal', precision: 20, scale: 8 })
  lowPrice: number;

  @Column({ name: 'close_price', type: 'decimal', precision: 20, scale: 8 })
  closePrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  volume: number;

  @Column({ name: 'volume_currency', type: 'decimal', precision: 20, scale: 8 })
  volumeCurrency: number;

  @Column({ name: 'volume_currency_quote', type: 'decimal', precision: 20, scale: 8 })
  volumeCurrencyQuote: number;

  @Column({ type: 'tinyint', default: 0 })
  confirmed: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}