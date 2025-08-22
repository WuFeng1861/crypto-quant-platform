import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('strategy_conditions')
export class StrategyCondition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'indicator_id' })
  indicatorId: number;

  // 比较类型：'indicator'（与另一个指标比较）或 'constant'（与常量比较）
  @Column({ name: 'comparison_type', type: 'enum', enum: ['indicator', 'constant'] })
  comparisonType: string;

  // 当比较类型为'indicator'时，指定要比较的指标ID
  @Column({ name: 'compared_indicator_id', nullable: true })
  comparedIndicatorId: number;

  // 当比较类型为'constant'时，指定常量值
  @Column({ name: 'constant_value', nullable: true })
  constantValue: string;

  // 比较运算符：'>', '<', '>=', '<=', '==', '!='
  @Column({ name: 'operator' })
  operator: string;

  // 条件类型：'crossover'（交叉）, 'value'（值比较）等
  @Column({ name: 'condition_type' })
  conditionType: string;

  // 满足条件时执行的操作：'buy', 'sell', 'none'
  @Column({ name: 'action', type: 'enum', enum: ['buy', 'sell', 'none'] })
  action: string;

  // 条件组，同一组内的条件使用AND逻辑，不同组之间使用OR逻辑
  @Column({ name: 'condition_group', default: 1 })
  group: number;

  // 优先级，数字越小优先级越高
  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
