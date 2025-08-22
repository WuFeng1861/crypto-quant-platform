import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('strategies')
export class Strategy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'position_type', type: 'enum', enum: ['long', 'short', 'both'], default: 'both' })
  positionType: string;

  @Column({ name: 'buy_fee', type: 'decimal', precision: 10, scale: 6, default: 0 })
  buyFee: number;

  @Column({ name: 'sell_fee', type: 'decimal', precision: 10, scale: 6, default: 0 })
  sellFee: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}