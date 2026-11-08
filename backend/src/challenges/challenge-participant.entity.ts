import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Challenge } from './challenge.entity';

@Entity()
export class ChallengeParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.challengeParticipants, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Challenge, (challenge) => challenge.participants, { onDelete: 'CASCADE' })
  challenge!: Challenge;

  @Column('real', { default: 0 })
  savedAmount!: number; // Сохраненная сумма в долларах

  @CreateDateColumn()
  joinedAt!: Date;
}

