import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Challenge } from '../challenges/challenge.entity';

@Entity()
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.achievements, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Challenge, { nullable: true, onDelete: 'SET NULL' })
  challenge?: Challenge;

  @Column()
  type!: string; // 'challenge_winner', 'goal_completed', 'milestone', etc.

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  titleTranslations?: string; // JSON: { ru: "...", en: "...", ja: "..." }

  @Column({ type: 'text', nullable: true })
  descriptionTranslations?: string; // JSON: { ru: "...", en: "...", ja: "..." }

  @Column({ type: 'integer', default: 0 })
  points!: number;

  @CreateDateColumn()
  earnedAt!: Date;
}
