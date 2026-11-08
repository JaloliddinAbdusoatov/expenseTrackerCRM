import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeParticipant } from './challenge-participant.entity';
import { Goal } from '../goals/goal.entity';
import { Income } from '../chat/income.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { UsersModule } from '../users/users.module';
import { GoalsModule } from '../goals/goals.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge, ChallengeParticipant, Goal, Income]),
    UsersModule,
    forwardRef(() => GoalsModule),
    forwardRef(() => AchievementsModule),
  ],
  providers: [ChallengesService],
  controllers: [ChallengesController],
  exports: [ChallengesService],
})
export class ChallengesModule {}

