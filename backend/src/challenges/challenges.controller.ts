import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ChallengesService } from './challenges.service';

class CreateChallengeDto {
  title!: string;
  description?: string;
  targetAmount!: number;
}

class AddParticipantDto {
  userId!: string;
  savedAmount?: number;
}

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  // POST /api/challenges
  @Post()
  create(@Body() dto: CreateChallengeDto) {
    return this.challengesService.createChallenge(dto);
  }

  // POST /api/challenges/:id/participants
  @Post(':id/participants')
  addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto) {
    return this.challengesService.addParticipant(id, dto.userId, dto.savedAmount ?? 0);
  }

  // GET /api/challenges
  @Get()
  getAll(@Query('language') language?: string) {
    return this.challengesService.getAllChallenges(language as 'ru' | 'en' | 'ja' | undefined);
  }

  // GET /api/challenges/:id
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.challengesService.getChallengeById(id);
  }

  // DELETE /api/challenges/:challengeId/participants/:userId
  @Delete(':challengeId/participants/:userId')
  removeParticipant(
    @Param('challengeId') challengeId: string,
    @Param('userId') userId: string,
  ) {
    return this.challengesService.removeParticipant(challengeId, userId);
  }

  // GET /api/challenges/match?targetAmount=1000
  @Get('match')
  match(@Query('targetAmount') targetAmount: string) {
    const value = parseInt(targetAmount, 10) || 0;
    return this.challengesService.findClosestChallenges(value);
  }

  // POST /api/challenges/auto-create
  @Post('auto-create')
  autoCreate() {
    return this.challengesService.autoCreateChallengesFromGoals();
  }

  // POST /api/challenges/generate-artificial-users
  @Post('generate-artificial-users')
  generateArtificialUsers() {
    return this.challengesService.generateArtificialUsersWithGoals();
  }
}

