import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense, EmotionLevel } from './expense.entity';
import { UsersService } from '../users/users.service';
import { BudgetsService } from '../budgets/budgets.service';
import { GoalsService } from '../goals/goals.service';
import { EmailService } from '../auth/email.service';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    private readonly usersService: UsersService,
    private readonly budgetsService: BudgetsService,
    private readonly goalsService: GoalsService,
    private readonly emailService: EmailService,
  ) {}

  /** Guess category from description (used by InsightsService and addExpense) */
  categorizeExpense(description: string): string {
    const desc = description.toLowerCase();
    if (desc.match(/food|eat|restaurant|cafe|coffee|курица|еда|ресторан|meal|pizza|burger|food|groceries|продукты|завтрак|обед|ужин/)) return 'Food & Dining';
    if (desc.match(/transport|taxi|bus|car|fuel|бензин|транспорт|metro|subway|train|flight|uber|drive/)) return 'Transportation';
    if (desc.match(/shopping|store|buy|покупка|clothes|одежда|shoes|магазин|mall/)) return 'Shopping';
    if (desc.match(/entertainment|movie|game|игра|развлечение|cinema|theater|concert|music|netflix|spotify/)) return 'Entertainment';
    if (desc.match(/bill|utility|internet|phone|счет|electricity|water|gas|rent|аренда|коммуналка/)) return 'Bills & Utilities';
    if (desc.match(/health|medical|doctor|pharmacy|лекарства|больница|лечение|medicine|hospital/)) return 'Health & Medical';
    if (desc.match(/education|school|university|course|курс|обучение|book|учебник|tuition/)) return 'Education';
    if (desc.match(/travel|vacation|trip|путешествие|hotel|отель|tourism|holiday/)) return 'Travel & Tourism';
    if (desc.match(/fitness|gym|sport|спорт|workout|exercise|тренировка|yoga/)) return 'Fitness & Sports';
    if (desc.match(/gift|present|подарок|donation|благотворительность|charity/)) return 'Gifts & Donations';
    return 'Other';
  }

  async addExpense(
    userId: string,
    description: string,
    amount: number,
    emotion: EmotionLevel = 'medium',
    photo?: string,
    category?: string,
    isRecurring?: boolean,
    recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly',
    recurrenceInterval?: number,
    recurrenceDaysCount?: number,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new Error('User not found');

    const absAmount = Math.abs(amount);
    const availableBalance = await this.goalsService.getUserBalance(userId);
    if (absAmount > availableBalance) {
      throw new Error(
        `Insufficient balance. Available: $${availableBalance.toFixed(2)}, requested: $${absAmount.toFixed(2)}`,
      );
    }

    const expenseData: any = {
      user,
      description: description.trim(),
      amount: Math.abs(amount),
      emotion,
    };
    if (photo) {
      if (photo.length > 13 * 1024 * 1024) throw new Error('Photo is too large. Maximum size is 10MB.');
      expenseData.photo = photo;
    }
    if (category && category.trim().length > 0) expenseData.category = category.trim();

    if (isRecurring && recurrenceType && recurrenceType !== 'once') {
      expenseData.isRecurring = true;
      expenseData.recurrenceType = recurrenceType;
      expenseData.recurrenceInterval = recurrenceInterval || 1;
      if (recurrenceType === 'daily' && recurrenceDaysCount) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + recurrenceDaysCount);
        expenseData.recurrenceEndDate = endDate;
      }
    } else {
      expenseData.isRecurring = false;
    }

    const expense = this.expenseRepo.create(expenseData);
    const savedExpense = await this.expenseRepo.save(expense);
    const result = Array.isArray(savedExpense) ? savedExpense[0] : savedExpense;

    if (isRecurring && recurrenceType === 'daily' && recurrenceDaysCount && recurrenceDaysCount > 1) {
      await this.createRecurringExpenses(
        result.id,
        userId,
        description,
        amount,
        emotion,
        photo,
        category,
        recurrenceInterval || 1,
        recurrenceDaysCount,
      );
    }

    try {
      const finalCategory = category || this.categorizeExpense(description);
      const budgets = await this.budgetsService.getUserBudgets(userId);
      const budgetsForCategory = budgets.filter(b => b.category === finalCategory);
      for (const budget of budgetsForCategory) {
        const budgetWithSpending = await this.budgetsService.getBudgetWithSpending(userId, budget.id);
        if (budgetWithSpending.isExceeded) {
          (result as any).budgetExceeded = {
            category: finalCategory,
            spending: budgetWithSpending.spending,
            limit: budget.limit,
            percentage: budgetWithSpending.percentage,
          };
          try {
            const u = await this.usersService.findById(userId);
            if (u?.email) {
              await this.emailService.sendBudgetWarningEmail(u.email, finalCategory, budgetWithSpending.spending, budget.limit, budgetWithSpending.percentage);
            }
          } catch (e) {
            console.error('Failed to send budget exceeded email:', e);
          }
        } else if (budgetWithSpending.percentage >= 80) {
          (result as any).budgetWarning = {
            category: finalCategory,
            spending: budgetWithSpending.spending,
            limit: budget.limit,
            percentage: budgetWithSpending.percentage,
          };
          try {
            const u = await this.usersService.findById(userId);
            if (u?.email) {
              await this.emailService.sendBudgetWarningEmail(u.email, finalCategory, budgetWithSpending.spending, budget.limit, budgetWithSpending.percentage);
            }
          } catch (e) {
            console.error('Failed to send budget warning email:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error checking budget:', error);
    }
    return result;
  }

  private async createRecurringExpenses(
    parentId: string,
    userId: string,
    description: string,
    amount: number,
    emotion: EmotionLevel,
    photo?: string,
    category?: string,
    interval: number = 1,
    daysCount: number = 30,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new Error('User not found');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + interval);
    const expensesToCreate: any[] = [];
    for (let i = 0; i < daysCount - 1; i++) {
      const transactionDate = new Date(startDate);
      transactionDate.setDate(startDate.getDate() + (i * interval));
      const expenseData: any = {
        user,
        description: description.trim(),
        amount: Math.abs(amount),
        emotion,
        date: transactionDate,
        isRecurring: true,
        recurrenceType: 'daily',
        recurrenceInterval: interval,
        parentTransactionId: parentId,
      };
      if (photo) expenseData.photo = photo;
      if (category?.trim()) expenseData.category = category.trim();
      expensesToCreate.push(expenseData);
    }
    if (expensesToCreate.length > 0) {
      const expenses = this.expenseRepo.create(expensesToCreate);
      await this.expenseRepo.save(expenses);
    }
  }

  async getExpenses(userId: string) {
    return this.expenseRepo.find({
      where: { user: { id: userId } },
      order: { date: 'DESC' },
    });
  }

  async updateExpense(
    expenseId: string,
    userId: string,
    updates: {
      description?: string;
      note?: string;
      amount?: number;
      emotion?: 'low' | 'medium' | 'high';
      category?: string;
      photo?: string;
    },
  ) {
    const expense = await this.expenseRepo.findOne({
      where: { id: expenseId, user: { id: userId } },
    });
    if (!expense) throw new Error('Expense not found');
    if (updates.description !== undefined) expense.description = updates.description.trim();
    if (updates.note !== undefined) expense.note = updates.note.trim() || undefined;
    if (updates.amount !== undefined && updates.amount >= 0) expense.amount = updates.amount;
    if (updates.emotion !== undefined) expense.emotion = updates.emotion;
    if (updates.category !== undefined) expense.category = updates.category.trim() || undefined;
    if (updates.photo !== undefined) expense.photo = updates.photo.trim() || undefined;
    return await this.expenseRepo.save(expense);
  }

  async deleteExpense(expenseId: string, userId: string) {
    const expense = await this.expenseRepo.findOne({
      where: { id: expenseId, user: { id: userId } },
    });
    if (!expense) throw new Error('Expense not found');
    if (expense.photo) {
      try {
        const match = expense.photo.match(/\/uploads\/photos\/([^\/\?]+)/);
        const filename = match?.[1] ?? expense.photo.split('/').pop()?.split('?')[0];
        if (filename && !filename.startsWith('http') && filename.includes('.')) {
          const fullPath = join(process.cwd(), 'uploads', 'photos', filename);
          if (existsSync(fullPath)) unlinkSync(fullPath);
        }
      } catch (e) {
        console.error('Error deleting expense photo:', e);
      }
    }
    await this.expenseRepo.remove(expense);
    return { success: true };
  }
}
