import { Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn, JoinTable, OneToMany, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { getDateTimeColumnType } from '../config/database.helper';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity()
export class SharedGoal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  createdBy!: User; // Создатель цели

  @ManyToMany(() => User, { cascade: true })
  @JoinTable()
  participants!: User[]; // Участники цели

  @OneToMany(() => SharedGoalContribution, (contribution) => contribution.goal)
  contributions!: SharedGoalContribution[];

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

  @Column({ default: false })
  isFamilyMode!: boolean; // Семейный режим (общий бюджет)
}

@Entity()
export class SharedGoalContribution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SharedGoal, { onDelete: 'CASCADE' })
  goal!: SharedGoal;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column('real')
  amount!: number; // Сколько внес пользователь

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity()
export class SharedGoalInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SharedGoal, { onDelete: 'CASCADE', nullable: true })
  goal?: SharedGoal; // Может быть null, если это приглашение в обычную цель

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  invitedBy!: User; // Кто отправил приглашение

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  invitedUser!: User; // Кому отправлено приглашение

  @Column({ type: 'varchar', default: InvitationStatus.PENDING })
  status!: InvitationStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: getDateTimeColumnType(), nullable: true })
  respondedAt?: Date;

  // Для приглашений в обычные цели (отдельная колонка, чтобы не конфликтовать с FK goal -> SharedGoal)
  @Column({ type: 'varchar', nullable: true, name: 'regular_goal_id' })
  regularGoalId?: string; // ID обычной цели (Goal), если это не SharedGoal

  @Column({ type: 'varchar', nullable: true })
  goalName?: string; // Название цели для отображения
}
