import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

@Entity()
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.budgets, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  category!: string; // Категория трат (Food & Dining, Shopping, etc.)

  @Column('real')
  limit!: number; // Лимит бюджета в долларах

  @Column({ type: 'text', default: 'monthly' })
  period!: BudgetPeriod; // Период: weekly, monthly, yearly

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'text', nullable: true })
  note?: string; // Заметка к бюджету
}
