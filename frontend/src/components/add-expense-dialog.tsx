import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionCategory, Emotion, Transaction, NewTransaction } from '@/lib/types';
import { Smile, Meh, Frown, Paperclip } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { expensesApi } from '@/lib/api';

const expenseCategories: TransactionCategory[] = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Health & Medical',
  'Education',
  'Travel & Tourism',
  'Fitness & Sports',
  'Gifts & Donations',
  'Other',
];

const allCategories: TransactionCategory[] = [
  ...expenseCategories,
  'Income',
];

// Base schema for type inference - category can be any string to support custom categories
const baseTransactionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1), // Changed to string to support custom categories
  customCategory: z.string().optional(), // Кастомная категория для "Other"
  emotion: z.enum(['happy', 'neutral', 'sad']).optional(),
  photo: z.union([z.string(), z.instanceof(File)]).optional(),
  // Поля для повторяющихся транзакций
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
  recurrenceInterval: z.number().positive().default(1), // Для дней: 1 = каждый день, 2 = через день
  recurrenceDaysCount: z.number().positive().optional(), // Сколько дней создавать (для daily)
});

// Schema will be created dynamically with translations
const createTransactionSchema = (t: (key: string) => string) => baseTransactionSchema.extend({
  name: z.string().min(1, t('transaction.nameRequired')),
  amount: z.number().positive(t('transaction.amountPositive')),
});

type FormData = z.infer<typeof baseTransactionSchema>;

type AddExpenseDialogProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewTransaction & { photo?: string | File }) => void;
  transaction?: Transaction;
};

