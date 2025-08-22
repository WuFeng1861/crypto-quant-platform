import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('strategy_indicator_params')
export class StrategyIndicatorParam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_indicator_id' })
  strategyIndicatorId: number;

  @Column({ name: 'parameter_id' })
  parameterId: number;

  @Column()
  value: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}