import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ChallengeParticipant } from './challenge-participant.entity';
import { getDateTimeColumnType } from '../config/database.helper';

@Entity()
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('real')
  targetAmount!: number; // Целевая сумма в долларах

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ type: getDateTimeColumnType(), nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  winnerId?: string;

  @OneToMany(() => ChallengeParticipant, (cp) => cp.challenge)
  participants!: ChallengeParticipant[];
}

