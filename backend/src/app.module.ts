import { Module } from '@nestjs/common';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { ChallengesModule } from './challenges/challenges.module';
import { GoalsModule } from './goals/goals.module';
import { HealthModule } from './health/health.module';
import { AchievementsModule } from './achievements/achievements.module';
import { BudgetsModule } from './budgets/budgets.module';
import { FeedbackModule } from './feedback/feedback.module';
import { getTypeOrmConfig } from './config/typeorm.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmConfig(),
    }),
    UsersModule,
    AuthModule,
    ChatModule,
    ChallengesModule,
    GoalsModule,
    HealthModule,
    AchievementsModule,
    BudgetsModule,
    FeedbackModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

