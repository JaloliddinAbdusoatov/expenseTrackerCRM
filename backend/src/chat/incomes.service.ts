import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './income.entity';
import { UsersService } from '../users/users.service';
import { GoalsService } from '../goals/goals.service';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class IncomesService {
  constructor(
    @InjectRepository(Income)
    private readonly incomeRepo: Repository<Income>,
    private readonly usersService: UsersService,
    private readonly goalsService: GoalsService,
  ) {}

  async addIncome(
    userId: string,
    description: string,
    amount: number,
    photo?: string,
    isRecurring?: boolean,
    recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly',
    recurrenceInterval?: number,
    recurrenceDaysCount?: number,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new Error('User not found');

    const incomeData: any = {
      user,
      description: description.trim(),
      amount: Math.abs(amount),
    };
    if (photo) incomeData.photo = photo;
    if (isRecurring && recurrenceType && recurrenceType !== 'once') {
      incomeData.isRecurring = true;
      incomeData.recurrenceType = recurrenceType;
      incomeData.recurrenceInterval = recurrenceInterval || 1;
      if (recurrenceType === 'daily' && recurrenceDaysCount) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + recurrenceDaysCount);
        incomeData.recurrenceEndDate = endDate;
      }
    } else {
      incomeData.isRecurring = false;
    }

    const income = this.incomeRepo.create(incomeData);
    const savedIncome = await this.incomeRepo.save(income);
    const result = Array.isArray(savedIncome) ? savedIncome[0] : savedIncome;

    if (isRecurring && recurrenceType === 'daily' && recurrenceDaysCount && recurrenceDaysCount > 1) {
      await this.createRecurringIncomes(
        result.id,
        userId,
        description,
        amount,
        photo,
        recurrenceInterval || 1,
        recurrenceDaysCount,
      );
    }

    try {
      const balance = await this.goalsService.getUserBalance(userId);
      const goals = await this.goalsService.getUserGoals(userId);
      const goalsWithAutoAllocate = goals.filter(g => g.autoAllocatePercent > 0 && g.autoAllocatePercent <= 100);
      for (const goal of goalsWithAutoAllocate) {
        const amountToAdd = Math.floor(result.amount * goal.autoAllocatePercent / 100);
        if (amountToAdd > 0) {
          const remainingToComplete = Math.max(0, goal.targetAmount - goal.currentAmount);
          const currentBalance = await this.goalsService.getUserBalance(userId);
          const actualAmountToAdd = Math.min(amountToAdd, remainingToComplete, currentBalance);
          if (actualAmountToAdd > 0) {
            const balanceBeforeUpdate = await this.goalsService.getUserBalance(userId);
            if (balanceBeforeUpdate >= actualAmountToAdd) {
              await this.goalsService.updateGoal(goal.id, userId, {
                currentAmount: goal.currentAmount + actualAmountToAdd,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error auto-allocating to goals:', error);
    }
    return result;
  }

  private async createRecurringIncomes(
    parentId: string,
    userId: string,
    description: string,
    amount: number,
    photo?: string,
    interval: number = 1,
    daysCount: number = 30,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new Error('User not found');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + interval);
    const incomesToCreate: any[] = [];
    for (let i = 0; i < daysCount - 1; i++) {
      const transactionDate = new Date(startDate);
      transactionDate.setDate(startDate.getDate() + (i * interval));
      const incomeData: any = {
        user,
        description: description.trim(),
        amount: Math.abs(amount),
        date: transactionDate,
        isRecurring: true,
        recurrenceType: 'daily',
        recurrenceInterval: interval,
        parentTransactionId: parentId,
      };
      if (photo) incomeData.photo = photo;
      incomesToCreate.push(incomeData);
    }
    if (incomesToCreate.length > 0) {
      const incomes = this.incomeRepo.create(incomesToCreate);
      await this.incomeRepo.save(incomes);
    }
  }

  async getIncomes(userId: string) {
    return this.incomeRepo.find({
      where: { user: { id: userId } },
      order: { date: 'DESC' },
    });
  }

  async updateIncome(incomeId: string, userId: string, description?: string, note?: string) {
    const income = await this.incomeRepo.findOne({
      where: { id: incomeId, user: { id: userId } },
    });
    if (!income) throw new Error('Income not found');
    if (description !== undefined) income.description = description.trim();
    if (note !== undefined) income.note = note.trim() || undefined;
    return await this.incomeRepo.save(income);
  }

  async deleteIncome(incomeId: string, userId: string) {
    const income = await this.incomeRepo.findOne({
      where: { id: incomeId, user: { id: userId } },
    });
    if (!income) throw new Error('Income not found');
    if ((income as any).photo) {
      try {
        let photoPath = (income as any).photo;
        if (photoPath.includes('://')) {
          const match = photoPath.match(/\/uploads\/photos\/([^\/\?]+)/);
          photoPath = match?.[1] ?? photoPath.replace(/.*\/uploads\/photos\//, '');
        } else if (photoPath.includes('/uploads/photos/')) {
          photoPath = photoPath.replace(/.*\/uploads\/photos\//, '');
        } else if (photoPath.startsWith('uploads/photos/')) {
          photoPath = photoPath.replace('uploads/photos/', '');
        }
        if (photoPath && !photoPath.startsWith('http')) {
          const fullPath = join(process.cwd(), 'uploads', 'photos', photoPath);
          if (existsSync(fullPath)) unlinkSync(fullPath);
        }
      } catch (e) {
        console.error('Error deleting income photo:', e);
      }
    }
    try {
      const goals = await this.goalsService.getUserGoals(userId);
      const goalsWithAutoAllocate = goals.filter(g => g.autoAllocatePercent > 0 && g.autoAllocatePercent <= 100);
      for (const goal of goalsWithAutoAllocate) {
        const amountToRollback = Math.floor(income.amount * goal.autoAllocatePercent / 100);
        if (amountToRollback > 0) {
          const newCurrentAmount = Math.max(0, goal.currentAmount - amountToRollback);
          await this.goalsService.updateGoal(goal.id, userId, { currentAmount: newCurrentAmount });
        }
      }
    } catch (e) {
      console.error('Error rolling back goal allocation:', e);
    }
    await this.incomeRepo.remove(income);
    return { success: true };
  }
}
