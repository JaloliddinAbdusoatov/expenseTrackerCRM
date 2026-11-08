import React, { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, LineChart, Line, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { emotionsApi, chatApi, expensesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/currency';
import { convertFromUsd } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Sparkles, Filter } from 'lucide-react';
import { DateRangeFilter } from '@/components/date-range-filter';
import { CategoryManagement } from '@/components/category-management';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function EmotionsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const activeCurrency = user?.currency || 'USD';
  const fc = (value: number) => formatCurrency(Number(value || 0), activeCurrency, language);
  const toDisplayAmount = (value: number) => convertFromUsd(Number(value || 0), activeCurrency);
  const formatDisplayCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : language === 'ja' ? 'ja-JP' : 'en-US', {
      style: 'currency',
      currency: activeCurrency,
      maximumFractionDigits: activeCurrency === 'JPY' ? 0 : 2,
      minimumFractionDigits: activeCurrency === 'JPY' ? 0 : 2,
    }).format(Number(value || 0));
  const axisTickFormatter = (value: number) =>
    new Intl.NumberFormat(language, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Number(value || 0));
  const [chartData, setChartData] = React.useState<Array<{ name: string; happy: number; neutral: number; sad: number }>>([]);
  const [incomes, setIncomes] = React.useState<Array<{ date: string; amount: number }>>([]);
  const [expenses, setExpenses] = React.useState<Array<{ date: string; amount: number; emotion: 'low' | 'medium' | 'high' }>>([]);
  const [aiInsights, setAiInsights] = React.useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [categoryManagementOpen, setCategoryManagementOpen] = React.useState(false);
  const [selectedCategoryForManagement, setSelectedCategoryForManagement] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }));
  const chartTooltipProps = {
    cursor: false,
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '10px',
      boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
      color: 'hsl(var(--foreground))',
    },
    itemStyle: { color: 'hsl(var(--foreground))' },
    labelStyle: { color: 'hsl(var(--muted-foreground))' },
  } as const;

  React.useEffect(() => {
    if (user?.id) {
      loadEmotions();
    }
  }, [user?.id, dateRange.from, dateRange.to]);

  const loadEmotions = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const from = dateRange.from?.toISOString();
      const to = dateRange.to?.toISOString();
      const [emotionsData, incomesData, expensesData] = await Promise.all([
        emotionsApi.getEmotions(user.id, from, to),
        expensesApi.getIncomes(user.id).catch(() => []),
        expensesApi.getExpenses(user.id).catch(() => []),
      ]);

      setChartData(emotionsData);
      setIncomes(
        (incomesData || []).map((income: any) => ({
          date: income.date,
          amount: income.amount,
        })),
      );
      setExpenses(
        (expensesData || []).map((expense: any) => ({
          date: expense.date,
          amount: expense.amount,
          emotion: expense.emotion as 'low' | 'medium' | 'high',
        })),
      );
    } catch (error: any) {
      console.error('Failed to load emotions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIInsights = async () => {
    if (!user?.id) return;
    try {
      setIsLoadingInsights(true);
      const response = await chatApi.sendMessage(
        user.id, 
        t('emotions.analyzePrompt'),
        language,
        'emotions'
      );
      setAiInsights(response.message);
    } catch (error: any) {
      console.error('Failed to generate insights:', error);
      setAiInsights(t('emotions.failedToGenerate'));
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const incomeExpenseChartData = useMemo(() => {
    let filteredIncomes = incomes || [];
    let filteredExpenses = expenses || [];

    if (dateRange.from && dateRange.to) {
      filteredIncomes = (incomes || []).filter((income) => {
        const date = new Date(income.date);
        if (Number.isNaN(date.getTime())) return false;
        return date >= dateRange.from! && date <= dateRange.to!;
      });
      filteredExpenses = (expenses || []).filter((expense) => {
        const date = new Date(expense.date);
        if (Number.isNaN(date.getTime())) return false;
        return date >= dateRange.from! && date <= dateRange.to!;
      });
    }

    const byDay: Record<string, { income: number; expense: number }> = {};

    filteredIncomes.forEach((income) => {
      const date = new Date(income.date);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      if (!byDay[key]) {
        byDay[key] = { income: 0, expense: 0 };
      }
      byDay[key].income += income.amount;
    });

    filteredExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      if (!byDay[key]) {
        byDay[key] = { income: 0, expense: 0 };
      }
      byDay[key].expense += expense.amount;
    });

    if (Object.keys(byDay).length === 0) return [];

    return Object.entries(byDay)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, data]) => {
        const date = new Date(key);
        return {
          name: date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          income: data.income,
          expense: data.expense,
        };
      });
  }, [incomes, expenses, dateRange.from, dateRange.to]);

  const emotionTimelineData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    let filteredExpenses = expenses;
    if (dateRange.from && dateRange.to) {
      filteredExpenses = expenses.filter((expense) => {
        const date = new Date(expense.date);
        if (Number.isNaN(date.getTime())) return false;
        return date >= dateRange.from! && date <= dateRange.to!;
      });
    }

    if (filteredExpenses.length === 0) return [];

    const byDay: Record<string, { happy: number; neutral: number; sad: number }> = {};

    filteredExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      if (Number.isNaN(date.getTime())) return;

      const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!byDay[key]) {
        byDay[key] = { happy: 0, neutral: 0, sad: 0 };
      }

      const amount = expense.amount;
      if (expense.emotion === 'high') {
        byDay[key].happy += amount;
      } else if (expense.emotion === 'medium') {
        byDay[key].neutral += amount;
      } else {
        byDay[key].sad += amount;
      }
    });

    return Object.entries(byDay)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, data]) => {
        const date = new Date(key);
        return {
          name: date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          happy: data.happy,
          neutral: data.neutral,
          sad: data.sad,
        };
      });
  }, [expenses, dateRange.from, dateRange.to]);

  const spendingByEmotionDisplayData = useMemo(
    () =>
      chartData
        .filter((item) => item.name !== 'Income')
        .map((item) => ({
          ...item,
          happy: toDisplayAmount(item.happy),
          neutral: toDisplayAmount(item.neutral),
          sad: toDisplayAmount(item.sad),
        })),
    [chartData, activeCurrency],
  );

  const incomeExpenseDisplayData = useMemo(
    () =>
      incomeExpenseChartData.map((item) => ({
        ...item,
        income: toDisplayAmount(item.income),
        expense: toDisplayAmount(item.expense),
      })),
    [incomeExpenseChartData, activeCurrency],
  );

  const emotionTimelineDisplayData = useMemo(
    () =>
      emotionTimelineData.map((item) => ({
        ...item,
        happy: toDisplayAmount(item.happy),
        neutral: toDisplayAmount(item.neutral),
        sad: toDisplayAmount(item.sad),
      })),
    [emotionTimelineData, activeCurrency],
  );

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t('emotions.title')}
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('emotions.spendingByEmotion')}</CardTitle>
          <CardDescription>
            {t('emotions.spendingByEmotionDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : spendingByEmotionDisplayData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              {t('emotions.noData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={spendingByEmotionDisplayData}
                margin={{ top: 8, right: 8, bottom: 8, left: 20 }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const categoryName = data.activePayload[0].payload.name;
                    setSelectedCategoryForManagement(categoryName);
                    setCategoryManagementOpen(true);
                  }
                }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={chartData.length > 8 ? 10 : 12}
                  tickLine={false}
                  axisLine={false}
                  angle={chartData.length > 8 ? -45 : 0}
                  textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                  height={chartData.length > 8 ? 60 : 30}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(value) => axisTickFormatter(Number(value))}
                />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: any) => formatDisplayCurrency(Number(value))}
                />
                <Bar
                  dataKey="happy"
                  stackId="a"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: 'pointer' }}
                />
                <Bar
                  dataKey="neutral"
                  stackId="a"
                  fill="hsl(var(--chart-3))"
                  radius={[0, 0, 0, 0]}
                  style={{ cursor: 'pointer' }}
                />
                <Bar
                  dataKey="sad"
                  stackId="a"
                  fill="hsl(var(--destructive))"
                  radius={[0, 0, 0, 0]}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('emotions.aiInsights')}</CardTitle>
              <CardDescription>
                {t('emotions.aiInsightsDesc')}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAIInsights}
              disabled={isLoadingInsights || !user?.id}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isLoadingInsights ? t('emotions.generating') : t('emotions.generateInsights')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInsights ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.2s]"></div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.4s]"></div>
              <span>{t('emotions.analyzing')}</span>
            </div>
          ) : aiInsights ? (
            <div className="space-y-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {aiInsights}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('emotions.incomeExpenseOverTime')}</CardTitle>
          <CardDescription>
            {t('emotions.incomeExpenseOverTimeDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : incomeExpenseDisplayData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              {t('emotions.noIncomeData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={incomeExpenseDisplayData} margin={{ top: 8, right: 8, bottom: 8, left: 20 }}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(value) => axisTickFormatter(Number(value))}
                />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: any, name: string) => [
                    formatDisplayCurrency(Number(value)),
                    name === 'income' ? t('emotions.income') : t('emotions.expense'),
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('emotions.emotionalSpendingOverTime')}</CardTitle>
          <CardDescription>
            {t('emotions.emotionalSpendingOverTimeDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : emotionTimelineDisplayData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              {t('emotions.noEmotionalData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={emotionTimelineDisplayData} margin={{ top: 8, right: 8, bottom: 8, left: 20 }}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(value) => axisTickFormatter(Number(value))}
                />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: any) => formatDisplayCurrency(Number(value))}
                />
                <Line
                  type="monotone"
                  dataKey="happy"
                  name="Happy"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="neutral"
                  name="Neutral"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="sad"
                  name="Sad"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      {/* Category Management Modal */}
      <CategoryManagement 
        open={categoryManagementOpen} 
        onOpenChange={setCategoryManagementOpen}
        selectedCategory={selectedCategoryForManagement}
      />
    </div>
  );
}
