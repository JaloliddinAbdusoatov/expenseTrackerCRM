import { Injectable } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { IncomesService } from './incomes.service';
import { InsightsService } from './insights.service';
import { GoalsService } from '../goals/goals.service';
import { BudgetsService } from '../budgets/budgets.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { PdfService } from '../pdf/pdf.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly incomesService: IncomesService,
    private readonly insightsService: InsightsService,
    private readonly goalsService: GoalsService,
    private readonly budgetsService: BudgetsService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  async generateReport(
    userId: string,
    format: 'pdf' | 'excel' | 'html' | 'all',
    dateRange: string,
    includeCharts: boolean,
    sendToEmail: boolean,
    language: 'ru' | 'en' | 'ja' = 'en',
  ) {
    const [expenses, incomes, goals, budgets, balance] = await Promise.all([
      this.expensesService.getExpenses(userId),
      this.incomesService.getIncomes(userId),
      this.goalsService.getUserGoals(userId),
      this.budgetsService.getUserBudgets(userId),
      this.goalsService.getUserBalance(userId),
    ]);
    const validDateRanges = ['this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'];
    const finalDateRange = validDateRanges.includes(dateRange) ? dateRange : 'this_month';
    const insights = await this.insightsService.getInsights(userId, finalDateRange, 'spending', language);

    const emotionDist = insights.emotionDistribution || {
      happy: 0, neutral: 0, sad: 0,
      happyAmount: 0, neutralAmount: 0, sadAmount: 0,
    };

    const reportData = {
      period: insights.period || 'N/A',
      summary: {
        totalIncome: insights.totalIncome || 0,
        totalExpenses: insights.totalSpent || 0,
        balance: balance || 0,
        averageSpent: insights.averageSpent || 0,
        transactionCount: insights.totalExpenses ?? 0,
      },
      categories: insights.topCategories || [],
      emotions: emotionDist,
      goals: goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        progress: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
      })),
      budgets: budgets.length > 0 ? await Promise.all(
        budgets.map(async (b) => {
          try {
            const bw = await this.budgetsService.getBudgetWithSpending(userId, b.id);
            return {
              category: b.category,
              limit: b.limit,
              spending: bw.spending || 0,
              percentage: bw.percentage || 0,
              isExceeded: bw.isExceeded || false,
            };
          } catch {
            return { category: b.category, limit: b.limit, spending: 0, percentage: 0, isExceeded: false };
          }
        })
      ) : [],
      recentTransactions: expenses.slice(0, 20).map(e => ({
        description: e.description,
        amount: e.amount,
        category: e.category || this.expensesService.categorizeExpense(e.description),
        emotion: e.emotion,
        date: e.date,
      })),
    };

    const user = await this.usersService.findById(userId);
    const userName = user?.username || user?.email || 'User';
    const aiGeneratedReport = this.generateReportAnalysis(reportData, language, userName);

    const reportFiles: { format: string; content: string; filename: string }[] = [];

    if (format === 'html' || format === 'all') {
      const htmlReport = this.generateHTMLReport(reportData, aiGeneratedReport, includeCharts, language);
      reportFiles.push({
        format: 'html',
        content: Buffer.from(htmlReport, 'utf-8').toString('base64'),
        filename: `financial-report-${dateRange}-${Date.now()}.html`,
      });
    }
    if (format === 'pdf' || format === 'all') {
      const html = this.generateHTMLReport(reportData, aiGeneratedReport, includeCharts, language, true);
      const pdfBase64 = await this.pdfService.htmlToPdf(html);
      reportFiles.push({
        format: 'pdf',
        content: pdfBase64,
        filename: `financial-report-${dateRange}-${Date.now()}.pdf`,
      });
    }
    if (format === 'excel' || format === 'all') {
      const xlsxBase64 = await this.generateExcelReport(reportData, aiGeneratedReport, language);
      reportFiles.push({
        format: 'excel',
        content: xlsxBase64,
        filename: `financial-report-${dateRange}-${Date.now()}.xlsx`,
      });
    }

    if (sendToEmail && user?.email) {
      await this.emailService.sendReportEmail(
        user.email,
        reportFiles.map(f => ({ format: f.format, filename: f.filename, content: f.content })),
        dateRange,
        language,
      );
    }

    return {
      success: true,
      message: language === 'ru'
        ? `Отчет успешно сгенерирован! ${sendToEmail ? 'Отправлен на email.' : 'Готов к скачиванию.'}`
        : language === 'ja'
        ? `レポートが正常に生成されました！${sendToEmail ? 'メールに送信されました。' : 'ダウンロード準備ができました。'}`
        : `Report generated successfully! ${sendToEmail ? 'Sent to email.' : 'Ready for download.'}`,
      files: reportFiles.map(f => ({
        format: f.format,
        filename: f.filename,
        content: f.content,
        mimeType: f.format === 'pdf' ? 'application/pdf' : f.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/html',
      })),
    };
  }

  private generateReportAnalysis(data: any, language: 'ru' | 'en' | 'ja', userName: string): string {
    const topCategory = data.categories?.length > 0 ? data.categories[0] : null;
    const savingsRate = data.summary?.totalIncome > 0
      ? ((data.summary.totalIncome - data.summary.totalExpenses) / data.summary.totalIncome * 100).toFixed(1)
      : '0';

    const ru = `Финансовый анализ за период ${data.period || 'N/A'}\n\n📊 ОБЩАЯ СТАТИСТИКА:\nЗа этот период вы получили доход в размере $${(data.summary?.totalIncome || 0).toFixed(2)} и потратили $${(data.summary?.totalExpenses || 0).toFixed(2)}.\n${(data.summary?.balance || 0) >= 0 ? `Ваш текущий баланс составляет $${(data.summary?.balance || 0).toFixed(2)}.` : `Ваш баланс отрицательный: $${Math.abs(data.summary?.balance || 0).toFixed(2)}.`}\nСредний размер транзакции: $${(data.summary?.averageSpent || 0).toFixed(2)}.\n\n${topCategory ? `💰 САМАЯ ЗАТРАТНАЯ КАТЕГОРИЯ: ${topCategory.name} ($${(topCategory.amount || 0).toFixed(2)})` : ''}\n\n${data.goals?.length > 0 ? `\n🎯 ЦЕЛИ:\n${data.goals.map((g: any) => `- ${g.name}: ${g.progress}% выполнено ($${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)})`).join('\n')}` : ''}\n\n${data.budgets?.length > 0 ? `\n📋 БЮДЖЕТЫ:\n${data.budgets.map((b: any) => `- ${b.category}: ${b.percentage.toFixed(1)}% использовано ${b.isExceeded ? '⚠️ ПРЕВЫШЕН' : ''}`).join('\n')}` : ''}\n\n💡 РЕКОМЕНДАЦИИ:\n${parseFloat(savingsRate) > 20 ? 'Отличная работа! Вы откладываете более 20% дохода.' : parseFloat(savingsRate) > 0 ? 'Хорошо! Продолжайте в том же духе.' : 'Рекомендуем увеличить доходы или сократить расходы для достижения положительного баланса.'}\n${topCategory && (topCategory.amount || 0) > (data.summary?.totalExpenses || 0) * 0.3 ? `Обратите внимание на категорию "${topCategory.name}" - она составляет значительную часть ваших расходов.` : ''}`;

    const en = `Financial Analysis for period ${data.period || 'N/A'}\n\n📊 SUMMARY:\nDuring this period, you earned $${(data.summary?.totalIncome || 0).toFixed(2)} and spent $${(data.summary?.totalExpenses || 0).toFixed(2)}.\n${(data.summary?.balance || 0) >= 0 ? `Your current balance is $${(data.summary?.balance || 0).toFixed(2)}.` : `Your balance is negative: $${Math.abs(data.summary?.balance || 0).toFixed(2)}.`}\nAverage transaction size: $${(data.summary?.averageSpent || 0).toFixed(2)}.\n\n${topCategory ? `💰 TOP SPENDING CATEGORY: ${topCategory.name} ($${(topCategory.amount || 0).toFixed(2)})` : ''}\n\n${data.goals?.length > 0 ? `\n🎯 GOALS:\n${data.goals.map((g: any) => `- ${g.name}: ${g.progress}% complete ($${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)})`).join('\n')}` : ''}\n\n${data.budgets?.length > 0 ? `\n📋 BUDGETS:\n${data.budgets.map((b: any) => `- ${b.category}: ${b.percentage.toFixed(1)}% used ${b.isExceeded ? '⚠️ EXCEEDED' : ''}`).join('\n')}` : ''}\n\n💡 RECOMMENDATIONS:\n${parseFloat(savingsRate) > 20 ? 'Great job! You are saving more than 20% of your income.' : parseFloat(savingsRate) > 0 ? 'Good! Keep it up.' : 'We recommend increasing income or reducing expenses to achieve a positive balance.'}\n${topCategory && (topCategory.amount || 0) > (data.summary?.totalExpenses || 0) * 0.3 ? `Pay attention to the "${topCategory.name}" category - it accounts for a significant portion of your expenses.` : ''}`;

    const ja = `期間 ${data.period || 'N/A'} の財務分析\n\n📊 概要:\nこの期間中、あなたは $${(data.summary?.totalIncome || 0).toFixed(2)} を獲得し、$${(data.summary?.totalExpenses || 0).toFixed(2)} を支出しました。\n${(data.summary?.balance || 0) >= 0 ? `現在の残高は $${(data.summary?.balance || 0).toFixed(2)} です。` : `残高は負の値です: $${Math.abs(data.summary?.balance || 0).toFixed(2)}。`}\n平均取引サイズ: $${(data.summary?.averageSpent || 0).toFixed(2)}。\n\n${topCategory ? `💰 トップ支出カテゴリ: ${topCategory.name} ($${(topCategory.amount || 0).toFixed(2)})` : ''}\n\n${data.goals?.length > 0 ? `\n🎯 目標:\n${data.goals.map((g: any) => `- ${g.name}: ${g.progress}% 完了 ($${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)})`).join('\n')}` : ''}\n\n${data.budgets?.length > 0 ? `\n📋 予算:\n${data.budgets.map((b: any) => `- ${b.category}: ${b.percentage.toFixed(1)}% 使用 ${b.isExceeded ? '⚠️ 超過' : ''}`).join('\n')}` : ''}\n\n💡 推奨事項:\n${parseFloat(savingsRate) > 20 ? '素晴らしい！収入の20%以上を節約しています。' : parseFloat(savingsRate) > 0 ? '良いですね！続けましょう。' : '正の残高を達成するために、収入を増やすか支出を減らすことをお勧めします。'}\n${topCategory && (topCategory.amount || 0) > (data.summary?.totalExpenses || 0) * 0.3 ? `「${topCategory.name}」カテゴリに注意してください - これは支出の大部分を占めています。` : ''}`;

    return language === 'ru' ? ru : language === 'ja' ? ja : en;
  }

  private generateHTMLReport(data: any, aiAnalysis: string, includeCharts: boolean, language: 'ru' | 'en' | 'ja', forPrint = false): string {
    const lang = {
      ru: { title: 'Финансовый отчет', period: 'Период', summary: 'Сводка', categories: 'Категории', goals: 'Цели', budgets: 'Бюджеты', analysis: 'Анализ и рекомендации' },
      en: { title: 'Financial Report', period: 'Period', summary: 'Summary', categories: 'Categories', goals: 'Goals', budgets: 'Budgets', analysis: 'Analysis & Recommendations' },
      ja: { title: '財務レポート', period: '期間', summary: '概要', categories: 'カテゴリ', goals: '目標', budgets: '予算', analysis: '分析と推奨事項' },
    }[language];

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lang.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 8px; }
    h1 { color: #6366f1; margin-bottom: 10px; font-size: 32px; }
    .period { color: #666; margin-bottom: 30px; font-size: 16px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
    .summary-card { color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .summary-card.income { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .summary-card.expense { background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); }
    .summary-card.balance { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .summary-card h3 { font-size: 14px; opacity: 0.9; margin-bottom: 10px; }
    .summary-card .amount { font-size: 28px; font-weight: bold; }
    .section { margin: 40px 0; }
    .section h2 { color: #333; margin-bottom: 20px; font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #333; }
    .progress-bar { width: 100%; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 5px 0; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); }
    .progress-fill.exceeded { background: linear-gradient(90deg, #ee0979 0%, #ff6a00 100%); }
    .analysis { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; white-space: pre-wrap; margin: 20px 0; }
    .chart-placeholder { background: #f8f9fa; padding: 40px; text-align: center; border-radius: 8px; margin: 20px 0; color: #666; }
    @media print { body { background: white; padding: 0; margin: 0; } .container { box-shadow: none; margin: 0; padding: 20px; } .no-print { display: none; } }
    ${forPrint ? `@page { margin: 1cm; size: A4; } body { background: white; padding: 0; } .container { padding: 20px; }` : ''}
  </style>
</head>
<body>
  <div class="container">
    <h1>${lang.title}</h1>
    <p class="period">${lang.period}: ${data.period}</p>
    <div class="summary-grid">
      <div class="summary-card income"><h3>${language === 'ru' ? 'Доходы' : language === 'ja' ? '収入' : 'Income'}</h3><div class="amount">$${Number(data.summary?.totalIncome ?? 0).toFixed(2)}</div></div>
      <div class="summary-card expense"><h3>${language === 'ru' ? 'Расходы' : language === 'ja' ? '支出' : 'Expenses'}</h3><div class="amount">$${Number(data.summary?.totalExpenses ?? 0).toFixed(2)}</div></div>
      <div class="summary-card balance"><h3>${language === 'ru' ? 'Баланс' : language === 'ja' ? '残高' : 'Balance'}</h3><div class="amount">$${Number(data.summary?.balance ?? 0).toFixed(2)}</div></div>
    </div>
    <div class="section">
      <h2>${lang.categories}</h2>
      <table><thead><tr><th>${language === 'ru' ? 'Категория' : language === 'ja' ? 'カテゴリ' : 'Category'}</th><th>${language === 'ru' ? 'Сумма' : language === 'ja' ? '金額' : 'Amount'}</th><th>${language === 'ru' ? 'Транзакций' : language === 'ja' ? '取引数' : 'Transactions'}</th></tr></thead>
      <tbody>${(data.categories || []).slice(0, 10).map((c: any) => `<tr><td>${c.name}</td><td>$${Number(c.amount).toFixed(2)}</td><td>${c.count ?? '-'}</td></tr>`).join('')}</tbody></table>
    </div>
    ${(data.goals || []).length > 0 ? `<div class="section"><h2>${lang.goals}</h2><table><thead><tr><th>${language === 'ru' ? 'Цель' : language === 'ja' ? '目標' : 'Goal'}</th><th>${language === 'ru' ? 'Прогресс' : language === 'ja' ? '進捗' : 'Progress'}</th><th>${language === 'ru' ? 'Статус' : language === 'ja' ? 'ステータス' : 'Status'}</th></tr></thead><tbody>${data.goals.map((g: any) => `<tr><td>${g.name}</td><td><div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(100, g.progress)}%"></div></div><small>$${Number(g.currentAmount).toFixed(2)} / $${Number(g.targetAmount).toFixed(2)} (${g.progress}%)</small></td><td>${g.progress >= 100 ? '✓' : '…'}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${(data.budgets || []).length > 0 ? `<div class="section"><h2>${lang.budgets}</h2><table><thead><tr><th>${language === 'ru' ? 'Категория' : language === 'ja' ? 'カテゴリ' : 'Category'}</th><th>${language === 'ru' ? 'Потрачено / Лимит' : language === 'ja' ? '支出 / 予算' : 'Spent / Limit'}</th><th>${language === 'ru' ? 'Прогресс' : language === 'ja' ? '進捗' : 'Progress'}</th></tr></thead><tbody>${data.budgets.map((b: any) => `<tr><td>${b.category}</td><td>$${Number(b.spending).toFixed(2)} / $${Number(b.limit).toFixed(2)}</td><td><div class="progress-bar"><div class="progress-fill ${b.isExceeded ? 'exceeded' : ''}" style="width: ${Math.min(100, b.percentage)}%"></div></div><small>${Number(b.percentage).toFixed(1)}%${b.isExceeded ? ' ⚠' : ''}</small></td></tr>`).join('')}</tbody></table></div>` : ''}
    ${includeCharts ? `<div class="section"><h2>${language === 'ru' ? 'Визуализация' : language === 'ja' ? '可視化' : 'Visualization'}</h2><div class="chart-placeholder">${language === 'ru' ? 'Графики отображаются в браузере' : language === 'ja' ? 'グラフはブラウザで表示' : 'Charts displayed in browser'}</div></div>` : ''}
    <div class="section"><h2>${lang.analysis}</h2><div class="analysis">${aiAnalysis}</div></div>
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">${language === 'ru' ? 'Сгенерировано EmotionFlow' : language === 'ja' ? 'EmotionFlowによって生成' : 'Generated by EmotionFlow'} - ${new Date().toLocaleDateString()}</footer>
  </div>
</body>
</html>`;
  }

  private async generateExcelReport(data: any, aiAnalysis: string, language: 'ru' | 'en' | 'ja'): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');
    sheet.addRow(['Financial Report', data.period || '']);
    sheet.addRow([]);
    sheet.addRow(['SUMMARY']);
    sheet.addRow(['Total Income', data.summary?.totalIncome ?? 0]);
    sheet.addRow(['Total Expenses', data.summary?.totalExpenses ?? 0]);
    sheet.addRow(['Balance', data.summary?.balance ?? 0]);
    sheet.addRow(['Average Spent', data.summary?.averageSpent ?? 0]);
    sheet.addRow(['Transaction Count', data.summary?.transactionCount ?? 0]);
    sheet.addRow([]);
    sheet.addRow(['TOP CATEGORIES']);
    sheet.addRow(['Category', 'Amount', 'Transactions', 'Happy', 'Neutral', 'Sad']);
    (data.categories || []).forEach((c: any) => {
      sheet.addRow([c.name, c.amount, c.count, c.happy || 0, c.neutral || 0, c.sad || 0]);
    });
    sheet.addRow([]);
    sheet.addRow(['GOALS']);
    sheet.addRow(['Goal', 'Current Amount', 'Target Amount', 'Progress %', 'Status']);
    (data.goals || []).forEach((g: any) => {
      sheet.addRow([g.name, g.currentAmount, g.targetAmount, g.progress, g.progress >= 100 ? 'Completed' : 'In Progress']);
    });
    sheet.addRow([]);
    sheet.addRow(['BUDGETS']);
    sheet.addRow(['Category', 'Spending', 'Limit', 'Percentage', 'Status']);
    (data.budgets || []).forEach((b: any) => {
      sheet.addRow([b.category, b.spending, b.limit, b.percentage, b.isExceeded ? 'Exceeded' : 'Within Limit']);
    });
    sheet.addRow([]);
    sheet.addRow(['ANALYSIS']);
    sheet.addRow([aiAnalysis]);
    sheet.columns.forEach((column) => {
      if (!column || typeof (column as any).eachCell !== 'function') return;
      let maxLength = 10;
      (column as any).eachCell({ includeEmpty: true }, (cell: any) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        if (cellValue.length > maxLength) maxLength = cellValue.length;
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
