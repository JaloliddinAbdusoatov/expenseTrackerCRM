import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Expense } from './expense.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async getCategories(userId: string) {
    const expenses = await this.expenseRepo.find({
      where: { user: { id: userId } },
      select: ['category'],
    });
    const categories = new Set<string>();
    const categoryCounts: Record<string, number> = {};
    expenses.forEach(expense => {
      if (expense.category) {
        categories.add(expense.category);
        categoryCounts[expense.category] = (categoryCounts[expense.category] || 0) + 1;
      }
    });
    return Array.from(categories)
      .map(category => ({ name: category, count: categoryCounts[category] || 0 }))
      .sort((a, b) => b.count - a.count);
  }

  async renameCategory(userId: string, oldCategory: string, newCategory: string) {
    const expenses = await this.expenseRepo.find({
      where: { user: { id: userId }, category: oldCategory },
    });
    if (expenses.length === 0) throw new Error('Category not found or has no transactions');
    expenses.forEach(e => { e.category = newCategory; });
    await this.expenseRepo.save(expenses);
    return { success: true, updated: expenses.length };
  }

  async mergeCategories(userId: string, sourceCategory: string, targetCategory: string) {
    if (sourceCategory === targetCategory) throw new Error('Source and target categories cannot be the same');
    const expenses = await this.expenseRepo.find({
      where: { user: { id: userId }, category: sourceCategory },
    });
    if (expenses.length === 0) throw new Error('Source category not found or has no transactions');
    expenses.forEach(e => { e.category = targetCategory; });
    await this.expenseRepo.save(expenses);
    return { success: true, merged: expenses.length };
  }

  async updateTransactionCategory(userId: string, transactionIds: string[], newCategory: string) {
    const expenses = await this.expenseRepo.find({
      where: { user: { id: userId }, id: In(transactionIds) },
    });
    if (expenses.length === 0) throw new Error('No transactions found');
    expenses.forEach(e => { e.category = newCategory; });
    await this.expenseRepo.save(expenses);
    return { success: true, updated: expenses.length };
  }
}
