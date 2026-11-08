import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  targetAmount!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  autoAllocatePercent?: number; // Процент от дохода (0-100)
}

class UpdateGoalDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsNumber()
  currentAmount?: number;

  @IsOptional()
  @IsNumber()
  targetAmount?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  autoAllocatePercent?: number;
}

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  async createGoal(@Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(dto.userId, { 
      name: dto.name, 
      targetAmount: dto.targetAmount, 
      imageUrl: dto.imageUrl,
      autoAllocatePercent: dto.autoAllocatePercent || 0,
    });
  }

  @Get()
  async getUserGoals(@Query('userId') userId: string) {
    return this.goalsService.getUserGoals(userId);
  }

  @Get('balance/:userId')
  async getUserBalance(@Param('userId') userId: string) {
    const balance = await this.goalsService.getUserBalance(userId);
    return { balance };
  }

  @Put(':id')
  async updateGoal(
    @Param('id') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.updateGoal(goalId, dto.userId, {
      currentAmount: dto.currentAmount,
      targetAmount: dto.targetAmount,
      name: dto.name,
      imageUrl: dto.imageUrl,
      autoAllocatePercent: dto.autoAllocatePercent,
    });
  }

  @Delete(':id')
  async deleteGoal(@Query('userId') userId: string, @Param('id') goalId: string) {
    return this.goalsService.deleteGoal(goalId, userId);
  }

  // ========== Совместные цели ==========

  @Post('shared')
  async createSharedGoal(@Body() dto: { userId: string; name: string; targetAmount: number; imageUrl?: string; isFamilyMode?: boolean; participantIds?: string[] }) {
    return this.goalsService.createSharedGoal(dto.userId, {
      name: dto.name,
      targetAmount: dto.targetAmount,
      imageUrl: dto.imageUrl,
      isFamilyMode: dto.isFamilyMode,
      participantIds: dto.participantIds,
    });
  }

  @Get('shared')
  async getSharedGoals(@Query('userId') userId: string) {
    return this.goalsService.getSharedGoals(userId);
  }

  @Post('shared/:id/contribute')
  async addContribution(
    @Param('id') goalId: string,
    @Body() dto: { userId: string; amount: number },
  ) {
    return this.goalsService.addContribution(goalId, dto.userId, dto.amount);
  }

  @Get('shared/:id/contributions')
  async getContributions(@Param('id') goalId: string) {
    return this.goalsService.getGoalContributions(goalId);
  }

  @Post('shared/:id/participants')
  async addParticipant(
    @Param('id') goalId: string,
    @Body() dto: { userId: string; participantId: string },
  ) {
    return this.goalsService.addParticipant(goalId, dto.userId, dto.participantId);
  }

  @Delete('shared/:id/participants/:participantId')
  async removeParticipant(
    @Param('id') goalId: string,
    @Param('participantId') participantId: string,
    @Query('userId') userId: string,
  ) {
    return this.goalsService.removeParticipant(goalId, userId, participantId);
  }

  @Delete('shared/:id')
  async deleteSharedGoal(@Param('id') goalId: string, @Query('userId') userId: string) {
    return this.goalsService.deleteSharedGoal(goalId, userId);
  }

  // ========== Приглашения ==========

  @Post('shared/:id/invite')
  async sendInvitation(
    @Param('id') goalId: string,
    @Body() dto: { userId: string; invitedUserEmailOrUsername: string },
  ) {
    return this.goalsService.sendInvitation(goalId, dto.userId, dto.invitedUserEmailOrUsername, false);
  }

  @Post(':id/invite')
  async sendInvitationToRegularGoal(
    @Param('id') goalId: string,
    @Body() dto: { userId: string; invitedUserEmailOrUsername: string },
  ) {
    return this.goalsService.sendInvitation(goalId, dto.userId, dto.invitedUserEmailOrUsername, true);
  }

  @Get('invitations')
  async getInvitations(@Query('userId') userId: string, @Query('type') type: 'sent' | 'received' = 'received') {
    return this.goalsService.getInvitations(userId, type);
  }

  @Post('invitations/:id/accept')
  async acceptInvitation(
    @Param('id') invitationId: string,
    @Body() dto: { userId: string },
  ) {
    return this.goalsService.acceptInvitation(invitationId, dto.userId);
  }

  @Post('invitations/:id/reject')
  async rejectInvitation(
    @Param('id') invitationId: string,
    @Body() dto: { userId: string },
  ) {
    return this.goalsService.rejectInvitation(invitationId, dto.userId);
  }
}
