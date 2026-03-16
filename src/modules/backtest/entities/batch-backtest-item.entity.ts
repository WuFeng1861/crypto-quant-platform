import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BatchBacktestItemStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

@Entity('batch_backtest_items')
export class BatchBacktestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id' })
  batchId: number;

  @Column({ name: 'pair_id' })
  pairId: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BatchBacktestItemStatus,
    default: BatchBacktestItemStatus.PENDING
  })
  status: BatchBacktestItemStatus;

  @Column({ name: 'backtest_result_id', nullable: true })
  backtestResultId: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retries', default: 0 })
  retries: number;

  @Column({ name: 'timeout_at', type: 'timestamp', nullable: true })
  timeoutAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
