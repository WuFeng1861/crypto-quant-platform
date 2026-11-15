import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BatchBacktestStatus {
  QUEUED = 'queued',         // 队列中等待
  PENDING = 'pending',       // 待执行（已出队）
  RUNNING = 'running',       // 执行中
  PAUSED = 'paused',         // 已暂停
  COMPLETED = 'completed',   // 已完成
  CANCELLED = 'cancelled',   // 已取消
  FAILED = 'failed'          // 失败
}

@Entity('batch_backtests')
export class BatchBacktest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'timeframe_id' })
  timeframeId: number;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
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

  @Column({ name: 'progress', type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number;

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
