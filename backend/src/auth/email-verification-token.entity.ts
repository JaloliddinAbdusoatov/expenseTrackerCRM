import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { getDateTimeColumnType } from '../config/database.helper';

@Entity()
export class EmailVerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  token!: string;

  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  user!: User | null;

  @Column({ type: getDateTimeColumnType() })
  expiresAt!: Date;

  @Column({ default: false })
  used!: boolean;
}

