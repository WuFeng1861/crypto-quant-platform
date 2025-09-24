import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BacktestStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('backtest_results')
export class BacktestResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'pair_id' })
  pairId: number;

  @Column({ name: 'timeframe_id' })
  timeframeId: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'initial_capital', type: 'decimal', precision: 20, scale: 8 })
  initialCapital: number;

  @Column({ name: 'final_capital', type: 'decimal', precision: 20, scale: 8 })
  finalCapital: number;

  @Column({ name: 'total_profit', type: 'decimal', precision: 20, scale: 8 })
  totalProfit: number;

  @Column({ name: 'profit_rate', type: 'decimal', precision: 10, scale: 4 })
  profitRate: number;

  @Column({ name: 'max_drawdown', type: 'decimal', precision: 10, scale: 4 })
  maxDrawdown: number;

  @Column({ name: 'total_trades' })
  totalTrades: number;

  @Column({ name: 'winning_trades' })
  winningTrades: number;

  @Column({ name: 'losing_trades' })
  losingTrades: number;

  @Column({ name: 'win_rate', type: 'decimal', precision: 10, scale: 4 })
  winRate: number;

  @Column({ name: 'sharpe_ratio', type: 'decimal', precision: 10, scale: 4, nullable: true })
  sharpeRatio: number;

  @Column({ name: 'early_stopped', default: false })
  earlyStopped: boolean;

  @Column({ name: 'early_stop_reason', type: 'varchar', length: 255, nullable: true })
  earlyStopReason: string;

  @Column({ name: 'early_stop_time', type: 'timestamp', nullable: true })
  earlyStopTime: Date;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: BacktestStatus, 
    default: BacktestStatus.RUNNING 
  })
  status: BacktestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}