export function AddExpenseDialog({ children, open, onOpenChange, onSubmit, transaction }: AddExpenseDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createTransactionSchema(t)),
      defaultValues: {
        id: undefined,
        name: '',
        amount: 0,
        category: 'Food & Dining',
        customCategory: '',
        emotion: undefined,
        photo: undefined,
        isRecurring: false,
        recurrenceType: 'once',
        recurrenceInterval: 1,
        recurrenceDaysCount: 30, // По умолчанию 30 дней для daily
      },
  });

  const selectedEmotion = watch('emotion');
  const photo = watch('photo');
  const selectedCategory = watch('category');
  const isIncome = selectedCategory === 'Income';
  const isOtherCategory = selectedCategory === 'Other';
  const isRecurring = watch('isRecurring');
  const recurrenceType = watch('recurrenceType');
  const recurrenceInterval = watch('recurrenceInterval');
  const recurrenceDaysCount = watch('recurrenceDaysCount');

  // Load user categories when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      loadUserCategories();
    }
  }, [open, user?.id]);

  const loadUserCategories = async () => {
    if (!user?.id) return;
    try {
      setIsLoadingCategories(true);
      const categories = await expensesApi.getCategories(user.id);
      const categoryNames = categories.map((cat: { name: string; count: number }) => cat.name);
      setUserCategories(categoryNames);
    } catch (error: any) {
      console.error('Failed to load user categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Combine standard categories with user's custom categories
  const availableCategories = React.useMemo(() => {
    const combined = [...expenseCategories];
    // Add user's custom categories that are not in standard list
    userCategories.forEach(cat => {
      if (!expenseCategories.includes(cat as TransactionCategory) && cat !== 'Income') {
        combined.push(cat);
      }
    });
    // Also add category from transaction if editing and it's not in the list
    if (transaction?.category && 
        !expenseCategories.includes(transaction.category as TransactionCategory) && 
        transaction.category !== 'Income' &&
        !combined.includes(transaction.category)) {
      combined.push(transaction.category);
    }
    return combined.sort();
  }, [userCategories, transaction?.category]);

  useEffect(() => {
    if (transaction) {
      reset({
        id: transaction.id,
        name: transaction.name,
        amount: Math.abs(transaction.amount),
        category: transaction.category,
        emotion: transaction.emotion,
        photo: transaction.photo,
      });
    } else {
      reset({
        id: undefined,
        name: '',
        amount: 0,
        category: 'Food & Dining',
        customCategory: '',
        emotion: undefined,
        photo: undefined,
        isRecurring: false,
        recurrenceType: 'once',
        recurrenceInterval: 1,
        recurrenceDaysCount: 30,
      });
    }
  }, [transaction, open, reset]);
  
  const handleFormSubmit = async (data: FormData) => {
    if (isSubmitting) return;
    console.log('📝 Form submitted with data:', { data, photoType: data.photo instanceof File ? 'File' : typeof data.photo });
    
    // Если выбрана категория "Other" и введена кастомная категория, используем кастомную
    const finalCategory = (data.category === 'Other' && data.customCategory?.trim()) 
      ? data.customCategory.trim() 
      : data.category;
    
    // Для доходов используем отрицательное значение (как в initial-data)
    const transactionData: any = {
      ...data,
      category: finalCategory,
      amount: data.category === 'Income' ? -Math.abs(data.amount) : Math.abs(data.amount),
    };
    
    // Добавляем данные о повторении только если isRecurring явно true
    if (data.isRecurring === true && data.recurrenceType && data.recurrenceType !== 'once') {
      transactionData.isRecurring = true;
      transactionData.recurrenceType = data.recurrenceType;
      if (data.recurrenceInterval && data.recurrenceInterval > 0) {
        transactionData.recurrenceInterval = data.recurrenceInterval;
      }
      if (data.recurrenceDaysCount && data.recurrenceDaysCount > 0) {
        transactionData.recurrenceDaysCount = data.recurrenceDaysCount;
      }
    }
    
    console.log('📤 Calling onSubmit with:', { transactionData });
    await Promise.resolve(onSubmit(transactionData));
  };
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store the File object instead of base64
      setValue('photo', file, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogHeader>
            <DialogTitle>{transaction ? t('transaction.edit') : t('transaction.add')}</DialogTitle>
            <DialogDescription>
              {transaction ? t('transaction.editDesc') : t('transaction.addDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="category-type" className="sm:text-right">
                {t('transaction.type')}
              </Label>
              <div className="sm:col-span-3 flex gap-2">
                <Button
                  type="button"
                  variant={!isIncome ? 'default' : 'outline'}
                  onClick={() => {
                    if (selectedCategory === 'Income') {
                      setValue('category', 'Food & Dining');
                      setValue('emotion', undefined);
                    }
                  }}
                  className="flex-1"
                >
                  💸 {t('transaction.expense')}
                </Button>
                <Button
                  type="button"
                  variant={isIncome ? 'default' : 'outline'}
                  onClick={() => {
                    setValue('category', 'Income');
                    setValue('emotion', undefined);
                  }}
                  className="flex-1"
                >
                  💰 {t('transaction.income')}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="name" className="sm:text-right">
                {t('transaction.name')}
              </Label>
              <Input id="name" {...register('name')} className="sm:col-span-3" />
              {errors.name && <p className="sm:col-span-4 sm:text-right text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="amount" className="sm:text-right">
                {t('transaction.amount')}
              </Label>
              <Input id="amount" type="number" {...register('amount', { valueAsNumber: true })} placeholder="0.00" className="sm:col-span-3" />
              {errors.amount && <p className="sm:col-span-4 sm:text-right text-red-500 text-xs">{errors.amount.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="category" className="sm:text-right">
                {t('transaction.category')}
              </Label>
              {isIncome ? (
                // Для дохода не показываем селект, но отображаем как disabled-инпут с текстом Income
                <div className="sm:col-span-3 flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                  {t('transaction.income')}
                </div>
              ) : (
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(value: string) => {
                        field.onChange(value);
                        if (value !== 'Other') {
                          setValue('customCategory', '');
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="sm:col-span-3">
                        <SelectValue placeholder={t('transaction.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCategories ? (
                          <div className="p-2 text-sm text-muted-foreground">{t('common.loading')}</div>
                        ) : (
                          availableCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </div>
            {isOtherCategory && !isIncome && (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="customCategory" className="sm:text-right">
                  {t('transaction.customCategory')}
                </Label>
                <Input 
                  id="customCategory" 
                  {...register('customCategory')} 
                  placeholder={t('transaction.customCategoryPlaceholder')} 
                  className="sm:col-span-3" 
                />
                {errors.customCategory && <p className="sm:col-span-4 sm:text-right text-red-500 text-xs">{errors.customCategory.message}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">{t('transaction.receipt')}</Label>
              <div className="sm:col-span-3">
                <Button asChild variant="outline" className="w-full justify-start font-normal text-muted-foreground">
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <Paperclip className="mr-2 h-4 w-4" />
                    {photo ? t('transaction.changePhoto') : t('transaction.uploadPhoto')}
                    <input id="receipt-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} />
                  </label>
                </Button>
              </div>
            </div>
            {photo && (
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                  <Label className="sm:text-right pt-2">{t('transaction.preview')}</Label>
                  <div className="sm:col-span-3 relative aspect-video">
                    <img 
                      src={photo instanceof File ? URL.createObjectURL(photo) : photo} 
                      alt="Receipt preview" 
                      className="rounded-md object-cover w-full h-full" 
                    />
                  </div>
                </div>
            )}
            {!isIncome && (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label className="sm:text-right">{t('transaction.mood')}</Label>
                <div className="sm:col-span-3 flex justify-around sm:justify-start sm:gap-4">
                  {(['happy', 'neutral', 'sad'] as Emotion[]).map((emotion) => (
                    <Button
                      key={emotion}
                      type="button"
                      variant={selectedEmotion === emotion ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => setValue('emotion', selectedEmotion === emotion ? undefined : emotion, { shouldValidate: true })}
                      className={`h-12 w-12 rounded-full ${
                        emotion === 'happy' ? 'hover:bg-green-100 dark:hover:bg-green-900/50' :
                        emotion === 'neutral' ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/50' :
                        'hover:bg-red-100 dark:hover:bg-red-900/50'
                      }`}
                    >
                      {emotion === 'happy' && <Smile className="h-8 w-8 text-green-500" />}
                      {emotion === 'neutral' && <Meh className="h-8 w-8 text-yellow-500" />}
                      {emotion === 'sad' && <Frown className="h-8 w-8 text-red-500" />}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {/* Повторяющиеся транзакции */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label className="sm:text-right pt-1.5">{t('transaction.recurring') || 'Повторение'}</Label>
              <div className="sm:col-span-3 space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={isRecurring}
                    onChange={(e) => {
                      setValue('isRecurring', e.target.checked);
                      if (!e.target.checked) {
                        setValue('recurrenceType', 'once');
                      }
                    }}
                    className="h-4 w-4 shrink-0 rounded border-gray-300"
                  />
                  <Label htmlFor="isRecurring" className="cursor-pointer text-sm leading-tight">
                    {t('transaction.recurringTransaction') || 'Повторяющаяся транзакция'}
                  </Label>
                </div>
                {isRecurring && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/20 min-w-0">
                    {/* Шаг 1: Выбор типа повторения */}
                    <div>
                      <Label className="text-sm mb-2 block">{t('transaction.recurrenceType') || 'Как часто?'}</Label>
                      <div className="flex flex-wrap gap-2">
                        {(['once', 'daily', 'weekly', 'monthly'] as const).map((type) => (
                          <Button
                            key={type}
                            type="button"
                            variant={recurrenceType === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setValue('recurrenceType', type);
                              if (type !== 'daily') {
                                setValue('recurrenceInterval', 1);
                              }
                            }}
                            className="text-xs h-auto min-h-8 whitespace-normal px-3 py-1.5"
                          >
                            {type === 'once' && (t('transaction.once') || 'Один раз')}
                            {type === 'daily' && (t('transaction.daily') || 'Каждый день')}
                            {type === 'weekly' && (t('transaction.weekly') || 'Каждую неделю')}
                            {type === 'monthly' && (t('transaction.monthly') || 'Каждый месяц')}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {/* Шаг 2: Если выбран daily - выбор интервала и количества дней */}
                    {recurrenceType === 'daily' && (
                      <div className="space-y-3 min-w-0">
                        <div>
                          <Label className="text-sm mb-2 block">{t('transaction.recurrenceInterval') || 'Интервал'}</Label>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 7].map((interval) => (
                              <Button
                                key={interval}
                                type="button"
                                variant={recurrenceInterval === interval ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setValue('recurrenceInterval', interval)}
                                className="text-xs h-auto min-h-8 whitespace-normal px-3 py-1.5"
                              >
                                {interval === 1 && (t('transaction.everyDay') || 'Каждый день')}
                                {interval === 2 && (t('transaction.everyOtherDay') || 'Через день')}
                                {interval === 3 && (t('transaction.every3Days') || 'Каждые 3 дня')}
                                {interval === 4 && (t('transaction.every4Days') || 'Каждые 4 дня')}
                                {interval === 5 && (t('transaction.every5Days') || 'Каждые 5 дней')}
                                {interval === 7 && (t('transaction.everyWeek') || 'Раз в неделю')}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="recurrenceDaysCount" className="text-sm mb-2 block">
                            {t('transaction.howManyDays') || 'На сколько дней создать?'}
                          </Label>
                          <Input
                            id="recurrenceDaysCount"
                            type="number"
                            min="1"
                            max="365"
                            value={recurrenceDaysCount || 30}
                            onChange={(e) => setValue('recurrenceDaysCount', parseInt(e.target.value) || 30)}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('transaction.daysCountHint') || `Будет создано транзакций на ${recurrenceDaysCount || 30} дней`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {t('transaction.saving') || 'Saving...'}
                </>
              ) : (
                t('transaction.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
