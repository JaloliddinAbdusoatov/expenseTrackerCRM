import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { getDateTimeColumnType } from '../config/database.helper';

export type EmotionLevel = 'low' | 'medium' | 'high';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.expenses, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  description!: string;

  @Column('real')
  amount!: number; // Сумма в долларах

  @Column({ type: 'text', default: 'medium' })
  emotion!: EmotionLevel;

  @Column({ type: getDateTimeColumnType(), default: () => 'CURRENT_TIMESTAMP' })
  date!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'text', nullable: true })
  photo?: string;

  @Column({ type: 'text', nullable: true })
  category?: string; // Кастомная категория, если указана пользователем

  @Column({ type: 'text', nullable: true })
  note?: string; // Комментарий/заметка к транзакции

  // Поля для повторяющихся транзакций
  @Column({ type: 'boolean', default: false })
  isRecurring!: boolean; // Является ли транзакция повторяющейся

  @Column({ type: 'varchar', nullable: true })
  recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly'; // Тип повторения

  @Column({ type: 'integer', nullable: true, default: 1 })
  recurrenceInterval?: number; // Интервал повторения (для дней: 1 = каждый день, 2 = через день и т.д.)

  @Column({ type: getDateTimeColumnType(), nullable: true })
  recurrenceEndDate?: Date; // Дата окончания повторений

  @Column({ type: 'varchar', nullable: true })
  parentTransactionId?: string; // ID оригинальной транзакции, если это автоматически созданная
}

