import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('trading_pairs')
export class TradingPair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  symbol: string;

  @Column({ length: 10, name: 'base_asset' })
  baseAsset: string;

  @Column({ length: 10, name: 'quote_asset' })
  quoteAsset: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}