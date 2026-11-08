import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { getDateTimeColumnType } from '../config/database.helper';

@Entity()
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  token!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: getDateTimeColumnType() })
  expiresAt!: Date;

  @Column({ default: false })
  used!: boolean;
}

