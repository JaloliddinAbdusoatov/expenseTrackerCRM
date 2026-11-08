import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  async createBudget(
    @Query('userId') userId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.createBudget(userId, dto);
  }

  @Get()
  async getUserBudgets(
    @Query('userId') userId: string,
    @Query('withSpending') withSpending?: string,
  ) {
    if (withSpending === 'true') {
      return this.budgetsService.getAllBudgetsWithSpending(userId);
    }
    return this.budgetsService.getUserBudgets(userId);
  }

  @Get(':id')
  async getBudget(
    @Query('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.getBudgetWithSpending(userId, id);
  }

  @Put(':id')
  async updateBudget(
    @Query('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.updateBudget(userId, id, dto);
  }

  @Delete(':id')
  async deleteBudget(
    @Query('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.budgetsService.deleteBudget(userId, id);
    return { success: true };
  }
}
