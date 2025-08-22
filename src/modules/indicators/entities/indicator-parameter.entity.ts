import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('indicator_parameters')
export class IndicatorParameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'indicator_id' })
  indicatorId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'default_value', nullable: true })
  defaultValue: string;

  @Column({ name: 'param_type', type: 'enum', enum: ['number', 'string', 'boolean'] })
  paramType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}