import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('trading_pairs')
export class TradingPair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  symbol: string;

  @Column({ name: 'base_asset', length: 10 })
  baseAsset: string;

  @Column({ name: 'quote_asset', length: 10 })
  quoteAsset: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}