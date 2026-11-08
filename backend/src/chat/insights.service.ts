import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from './expense.entity';
import { Income } from './income.entity';
import { ExpensesService } from './expenses.service';
import { startOfMonth, endOfMonth, subMonths, format, startOfYear, endOfYear } from 'date-fns';

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Income)
    private readonly incomeRepo: Repository<Income>,
    private readonly expensesService: ExpensesService,
  ) {}

  async getInsights(userId: string, dateRange: string, focus?: string, language: 'ru' | 'en' | 'ja' = 'en') {
    let startDate: Date;
    let endDate: Date = new Date();
    switch (dateRange) {
      case 'this_month':
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case 'last_month':
        startDate = startOfMonth(subMonths(new Date(), 1));
        endDate = endOfMonth(subMonths(new Date(), 1));
        break;
      case 'last_3_months':
        startDate = startOfMonth(subMonths(new Date(), 3));
        endDate = endOfMonth(new Date());
        break;
      case 'this_year':
        startDate = startOfYear(new Date());
        endDate = endOfYear(new Date());
        break;
      case 'all_time':
        startDate = new Date(0);
        break;
      default:
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
    }

    const [expenses, incomes] = await Promise.all([
      this.expenseRepo.find({
        where: { user: { id: userId }, date: Between(startDate, endDate) },
      }),
      this.incomeRepo.find({
        where: { user: { id: userId }, date: Between(startDate, endDate) },
      }),
    ]);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const avgAmount = expenses.length > 0 ? totalSpent / expenses.length : 0;

    const categories: Record<string, { total: number; happy: number; neutral: number; sad: number; count: number }> = {};
    expenses.forEach((e) => {
      const cat = e.category || this.expensesService.categorizeExpense(e.description);
      if (!categories[cat]) categories[cat] = { total: 0, happy: 0, neutral: 0, sad: 0, count: 0 };
      categories[cat].total += e.amount;
      categories[cat].count += 1;
      if (e.emotion === 'high') categories[cat].happy += e.amount;
      else if (e.emotion === 'low') categories[cat].sad += e.amount;
      else categories[cat].neutral += e.amount;
    });

    const emotions = {
      low: expenses.filter((e) => e.emotion === 'low').length,
      medium: expenses.filter((e) => e.emotion === 'medium').length,
      high: expenses.filter((e) => e.emotion === 'high').length,
      lowAmount: expenses.filter((e) => e.emotion === 'low').reduce((s, e) => s + e.amount, 0),
      mediumAmount: expenses.filter((e) => e.emotion === 'medium').reduce((s, e) => s + e.amount, 0),
      highAmount: expenses.filter((e) => e.emotion === 'high').reduce((s, e) => s + e.amount, 0),
    };

    const topCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10)
      .map(([name, data]) => ({
        name,
        amount: data.total,
        count: data.count,
        happy: data.happy,
        neutral: data.neutral,
        sad: data.sad,
        happyPercent: data.total > 0 ? Math.round((data.happy / data.total) * 100) : 0,
        sadPercent: data.total > 0 ? Math.round((data.sad / data.total) * 100) : 0,
      }));

    return {
      dateRange,
      period: `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`,
      totalExpenses: expenses.length,
      totalIncome,
      totalSpent,
      balance: totalIncome - totalSpent,
      averageSpent: Math.round(avgAmount * 100) / 100,
      topCategories,
      categoryBreakdown: categories,
      emotionDistribution: emotions,
      recentExpenses: expenses.slice(0, 10).map(e => ({
        description: e.description,
        amount: e.amount,
        emotion: e.emotion,
        category: e.category || this.expensesService.categorizeExpense(e.description),
        date: e.date,
      })),
      insights: this.generateInsightsText(expenses, totalSpent, topCategories, emotions, focus, totalIncome, language),
    };
  }

  async getEmotions(userId: string, from?: string, to?: string) {
    const where: any = { user: { id: userId } };
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
        where.date = Between(fromDate, toDate);
      }
    }
    const expenses = await this.expenseRepo.find({ where });
    const emotionData: Record<string, { happy: number; neutral: number; sad: number }> = {};
    expenses.forEach((expense) => {
      const category = expense.category || this.expensesService.categorizeExpense(expense.description);
      if (!emotionData[category]) emotionData[category] = { happy: 0, neutral: 0, sad: 0 };
      if (expense.emotion === 'high') emotionData[category].happy += expense.amount;
      else if (expense.emotion === 'medium') emotionData[category].neutral += expense.amount;
      else emotionData[category].sad += expense.amount;
    });
    return Object.entries(emotionData)
      .map(([name, emotions]) => ({ name, ...emotions, total: emotions.happy + emotions.neutral + emotions.sad }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  private generateInsightsText(
    expenses: Expense[],
    totalSpent: number,
    topCategories: Array<{ name: string; amount: number; count: number; happyPercent: number; sadPercent: number }>,
    emotions: { low: number; medium: number; high: number; lowAmount: number; mediumAmount: number; highAmount: number },
    focus?: string,
    totalIncome?: number,
    language: 'ru' | 'en' | 'ja' = 'en',
  ): string {
    const insights: string[] = [];
    const translations = {
      ru: {
        emotionalAnalysis: 'Анализ эмоциональных трат:',
        totalSpending: (amount: string, count: number) => `Общая сумма трат: ${amount} за ${count} транзакций.`,
        emotionalDistribution: (happy: string, neutral: string, sad: string) => `Эмоциональное распределение: ${happy}% радостных, ${neutral}% нейтральных, ${sad}% грустных/сожалеющих.`,
        happySpending: (amount: string, percent: string) => `Радостные траты: ${amount} (${percent}%),`,
        sadSpending: (amount: string, percent: string) => `Грустные/сожалеющие траты: ${amount} (${percent}%).`,
        categoryPatterns: 'Эмоциональные паттерны по категориям:',
        morePositive: (name: string, happy: string, sad: string) => `- ${name}: Больше положительных эмоций (${happy}% радостных vs ${sad}% грустных)`,
        moreNegative: (name: string, sad: string, happy: string) => `- ${name}: Больше отрицательных эмоций (${sad}% грустных vs ${happy}% радостных)`,
        satisfyingExpenses: (percent: string) => `${percent}% ваших трат были удовлетворительными.`,
        regretfulPurchases: (count: number) => `Рекомендуется пересмотреть ${count} сожалеющих покупок.`,
      },
      en: {
        emotionalAnalysis: 'Emotional Spending Analysis:',
        totalSpending: (amount: string, count: number) => `Total spending: ${amount} across ${count} transactions.`,
        emotionalDistribution: (happy: string, neutral: string, sad: string) => `Emotional distribution: ${happy}% happy, ${neutral}% neutral, ${sad}% sad/regretful.`,
        happySpending: (amount: string, percent: string) => `Happy spending: ${amount} (${percent}%),`,
        sadSpending: (amount: string, percent: string) => `Sad/regretful spending: ${amount} (${percent}%).`,
        categoryPatterns: 'Category emotional patterns:',
        morePositive: (name: string, happy: string, sad: string) => `- ${name}: More positive emotions (${happy}% happy vs ${sad}% sad)`,
        moreNegative: (name: string, sad: string, happy: string) => `- ${name}: More negative emotions (${sad}% sad vs ${happy}% happy)`,
        satisfyingExpenses: (percent: string) => `${percent}% of your expenses were satisfying.`,
        regretfulPurchases: (count: number) => `Consider reviewing ${count} regretful purchases.`,
      },
      ja: {
        emotionalAnalysis: '感情的支出分析：',
        totalSpending: (amount: string, count: number) => `総支出：${count}件の取引で${amount}。`,
        emotionalDistribution: (happy: string, neutral: string, sad: string) => `感情分布：${happy}%喜び、${neutral}%中性、${sad}%悲しみ/後悔。`,
        happySpending: (amount: string, percent: string) => `喜びの支出：${amount}（${percent}%）、`,
        sadSpending: (amount: string, percent: string) => `悲しみ/後悔の支出：${amount}（${percent}%）。`,
        categoryPatterns: 'カテゴリ別感情パターン：',
        morePositive: (name: string, happy: string, sad: string) => `- ${name}：より肯定的な感情（${happy}%喜び vs ${sad}%悲しみ）`,
        moreNegative: (name: string, sad: string, happy: string) => `- ${name}：より否定的な感情（${sad}%悲しみ vs ${happy}%喜び）`,
        satisfyingExpenses: (percent: string) => `あなたの支出の${percent}%が満足のいくものでした。`,
        regretfulPurchases: (count: number) => `${count}件の後悔の購入を検討してください。`,
      },
    };
    const t = translations[language];

    if (focus === 'emotions') {
      insights.push(t.emotionalAnalysis);
      insights.push(t.totalSpending(`$${totalSpent.toFixed(2)}`, expenses.length));
      const totalEmotions = emotions.low + emotions.medium + emotions.high;
      if (totalEmotions > 0) {
        const happyPercent = (emotions.high / totalEmotions) * 100;
        const neutralPercent = (emotions.medium / totalEmotions) * 100;
        const sadPercent = (emotions.low / totalEmotions) * 100;
        insights.push(t.emotionalDistribution(happyPercent.toFixed(1), neutralPercent.toFixed(1), sadPercent.toFixed(1)));
      }
      const totalEmotionAmount = emotions.lowAmount + emotions.mediumAmount + emotions.highAmount;
      if (totalEmotionAmount > 0) {
        const happyAmountPercent = (emotions.highAmount / totalEmotionAmount) * 100;
        const sadAmountPercent = (emotions.lowAmount / totalEmotionAmount) * 100;
        insights.push(t.happySpending(`$${emotions.highAmount.toFixed(2)}`, happyAmountPercent.toFixed(1)) + ' ' + t.sadSpending(`$${emotions.lowAmount.toFixed(2)}`, sadAmountPercent.toFixed(1)));
      }
      if (topCategories.length > 0) {
        insights.push(t.categoryPatterns);
        topCategories.slice(0, 5).forEach(cat => {
          if (cat.happyPercent > cat.sadPercent) insights.push(t.morePositive(cat.name, cat.happyPercent.toFixed(0), cat.sadPercent.toFixed(0)));
          else if (cat.sadPercent > cat.happyPercent) insights.push(t.moreNegative(cat.name, cat.sadPercent.toFixed(0), cat.happyPercent.toFixed(0)));
        });
      }
    } else if (focus === 'spending' || !focus) {
      insights.push(`Total spent: $${totalSpent.toFixed(2)} across ${expenses.length} transactions.`);
      if (topCategories.length > 0) insights.push(`Top spending category: ${topCategories[0].name} ($${topCategories[0].amount.toFixed(2)}).`);
      if (totalIncome) insights.push(`Savings rate: ${(((totalIncome - totalSpent) / totalIncome) * 100).toFixed(1)}%`);
    }
    if (focus === 'emotions' || !focus) {
      const totalEmotions = emotions.low + emotions.medium + emotions.high;
      if (totalEmotions > 0) {
        const happyRatio = (emotions.high / totalEmotions) * 100;
        if (happyRatio >= 50) insights.push(t.satisfyingExpenses(happyRatio.toFixed(0)));
        if (emotions.low > 0) insights.push(t.regretfulPurchases(emotions.low));
      }
    }
    return insights.join(' ');
  }
}
