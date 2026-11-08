import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Smile,
  Meh,
  Frown,
  Plus,
  MoreVertical,
  Utensils,
  ShoppingBag,
  Car,
  Ticket,
  Home,
  Landmark,
  Gift,
  TrendingUp,
  Building2,
  Heart,
  GraduationCap,
  Plane,
  Dumbbell,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React from 'react';
import { expensesApi, goalsApi, budgetsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { convertFromUsd, convertToUsd, formatCurrency } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/date-range-filter';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { getStoredReportDateFilter, setStoredReportDateFilter } from '@/lib/report-date-filter';
import { Filter } from 'lucide-react';
import { AddExpenseDialog } from '@/components/add-expense-dialog';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MessageSquare } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  emotion?: 'happy' | 'neutral' | 'sad' | 'low' | 'medium' | 'high'; // Supports both formats
  photo?: string;
  note?: string; // Комментарий/заметка
  type: 'expense' | 'income';
}


const emotionMap = {
  happy: <Smile className="h-5 w-5 text-green-500" />,
  neutral: <Meh className="h-5 w-5 text-yellow-500" />,
  sad: <Frown className="h-5 w-5 text-red-500" />,
};

type TransactionCategory = 'Food & Dining' | 'Shopping' | 'Transportation' | 'Entertainment' | 'Bills & Utilities' | 'Health & Medical' | 'Education' | 'Travel & Tourism' | 'Fitness & Sports' | 'Gifts & Donations' | 'Income' | 'Other' | string;

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'Food & Dining': Utensils,
    'Shopping': ShoppingBag,
    'Transportation': Car,
    'Entertainment': Ticket,
    'Bills & Utilities': Building2,
    'Health & Medical': Heart,
    'Education': GraduationCap,
    'Travel & Tourism': Plane,
    'Fitness & Sports': Dumbbell,
    'Gifts & Donations': Gift,
    'Income': Landmark,
    'Other': DollarSign,
  };
  
const getIcon = (category: TransactionCategory) => {
    const Icon = iconMap[category] || DollarSign; // Fallback to DollarSign if category not found
    if (!Icon) {
      return <DollarSign className="h-4 w-4" />;
    }
    return <Icon className="h-4 w-4" />;
};

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const getTransactionPhotoUrl = (photo: string, useLegacyApiPath = false) => {
  const raw = photo.trim();
  if (!raw) return '';

  // Keep already embedded images intact.
  if (raw.startsWith('data:image/')) {
    return raw;
  }

  const backendUrl = getBackendBaseUrl();
  const normalizeApiPrefix = (value: string) =>
    useLegacyApiPath
      ? value.replace('/uploads/photos/', '/api/uploads/photos/')
      : value.replace('/api/uploads/photos/', '/uploads/photos/');

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return normalizeApiPrefix(raw);
  }

  const normalizedRaw = normalizeApiPrefix(raw);
  const normalizedPath = normalizedRaw.startsWith('/') ? normalizedRaw : `/${normalizedRaw}`;

  if (
    normalizedPath.startsWith('/uploads/photos/') ||
    normalizedPath.startsWith('/uploads/')
  ) {
    return `${backendUrl}${normalizedPath}`;
  }

  if (normalizedPath.startsWith('/api/uploads/photos/')) {
    return `${backendUrl}${normalizedPath.replace('/api/uploads/photos/', '/uploads/photos/')}`;
  }

  // Legacy records may contain only the filename.
  if (/^\/?[^/]+\.(jpg|jpeg|png|gif|webp|bmp|avif)$/i.test(normalizedPath)) {
    return `${backendUrl}/uploads/photos/${normalizedPath.replace(/^\/+/, '')}`;
  }

  return `${backendUrl}${normalizedPath}`;
};

