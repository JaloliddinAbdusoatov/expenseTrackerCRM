import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Edit, AlertCircle } from 'lucide-react';
import { budgetsApi, expensesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { convertFromUsd, convertToUsd, formatCurrency } from '@/lib/currency';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Budget {
  id: string;
  category: string;
  limit: number;
  period: 'weekly' | 'monthly' | 'yearly';
  note?: string;
  spending?: number;
  percentage?: number;
  remaining?: number;
  isExceeded?: boolean;
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [formData, setFormData] = useState({
    category: '',
    limit: '',
    period: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    note: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadBudgets();
      loadCategories();
    }
  }, [user?.id]);

  const loadCategories = async () => {
    if (!user?.id) return;
    try {
      setIsLoadingCategories(true);
      const categories = await expensesApi.getCategories(user.id);
      const categoryNames = categories.map((cat: { name: string; count: number }) => cat.name);
      setUserCategories(categoryNames);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadBudgets = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await budgetsApi.getAll(user.id, true);
      setBudgets(data);
      
      // Проверяем превышение бюджетов и показываем уведомления
      const exceededBudgets = data.filter((b: Budget) => b.isExceeded);
      if (exceededBudgets.length > 0) {
        exceededBudgets.forEach((budget: Budget) => {
          toast({
            title: t('budgets.budgetExceeded'),
            description: t('budgets.budgetExceededNotification', { category: budget.category, amount: (budget.spending || 0).toFixed(2), limit: budget.limit.toFixed(2) }),
            variant: 'destructive',
            duration: 5000,
          });
        });
      }
    } catch (error: any) {
      console.error('Failed to load budgets:', error);
      toast({
        title: t('budgets.loadError'),
        description: error.message || t('budgets.loadErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      const isCustomCategory = !userCategories.includes(budget.category);
      setFormData({
        category: isCustomCategory ? 'Other' : budget.category,
        limit: convertFromUsd(budget.limit, user?.currency || 'USD').toFixed(2),
        period: budget.period,
        note: budget.note || '',
      });
      setCustomCategory(isCustomCategory ? budget.category : '');
    } else {
      setEditingBudget(null);
      setFormData({
        category: '',
        limit: '',
        period: 'monthly',
        note: '',
      });
      setCustomCategory('');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBudget(null);
    setFormData({
      category: '',
      limit: '',
      period: 'monthly',
      note: '',
    });
    setCustomCategory('');
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    // Определяем финальную категорию
    const finalCategory = formData.category === 'Other' 
      ? (customCategory.trim() || '')
      : formData.category;

    if (!finalCategory || !formData.limit) {
      toast({
        title: t('budgets.validationError'),
        description: t('budgets.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    if (formData.category === 'Other' && !customCategory.trim()) {
      toast({
        title: t('budgets.validationError'),
        description: t('budgets.customCategoryRequired'),
        variant: 'destructive',
      });
      return;
    }

    const limit = parseFloat(formData.limit);
    if (isNaN(limit) || limit <= 0) {
      toast({
        title: t('budgets.validationError'),
        description: t('budgets.invalidAmount'),
        variant: 'destructive',
      });
      return;
    }

    const limitUsd = convertToUsd(limit, user?.currency || 'USD');

    try {
      if (editingBudget) {
        await budgetsApi.update(user.id, editingBudget.id, {
          category: finalCategory,
          limit: limitUsd,
          period: formData.period,
          note: formData.note || undefined,
        });
        toast({
          title: t('budgets.updateSuccess'),
          description: t('budgets.updateSuccessDescription'),
        });
      } else {
        await budgetsApi.create(user.id, {
          category: finalCategory,
          limit: limitUsd,
          period: formData.period,
          note: formData.note || undefined,
        });
        toast({
          title: t('budgets.createSuccess'),
          description: t('budgets.createSuccessDescription'),
        });
      }
      handleCloseDialog();
      await loadBudgets();
    } catch (error: any) {
      toast({
        title: t('budgets.error'),
        description: error.message || t('budgets.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!user?.id || !deletingBudget) return;

    try {
      await budgetsApi.delete(user.id, deletingBudget.id);
      toast({
        title: t('budgets.deleteSuccess'),
        description: t('budgets.deleteSuccessDescription'),
      });
      setDeletingBudget(null);
      await loadBudgets();
    } catch (error: any) {
      toast({
        title: t('budgets.error'),
        description: error.message || t('budgets.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'weekly':
        return t('budgets.periodWeekly');
      case 'monthly':
        return t('budgets.periodMonthly');
      case 'yearly':
        return t('budgets.periodYearly');
      default:
        return period;
    }
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, user?.currency || 'USD', language);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('budgets.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('budgets.description')}</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('budgets.addBudget')}
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t('budgets.noBudgets')}</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('budgets.addFirstBudget')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <Card key={budget.id} className={budget.isExceeded ? 'border-red-500' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{budget.category}</CardTitle>
                    <CardDescription className="mt-1">
                      {getPeriodLabel(budget.period)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(budget)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingBudget(budget)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('budgets.deleteConfirm')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('budgets.deleteConfirmDescription')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeletingBudget(null)}>
                            {t('common.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{t('budgets.spent')}</span>
                    <span className={budget.isExceeded ? 'text-red-500 font-semibold' : ''}>
                      {formatAmount(budget.spending || 0)} / {formatAmount(budget.limit)}
                    </span>
                  </div>
                  <Progress
                    value={budget.percentage || 0}
                    className={budget.isExceeded ? 'bg-red-100' : ''}
                  />
                  <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                    <span>{Math.round(budget.percentage || 0)}%</span>
                    <span>
                      {budget.isExceeded
                        ? t('budgets.exceeded')
                        : `${t('budgets.remaining')}: ${formatAmount(budget.remaining || 0)}`}
                    </span>
                  </div>
                </div>
                {budget.isExceeded && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t('budgets.budgetExceeded')}</span>
                  </div>
                )}
                {budget.note && (
                  <p className="text-sm text-muted-foreground">{budget.note}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? t('budgets.editBudget') : t('budgets.addBudget')}
            </DialogTitle>
            <DialogDescription>{t('budgets.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">{t('budgets.category')}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value });
                  if (value !== 'Other') {
                    setCustomCategory('');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('budgets.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {userCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">{t('budgets.otherCategory')}</SelectItem>
                </SelectContent>
              </Select>
              {formData.category === 'Other' && (
                <Input
                  className="mt-2"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={t('budgets.customCategoryPlaceholder')}
                />
              )}
            </div>
            <div>
              <Label htmlFor="limit">{t('budgets.limit')}</Label>
              <Input
                id="limit"
                type="number"
                step="0.01"
                min="0"
                value={formData.limit}
                onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="period">{t('budgets.period')}</Label>
              <Select
                value={formData.period}
                onValueChange={(value: 'weekly' | 'monthly' | 'yearly') =>
                  setFormData({ ...formData, period: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('budgets.periodWeekly')}</SelectItem>
                  <SelectItem value="monthly">{t('budgets.periodMonthly')}</SelectItem>
                  <SelectItem value="yearly">{t('budgets.periodYearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="note">{t('budgets.note')} ({t('common.optional')})</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder={t('budgets.notePlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit}>
              {editingBudget ? t('common.save') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
