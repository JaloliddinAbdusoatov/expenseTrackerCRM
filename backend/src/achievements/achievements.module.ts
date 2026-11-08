import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './achievement.entity';
import { Challenge } from '../challenges/challenge.entity';
import { Goal } from '../goals/goal.entity';
import { ChallengeParticipant } from '../challenges/challenge-participant.entity';
import { User } from '../users/user.entity';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, Challenge, Goal, ChallengeParticipant, User]),
  ],
  providers: [AchievementsService],
  controllers: [AchievementsController],
  exports: [AchievementsService],
})
export class AchievementsModule {}
