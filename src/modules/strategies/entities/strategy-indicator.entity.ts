import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('strategy_indicators')
export class StrategyIndicator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'indicator_id' })
  indicatorId: number;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
