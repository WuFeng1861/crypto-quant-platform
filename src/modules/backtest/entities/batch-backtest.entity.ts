import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BatchBacktestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

@Entity('batch_backtests')
export class BatchBacktest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'timeframe_id' })
  timeframeId: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'initial_capital', type: 'decimal', precision: 20, scale: 8 })
  initialCapital: number;

  @Column({ name: 'early_stop_threshold', type: 'decimal', precision: 10, scale: 4, nullable: true })
  earlyStopThreshold: number;

  @Column({ name: 'position_division', nullable: true })
  positionDivision: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BatchBacktestStatus,
    default: BatchBacktestStatus.PENDING
  })
  status: BatchBacktestStatus;

  @Column({ name: 'total_pairs' })
  totalPairs: number;

  @Column({ name: 'completed_pairs', default: 0 })
  completedPairs: number;

  @Column({ name: 'failed_pairs', default: 0 })
  failedPairs: number;

  @Column({ name: 'current_pair_id', nullable: true })
  currentPairId: number;

  @Column({ name: 'pause_requested', default: false })
  pauseRequested: boolean;

  @Column({ name: 'pause_timeout_at', type: 'timestamp', nullable: true })
  pauseTimeoutAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
