import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Expense } from '../chat/expense.entity';
import { Income } from '../chat/income.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChallengeParticipant } from '../challenges/challenge-participant.entity';
import { EmailVerificationToken } from '../auth/email-verification-token.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { Goal } from '../goals/goal.entity';
import { SharedGoal, SharedGoalContribution, SharedGoalInvitation } from '../goals/shared-goal.entity';
import { Achievement } from '../achievements/achievement.entity';
import { Budget } from '../budgets/budget.entity';
import { UserFeedback } from '../feedback/user-feedback.entity';

const entities = [
  User,
  Expense,
  Income,
  Challenge,
  ChallengeParticipant,
  EmailVerificationToken,
  PasswordResetToken,
  Goal,
  SharedGoal,
  SharedGoalContribution,
  SharedGoalInvitation,
  Achievement,
  Budget,
  UserFeedback,
];

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const synchronize = process.env.DB_SYNCHRONIZE !== 'false';

  const sqliteConfig: TypeOrmModuleOptions = {
    type: 'sqlite',
    database: process.env.DB_DATABASE || 'db.sqlite',
    entities,
    synchronize,
    logging: false,
  };

  const postgresConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'emotionflow',
    entities,
    synchronize,
    logging: false,
  };

  return dbType === 'postgres' ? postgresConfig : sqliteConfig;
}