export default function DashboardPage() {
  const ITEMS_PER_PAGE = 20;
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [availableBalance, setAvailableBalance] = React.useState<number | null>(null);
  const [goalsAllocated, setGoalsAllocated] = React.useState<number | null>(null);
  const [budgets, setBudgets] = React.useState<any[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Фильтр по датам: из localStorage (как в отчёте/PDF) или текущий месяц
  const [dateRange, setDateRangeState] = React.useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    const stored = getStoredReportDateFilter();
    if (stored) return { from: stored.from, to: stored.to };
    const from = startOfMonth(new Date());
    const to = endOfMonth(new Date());
    setStoredReportDateFilter(from, to);
    return { from, to };
  });

  const setDateRange = React.useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRangeState(range);
    if (range.from && range.to) setStoredReportDateFilter(range.from, range.to);
  }, []);

  React.useEffect(() => {
    if (user?.id) {
      loadTransactions();
      loadBudgets();
    }
  }, [user?.id]);

  const loadBudgets = async () => {
    if (!user?.id) return;
    try {
      const data = await budgetsApi.getAll(user.id, true);
      setBudgets(data || []);
      
      // Проверяем превышение бюджетов и показываем уведомления
      const exceededBudgets = (data || []).filter((b: any) => b.isExceeded);
      if (exceededBudgets.length > 0) {
        exceededBudgets.forEach((budget: any) => {
          // Показываем уведомление только один раз при загрузке
          // Можно добавить логику, чтобы не показывать повторно
          console.warn(`⚠️ Budget exceeded: ${budget.category} - $${(budget.spending || 0).toFixed(2)} / $${budget.limit.toFixed(2)}`);
        });
      }
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const [expenses, incomes, balanceData] = await Promise.all([
        expensesApi.getExpenses(user.id),
        expensesApi.getIncomes(user.id),
        goalsApi.getBalance(user.id).catch(() => ({ balance: 0 })), // fallback if balance API fails
      ]);
      
      const expenseTransactions: Transaction[] = expenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date,
        category: (e as any).category || categorizeExpense(e.description), // Use saved category if exists
        // Keep emotion in backend format (high/medium/low) for display logic
        emotion: e.emotion as 'low' | 'medium' | 'high',
        photo: e.photo || undefined,
        note: (e as any).note || undefined,
        type: 'expense' as const,
      }));
      
      const incomeTransactions: Transaction[] = incomes.map(i => ({
        id: i.id,
        description: i.description,
        amount: i.amount,
        date: i.date,
        category: 'Income',
        note: (i as any).note || undefined,
        photo: (i as any).photo || undefined,
        type: 'income' as const,
      }));
      
      // Combine and sort by date
      const all = [...expenseTransactions, ...incomeTransactions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setAllTransactions(all);

      // Compute global income / expenses for balance & goals allocation
      const totalIncomeAllTime = incomes.reduce((sum: number, i: any) => sum + i.amount, 0);
      const totalExpensesAllTime = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
      const backendBalance = typeof balanceData.balance === 'number' ? balanceData.balance : 0;

      setAvailableBalance(backendBalance);

      // How much денег уже лежит в целях
      const allocatedToGoals = totalIncomeAllTime - totalExpensesAllTime - backendBalance;
      setGoalsAllocated(Math.max(0, allocatedToGoals));
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeExpense = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.match(/food|eat|restaurant|cafe|coffee|курица|еда|ресторан|meal|pizza|burger|groceries|продукты|завтрак|обед|ужин/)) return 'Food & Dining';
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
  };

  // Фильтруем транзакции по дате
  const filteredTransactions = React.useMemo(() => {
    if (!dateRange.from || !dateRange.to) {
      return allTransactions;
    }
    
    return allTransactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return isWithinInterval(transactionDate, {
        start: dateRange.from!,
        end: dateRange.to!,
      });
    });
  }, [allTransactions, dateRange]);

  const totalPages = React.useMemo(() => {
    return Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  }, [filteredTransactions.length, ITEMS_PER_PAGE]);

  const paginationItems = React.useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const items: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      items.push('ellipsis-left');
    }

    for (let page = start; page <= end; page += 1) {
      items.push(page);
    }

    if (end < totalPages - 1) {
      items.push('ellipsis-right');
    }

    items.push(totalPages);
    return items;
  }, [currentPage, totalPages]);

  // Paginated transactions: 20 items per page
  const transactions = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, currentPage, ITEMS_PER_PAGE]);

  // Reset to first page when date filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dateRange.from, dateRange.to]);

  // Keep current page in valid bounds after data changes
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Вычисляем статистику на основе всех отфильтрованных транзакций (не только отображаемых)
  const stats = React.useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expenses;
    
    return { income, expenses, balance };
  }, [filteredTransactions]);

  const handleDeleteTransaction = async (id: string) => {
    if (!user?.id) return;
    try {
      const transaction = allTransactions.find(t => t.id === id);
      if (!transaction) return;

      if (transaction.type === 'expense') {
        // Удаляем расход — бэкенд сам пересчитает баланс и цели
        await expensesApi.deleteExpense(id, user.id);
      } else if (transaction.type === 'income') {
        // Для дохода доверяем проверке баланса на бэкенде
        await expensesApi.deleteIncome(id, user.id);
      }
      
      // Обновляем транзакции и бюджеты одновременно
      await Promise.all([loadTransactions(), loadBudgets()]);
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
      const message =
        error?.message && typeof error.message === 'string'
          ? error.message
          : t('dashboard.deleteError');
      alert(message);
    }
  };

  const handleAddTransaction = async (transaction: { id?: string; name: string; amount: number; category: string; emotion?: string; photo?: string | File; customCategory?: string }) => {
    console.log('🔵 handleAddTransaction called with:', { transaction, user: user?.id });
    
    if (!user?.id) {
      console.error('❌ No user ID');
      alert('Пожалуйста, войдите в систему');
      return;
    }
    
    try {
      const activeCurrency = user?.currency || 'USD';
      // Edit existing expense: full update including emotion
      if (transaction.id && transaction.category !== 'Income') {
        const amount = convertToUsd(Math.abs(transaction.amount), activeCurrency);
        let photoPath: string | undefined = undefined;
        if (transaction.photo instanceof File) {
          try {
            const uploadResult = await expensesApi.uploadPhoto(transaction.photo);
            photoPath = uploadResult.path;
          } catch (error: any) {
            console.error('Failed to upload photo:', error);
            alert(`Не удалось загрузить фото: ${error.message || 'Ошибка загрузки'}`);
            return;
          }
        } else if (typeof transaction.photo === 'string') {
          photoPath = transaction.photo;
        }
        const emotionMap: Record<string, 'low' | 'medium' | 'high'> = {
          happy: 'high',
          neutral: 'medium',
          sad: 'low',
        };
        const emotion = transaction.emotion ? (emotionMap[transaction.emotion] || 'medium') : undefined;
        const category = transaction.category === 'Other' && transaction.customCategory
          ? transaction.customCategory
          : transaction.category !== 'Other' ? transaction.category : undefined;
        await expensesApi.updateExpense(transaction.id, user.id, {
          description: transaction.name,
          amount,
          emotion,
          category,
          photo: photoPath,
        });
        await loadTransactions();
        setIsDialogOpen(false);
        setEditingTransaction(null);
        return;
      }
      
      // Add new transaction
      console.log('✅ Starting transaction add:', { transaction, userId: user.id });
      const isIncome = transaction.category === 'Income' || transaction.amount < 0;
      const amount = convertToUsd(Math.abs(transaction.amount), activeCurrency);

      if (!isIncome && availableBalance !== null && amount > availableBalance) {
        toast({
          title: t('dashboard.insufficientBalanceForExpense'),
          description: `${formatCurrency(availableBalance, user?.currency || 'USD', language)} ${language === 'ru' ? 'доступно' : language === 'ja' ? '利用可能' : 'available'}, ${formatCurrency(amount, user?.currency || 'USD', language)} ${language === 'ru' ? 'запрошено' : language === 'ja' ? 'リクエスト' : 'requested'}`,
          variant: 'destructive',
        });
        return;
      }

      // Upload photo first if it's a File object
      let photoPath: string | undefined = undefined;
      if (transaction.photo instanceof File) {
        try {
          console.log('Uploading photo file:', { name: transaction.photo.name, size: transaction.photo.size });
          const uploadResult = await expensesApi.uploadPhoto(transaction.photo);
          photoPath = uploadResult.path;
          console.log('Photo uploaded successfully:', uploadResult);
        } catch (error: any) {
          console.error('Failed to upload photo:', error);
          alert(`Не удалось загрузить фото: ${error.message || 'Ошибка загрузки'}`);
          return;
        }
      } else if (typeof transaction.photo === 'string') {
        // If it's already a path (from old data), use it as is
        photoPath = transaction.photo;
      }
      
      if (isIncome) {
        // Add income directly to database
        console.log('Adding income:', { userId: user.id, name: transaction.name, amount, photoPath: photoPath || 'none' });
        await expensesApi.addIncome(
          user.id,
          transaction.name,
          amount,
          photoPath,
          (transaction as any).isRecurring,
          (transaction as any).recurrenceType,
          (transaction as any).recurrenceInterval,
          (transaction as any).recurrenceDaysCount,
        );
        console.log('Income added successfully');
      } else {
        // Add expense directly to database with emotion and photo
        // Map emotion: happy -> high, neutral -> medium, sad -> low
        const emotionMap: Record<string, 'low' | 'medium' | 'high'> = {
          'happy': 'high',
          'neutral': 'medium',
          'sad': 'low',
        };
        // Default to 'medium' if no emotion is provided, otherwise use the mapped value
        const emotion = transaction.emotion ? (emotionMap[transaction.emotion] || 'medium') : 'medium';
        
        // Определяем категорию: если выбрано Other и есть кастомная категория, используем её
        const category = transaction.category === 'Other' && transaction.customCategory 
          ? transaction.customCategory 
          : (transaction.category !== 'Other' ? transaction.category : undefined);
        
        // Получаем данные о повторении, если они есть
        const isRecurring = (transaction as any).isRecurring === true;
        const recurrenceType = (transaction as any).recurrenceType;
        const recurrenceInterval = (transaction as any).recurrenceInterval;
        const recurrenceDaysCount = (transaction as any).recurrenceDaysCount;
        
        console.log('Adding expense:', { 
          userId: user.id,
          name: transaction.name,
          amount,
          originalEmotion: transaction.emotion, 
          mappedEmotion: emotion,
          photoPath: photoPath || 'none',
          category,
          isRecurring,
          recurrenceType,
          recurrenceInterval,
          recurrenceDaysCount,
        });
        
        const savedExpense = await expensesApi.addExpense(
          user.id,
          transaction.name,
          amount,
          emotion,
          photoPath,
          category,
          isRecurring,
          recurrenceType,
          recurrenceInterval,
          recurrenceDaysCount,
        );
        console.log('Expense saved successfully:', savedExpense);
        
        // Проверяем превышение бюджета и показываем уведомления
        if ((savedExpense as any).budgetExceeded) {
          const budgetInfo = (savedExpense as any).budgetExceeded;
          const amount = formatCurrency(budgetInfo.spending, user?.currency || 'USD', language);
          const limit = formatCurrency(budgetInfo.limit, user?.currency || 'USD', language);
          toast({
            title: t('budgets.budgetExceeded'),
            description: t('budgets.budgetExceededNotification')
              .replace('{category}', budgetInfo.category)
              .replace('${amount}', amount)
              .replace('${limit}', limit),
            variant: 'destructive',
            duration: 5000,
          });
        } else if ((savedExpense as any).budgetWarning) {
          const budgetInfo = (savedExpense as any).budgetWarning;
          const percentage = budgetInfo.percentage.toFixed(1);
          const remaining = formatCurrency((budgetInfo.limit - budgetInfo.spending), user?.currency || 'USD', language);
          toast({
            title: t('budgets.budgetWarning'),
            description: t('budgets.budgetWarningNotification')
              .replace('{category}', budgetInfo.category)
              .replace('{percentage}', percentage)
              .replace('${remaining}', remaining),
            variant: 'default',
            duration: 4000,
          });
        }
      }
      
      console.log('Transaction added successfully');
      
      // Close dialog
      setIsDialogOpen(false);
      // New transactions are sorted to top; ensure user sees them immediately.
      setCurrentPage(1);
      // If active date filter excludes "today", move to current month so newly added entry is visible.
      const now = new Date();
      const isTodayVisible =
        dateRange.from &&
        dateRange.to &&
        isWithinInterval(now, { start: dateRange.from, end: dateRange.to });
      if (!isTodayVisible) {
        setDateRange({
          from: startOfMonth(now),
          to: endOfMonth(now),
        });
      }
      
      // Reload transactions and budgets after adding
      await Promise.all([loadTransactions(), loadBudgets()]);
    } catch (error: any) {
      console.error('Failed to add transaction:', error);
      const errorMessage = error.message || 'Ошибка подключения к серверу';
      alert(`Не удалось добавить транзакцию: ${errorMessage}`);
      // Don't close dialog on error so user can retry
    }
  };

  const openAddDialog = () => {
    setEditingTransaction(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t('dashboard.title')}
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="min-w-0 pb-2">
            <CardDescription>{t('dashboard.totalIncome')}</CardDescription>
            <CardTitle className="min-w-0 break-words text-xl leading-tight sm:text-2xl text-green-600 dark:text-green-400">
              +{formatCurrency(stats.income, user?.currency || 'USD', language)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="min-w-0 pb-2">
            <CardDescription>{t('dashboard.totalExpenses')}</CardDescription>
            <CardTitle className="min-w-0 break-words text-xl leading-tight sm:text-2xl text-red-600 dark:text-red-400">
              -{formatCurrency(stats.expenses, user?.currency || 'USD', language)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="min-w-0 pb-2">
            <CardDescription>{t('dashboard.availableBalance')}</CardDescription>
            <CardTitle
              className={`min-w-0 break-words text-xl leading-tight sm:text-2xl ${
                (availableBalance ?? stats.balance) >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency((availableBalance ?? stats.balance), user?.currency || 'USD', language)}
            </CardTitle>
            {goalsAllocated !== null && goalsAllocated > 0 && (
              <p className="mt-1 min-w-0 break-words text-xs text-muted-foreground">
                {t('dashboard.inGoals')}: {formatCurrency(goalsAllocated, user?.currency || 'USD', language)}
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Budgets Widget */}
      {budgets.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('budgets.title')}</span>
              <Link to="/budgets" className="text-sm text-primary hover:underline">
                {t('common.viewAll')}
              </Link>
            </CardTitle>
            <CardDescription>{t('budgets.dashboardDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgets.slice(0, 3).map((budget) => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{budget.category}</span>
                    <span className={budget.isExceeded ? 'text-red-500 font-semibold' : ''}>
                      {formatCurrency((budget.spending || 0), user?.currency || 'USD', language)} / {formatCurrency(budget.limit, user?.currency || 'USD', language)}
                    </span>
                  </div>
                  <Progress
                    value={budget.percentage || 0}
                    className={budget.isExceeded ? 'bg-red-100' : ''}
                  />
                  {budget.isExceeded && (
                    <div className="flex items-center gap-2 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      <span>{t('budgets.budgetExceeded')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative pl-4 sm:pl-6">
        {/* Timeline Line */}
        <div className="absolute left-[20px] sm:left-[30px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('dashboard.loading')}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('dashboard.noTransactions')}</p>
          </div>
        ) : (
          transactions.map((transaction, index) => {
            const isIncome = transaction.type === 'income';
            const displayAmount = Math.abs(transaction.amount);
          
          return (
          <div key={transaction.id} className="relative mb-6 sm:mb-8">
            <div className={`absolute left-0 top-1.5 flex h-5 w-5 sm:h-6 sm:w-6 -translate-x-1/2 items-center justify-center rounded-full ${
              isIncome 
                ? 'bg-green-500 text-white' 
                : 'bg-primary text-primary-foreground'
            }`}>
              {getIcon(transaction.category)}
            </div>
            <div className="ml-8 sm:ml-10">
              <Card className="relative">
                <CardHeader className="flex flex-col gap-3 pr-12 sm:pr-14 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4 break-words">
                      {transaction.description}
                      {isIncome && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                          {t('dashboard.income')}
                        </Badge>
                      )}
                      {transaction.emotion && !isIncome && (() => {
                        // Map backend emotion format (low/medium/high) to frontend format (sad/neutral/happy)
                        const emotionDisplayMap: Record<string, 'happy' | 'neutral' | 'sad'> = {
                          'high': 'happy',
                          'medium': 'neutral',
                          'low': 'sad',
                        };
                        const displayEmotion = emotionDisplayMap[transaction.emotion] || 'neutral';
                        return (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1.5"
                          >
                            {emotionMap[displayEmotion]}
                            <span className="capitalize">
                              {displayEmotion}
                            </span>
                          </Badge>
                        );
                      })()}
                    </CardTitle>
                    <CardDescription>
                      {new Date(transaction.date).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex w-full items-start justify-end gap-2 sm:w-auto sm:items-center sm:justify-end">
                    <div className={`min-w-0 break-words pr-2 text-right text-lg sm:text-2xl font-bold leading-tight ${
                      isIncome 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-foreground'
                    }`}>
                      {isIncome ? '+' : '-'}{formatCurrency(displayAmount, user?.currency || 'USD', language)}
                    </div>
                  </div>
                </CardHeader>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full shrink-0 sm:right-4 sm:top-4 sm:h-9 sm:w-9"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      setEditingTransaction(transaction);
                      if (transaction.type === 'expense') {
                        setIsEditDialogOpen(false);
                        setIsDialogOpen(true);
                      } else {
                        setIsDialogOpen(false);
                        setIsEditDialogOpen(true);
                      }
                    }}>
                      {t('dashboard.editTransaction')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      {t('dashboard.deleteTransaction')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {(transaction.photo || transaction.note) && (
                  <CardContent className="space-y-4">
                    {transaction.photo && (
                      <div className="relative aspect-video rounded-md overflow-hidden border">
                        <img 
                          src={getTransactionPhotoUrl(transaction.photo)}
                          alt={`Receipt for ${transaction.description}`} 
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.dataset.fallbackTried !== 'true') {
                              img.dataset.fallbackTried = 'true';
                              const fallback = getTransactionPhotoUrl(transaction.photo!, true);
                              if (fallback && fallback !== img.src) {
                                img.src = fallback;
                                return;
                              }
                            }
                            console.error('Failed to load image:', transaction.photo);
                            console.error('Image URL:', img.src);
                          }}
                        />
                      </div>
                    )}
                    {transaction.note && (
                      <div className="flex items-start gap-2 pt-2 border-t">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{transaction.note}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
          );
        })
        )}
      </div>

      {!isLoading && filteredTransactions.length > 0 && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Prev
          </Button>

          {paginationItems.map((item, index) =>
            typeof item === 'number' ? (
              <Button
                key={item}
                variant={item === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(item)}
                className="min-w-9"
              >
                {item}
              </Button>
            ) : (
              <span key={`${item}-${index}`} className="px-1 text-muted-foreground select-none">
                ...
              </span>
            ),
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
      
      {/* Add Transaction Dialog with Button */}
      <AddExpenseDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        onSubmit={handleAddTransaction}
        transaction={editingTransaction && editingTransaction.type === 'expense' ? {
          id: editingTransaction.id,
          name: editingTransaction.description,
          category: editingTransaction.category as TransactionCategory,
          amount: convertFromUsd(Math.abs(editingTransaction.amount), user?.currency || 'USD'),
          date: editingTransaction.date,
          emotion: (editingTransaction.emotion === 'high' ? 'happy' : editingTransaction.emotion === 'low' ? 'sad' : 'neutral') as 'happy' | 'neutral' | 'sad',
          photo: editingTransaction.photo,
        } : undefined}
      >
        <span className="inline-block">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  onClick={openAddDialog}
                  variant="glassFab"
                  className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 h-14 w-14 sm:h-16 sm:w-16 rounded-full z-50"
                  aria-label={t('common.addTransaction')}
                  size="icon"
                >
                  <Plus className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{t('common.addTransaction')}</p>
            </TooltipContent>
          </Tooltip>
        </span>
      </AddExpenseDialog>

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={async (data) => {
          if (!user?.id || !editingTransaction) return;
          try {
            if (editingTransaction.type === 'expense') {
              await expensesApi.updateExpense(editingTransaction.id, user.id, data.description, data.note);
            } else {
              await expensesApi.updateIncome(editingTransaction.id, user.id, data.description, data.note);
            }
            await loadTransactions();
            setEditingTransaction(null);
          } catch (error: any) {
            console.error('Failed to update transaction:', error);
            alert(t('dashboard.updateError') || 'Не удалось обновить транзакцию.');
          }
        }}
        transaction={editingTransaction}
      />
    </div>
  );
}
