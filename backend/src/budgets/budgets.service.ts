import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Budget, BudgetPeriod } from './budget.entity';
import { Expense } from '../chat/expense.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async createBudget(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const budget = this.budgetRepo.create({
      user: { id: userId },
      category: dto.category,
      limit: dto.limit,
      period: dto.period,
      note: dto.note,
    });

    return await this.budgetRepo.save(budget);
  }

  async getUserBudgets(userId: string): Promise<Budget[]> {
    return await this.budgetRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getBudgetWithSpending(userId: string, budgetId: string) {
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, user: { id: userId } },
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    const spending = await this.getBudgetSpending(userId, budget);
    const percentage = budget.limit > 0 ? Math.min(100, (spending / budget.limit) * 100) : 0;
    const remaining = Math.max(0, budget.limit - spending);
    const isExceeded = spending > budget.limit;

    return {
      ...budget,
      spending,
      percentage: Math.round(percentage * 100) / 100,
      remaining,
      isExceeded,
    };
  }

  async getAllBudgetsWithSpending(userId: string) {
    const budgets = await this.getUserBudgets(userId);
    
    return Promise.all(
      budgets.map(async (budget) => {
        const spending = await this.getBudgetSpending(userId, budget);
        const percentage = budget.limit > 0 ? Math.min(100, (spending / budget.limit) * 100) : 0;
        const remaining = Math.max(0, budget.limit - spending);
        const isExceeded = spending > budget.limit;

        return {
          ...budget,
          spending,
          percentage: Math.round(percentage * 100) / 100,
          remaining,
          isExceeded,
        };
      })
    );
  }

  private async getBudgetSpending(userId: string, budget: Budget): Promise<number> {
    const { startDate, endDate } = this.getPeriodDates(budget.period);

    const expenses = await this.expenseRepo.find({
      where: {
        user: { id: userId },
        category: budget.category,
        date: Between(startDate, endDate),
      },
    });

    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  private getPeriodDates(period: BudgetPeriod): { startDate: Date; endDate: Date } {
    const now = new Date();
    
    switch (period) {
      case 'weekly':
        return {
          startDate: startOfWeek(now, { weekStartsOn: 1 }), // Monday
          endDate: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'monthly':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
      case 'yearly':
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
        };
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
    }
  }

  async updateBudget(userId: string, budgetId: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, user: { id: userId } },
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    if (dto.category !== undefined) budget.category = dto.category;
    if (dto.limit !== undefined) budget.limit = dto.limit;
    if (dto.period !== undefined) budget.period = dto.period;
    if (dto.note !== undefined) budget.note = dto.note;

    return await this.budgetRepo.save(budget);
  }

  async deleteBudget(userId: string, budgetId: string): Promise<void> {
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, user: { id: userId } },
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    await this.budgetRepo.remove(budget);
  }
}
