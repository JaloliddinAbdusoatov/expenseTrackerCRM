import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from './goal.entity';
import { SharedGoal, SharedGoalContribution, SharedGoalInvitation } from './shared-goal.entity';
import { Expense } from '../chat/expense.entity';
import { Income } from '../chat/income.entity';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { UsersModule } from '../users/users.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal, SharedGoal, SharedGoalContribution, SharedGoalInvitation, Expense, Income]),
    UsersModule,
    forwardRef(() => ChallengesModule),
    AchievementsModule,
  ],
  providers: [GoalsService],
  controllers: [GoalsController],
  exports: [GoalsService],
})
export class GoalsModule {}
