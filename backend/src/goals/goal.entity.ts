import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.goals, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  name!: string;

  @Column('real')
  targetAmount!: number; // Целевая сумма в долларах

  @Column('real', { default: 0 })
  currentAmount!: number; // Текущая сумма в долларах

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column('integer', { default: 0 })
  autoAllocatePercent!: number; // Процент от дохода, который автоматически идет на эту цель (0-100)
}
