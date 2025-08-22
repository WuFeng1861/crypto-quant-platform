import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('backtest_trades')
export class BacktestTrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'backtest_id' })
  @Index()
  backtestId: number;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ name: 'trade_type', type: 'enum', enum: ['buy', 'sell'] })
  tradeType: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  price: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  fee: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  profit: number;

  @Column({ name: 'profit_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  profitRate: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  balance: number;

  @Column({ name: 'signal_indicator_id', nullable: true })
  signalIndicatorId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}