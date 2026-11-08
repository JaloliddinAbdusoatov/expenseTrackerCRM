import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Expense } from '../chat/expense.entity';
import { Income } from '../chat/income.entity';
import { ChallengeParticipant } from '../challenges/challenge-participant.entity';
import { Goal } from '../goals/goal.entity';
import { Achievement } from '../achievements/achievement.entity';
import { Budget } from '../budgets/budget.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  passwordHash!: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ default: 'user' })
  role!: 'user' | 'admin' | 'superadmin' | 'viewer_admin';

  @Column({ default: false })
  isBlocked!: boolean;

  @Column({ default: 'UZS' })
  currency!: 'USD' | 'UZS' | 'JPY' | 'RUB';

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Expense, (expense) => expense.user)
  expenses!: Expense[];

  @OneToMany(() => Income, (income) => income.user)
  incomes!: Income[];

  @OneToMany(() => ChallengeParticipant, (cp) => cp.user)
  challengeParticipants!: ChallengeParticipant[];

  @OneToMany(() => Goal, (goal) => goal.user)
  goals!: Goal[];

  @OneToMany(() => Achievement, (achievement) => achievement.user)
  achievements!: Achievement[];

  @OneToMany(() => Budget, (budget) => budget.user)
  budgets!: Budget[];
}

