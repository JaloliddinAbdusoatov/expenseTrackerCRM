import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { expensesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/currency';
import { Edit2, Merge, Trash2, FolderOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Category {
  name: string;
  count: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  emotion?: string;
}

type CategoryManagementProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory?: string | null;
};

export function CategoryManagement({ open, onOpenChange, selectedCategory: initialCategory }: CategoryManagementProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const fc = (value: number) => formatCurrency(value, user?.currency || 'USD', language);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [viewingTransactions, setViewingTransactions] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [moveTransactionsDialogOpen, setMoveTransactionsDialogOpen] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      loadCategories();
    }
  }, [open, user?.id]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (user?.id) {
      loadCategories();
    }
  }, [user?.id]);

  const loadCategories = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await expensesApi.getCategories(user.id);
      setCategories(data);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async () => {
    if (!user?.id || !selectedCategory || !newCategoryName.trim()) return;
    try {
      await expensesApi.renameCategory(user.id, selectedCategory, newCategoryName.trim());
      await loadCategories();
      setRenameDialogOpen(false);
      const oldCategoryName = selectedCategory;
      setSelectedCategory(null);
      setNewCategoryName('');
      // Если просматривали переименованную категорию, обновить название
      if (viewingTransactions === oldCategoryName) {
        setViewingTransactions(newCategoryName.trim());
        await loadTransactions(newCategoryName.trim());
      }
    } catch (error: any) {
      console.error('Failed to rename category:', error);
      alert(t('categories.renameError') || 'Не удалось переименовать категорию.');
    }
  };

  const handleMerge = async () => {
    if (!user?.id || !selectedCategory || !targetCategory || selectedCategory === targetCategory) return;
    try {
      await expensesApi.mergeCategories(user.id, selectedCategory, targetCategory);
      await loadCategories();
      setMergeDialogOpen(false);
      setSelectedCategory(null);
      setTargetCategory('');
      // Если просматривали транзакции объединенной категории, закрыть просмотр
      // После объединения исходная категория исчезнет (0 транзакций)
      if (viewingTransactions === selectedCategory) {
        handleBackToCategories();
      }
      // Закрыть модальное окно после объединения, если просматривали эту категорию
      if (viewingTransactions === selectedCategory) {
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Failed to merge categories:', error);
      alert(t('categories.mergeError') || 'Не удалось объединить категории.');
    }
  };

  const loadTransactions = async (categoryName: string) => {
    if (!user?.id) return;
    try {
      setIsLoadingTransactions(true);
      const allExpenses = await expensesApi.getExpenses(user.id);
      const categoryExpenses = allExpenses.filter((exp: any) => exp.category === categoryName);
      setTransactions(categoryExpenses.map((exp: any) => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        category: exp.category,
        emotion: exp.emotion,
      })));
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleViewTransactions = (categoryName: string) => {
    setViewingTransactions(categoryName);
    setSelectedCategory(categoryName);
    loadTransactions(categoryName);
    setSelectedTransactionIds(new Set());
  };

  const handleBackToCategories = () => {
    setViewingTransactions(null);
    setTransactions([]);
    setSelectedTransactionIds(new Set());
  };

  const toggleTransactionSelection = (transactionId: string) => {
    const newSelection = new Set(selectedTransactionIds);
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId);
    } else {
      newSelection.add(transactionId);
    }
    setSelectedTransactionIds(newSelection);
  };

  const handleMoveTransactions = async () => {
    if (!user?.id || !viewingTransactions || !targetCategory || selectedTransactionIds.size === 0) return;
    try {
      await expensesApi.updateTransactionCategory(user.id, Array.from(selectedTransactionIds), targetCategory);
      await loadTransactions(viewingTransactions);
      await loadCategories();
      setSelectedTransactionIds(new Set());
      setMoveTransactionsDialogOpen(false);
      setTargetCategory('');
      
      // Если после переноса в категории не осталось транзакций, вернуться к списку категорий
      const remainingTransactions = await expensesApi.getExpenses(user.id);
      const categoryTransactions = remainingTransactions.filter((exp: any) => exp.category === viewingTransactions);
      if (categoryTransactions.length === 0) {
        handleBackToCategories();
      }
    } catch (error: any) {
      console.error('Failed to move transactions:', error);
      alert(t('categories.moveError') || 'Не удалось перенести транзакции.');
    }
  };

  const openRenameDialog = (category: string) => {
    setSelectedCategory(category);
    setNewCategoryName(category);
    setRenameDialogOpen(true);
  };

  const openMergeDialog = (category: string) => {
    setSelectedCategory(category);
    setTargetCategory('');
    setMergeDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <DialogTitle>{t('categories.title')}</DialogTitle>
            </div>
            <DialogDescription>
              {t('categories.description')}
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('categories.noCategories')}</p>
            </div>
          ) : viewingTransactions ? (
            // View transactions for selected category
            <div className="space-y-4">
              {/* Category Management Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToCategories}
                    className="h-8"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {t('categories.back')}
                  </Button>
                  <span className="font-semibold text-lg">{viewingTransactions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRenameDialog(viewingTransactions)}
                    className="h-8"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    {t('categories.rename')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMergeDialog(viewingTransactions)}
                    className="h-8"
                    disabled={categories.length <= 1}
                  >
                    <Merge className="h-4 w-4 mr-1" />
                    {t('categories.merge')}
                  </Button>
                  {selectedTransactionIds.size > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setTargetCategory('');
                        setMoveTransactionsDialogOpen(true);
                      }}
                      className="h-8"
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      {t('categories.moveSelected')} ({selectedTransactionIds.size})
                    </Button>
                  )}
                </div>
              </div>
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('categories.noTransactions')}</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedTransactionIds.has(transaction.id)}
                          onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {fc(transaction.amount)} • {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {categories
                .sort((a, b) => {
                  // Если есть выбранная категория, показываем её первой
                  if (selectedCategory === a.name) return -1;
                  if (selectedCategory === b.name) return 1;
                  return b.count - a.count;
                })
                .map((category) => (
                <div
                  key={category.name}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                    selectedCategory === category.name ? 'bg-primary/10 border-primary' : ''
                  }`}
                  onClick={() => handleViewTransactions(category.name)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-semibold">
                      {category.count}
                    </Badge>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRenameDialog(category.name)}
                      className="h-8"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      {t('categories.rename')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openMergeDialog(category.name)}
                      className="h-8"
                      disabled={categories.length <= 1}
                    >
                      <Merge className="h-4 w-4 mr-1" />
                      {t('categories.merge')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Category Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.renameTitle')}</DialogTitle>
            <DialogDescription>
              {t('categories.renameDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newCategoryName">{t('categories.newName')}</Label>
              <Input
                id="newCategoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('categories.newNamePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRename} disabled={!newCategoryName.trim()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Category Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.mergeTitle')}</DialogTitle>
            <DialogDescription>
              {t('categories.mergeDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('categories.sourceCategory')}</Label>
              <div className="p-2 border rounded-md bg-muted">
                {selectedCategory}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetCategory">{t('categories.targetCategory')}</Label>
              <Select value={targetCategory} onValueChange={setTargetCategory}>
                <SelectTrigger id="targetCategory">
                  <SelectValue placeholder={t('categories.selectTargetCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => cat.name !== selectedCategory)
                    .map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name} ({category.count})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleMerge} disabled={!targetCategory || targetCategory === selectedCategory}>
              {t('categories.merge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Transactions Dialog */}
      <Dialog open={moveTransactionsDialogOpen} onOpenChange={setMoveTransactionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.moveTransactionsTitle')}</DialogTitle>
            <DialogDescription>
              {t('categories.moveTransactionsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="moveTargetCategory">{t('categories.targetCategory')}</Label>
              <Select value={targetCategory} onValueChange={setTargetCategory}>
                <SelectTrigger id="moveTargetCategory">
                  <SelectValue placeholder={t('categories.selectTargetCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => cat.name !== viewingTransactions)
                    .map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name} ({category.count})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('categories.selectedCount').replace('{count}', selectedTransactionIds.size.toString())}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setMoveTransactionsDialogOpen(false);
              setTargetCategory('');
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleMoveTransactions} disabled={!targetCategory || selectedTransactionIds.size === 0}>
              {t('categories.move')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
