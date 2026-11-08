import { Controller, Get, Param, Query } from '@nestjs/common';
import { AchievementsService } from './achievements.service';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get(':userId')
  async getAchievements(
    @Param('userId') userId: string,
    @Query('language') language?: string,
  ) {
    return this.achievementsService.getUserAchievements(userId, language as 'ru' | 'en' | 'ja' | undefined);
  }

  @Get('stats/:userId')
  async getStats(
    @Param('userId') userId: string,
    @Query('language') language?: string,
  ) {
    return this.achievementsService.getUserStats(userId, language as 'ru' | 'en' | 'ja' | undefined);
  }
}
