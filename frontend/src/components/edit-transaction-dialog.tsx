import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '@/contexts/LanguageContext';

const editTransactionSchema = z.object({
  description: z.string().min(1),
  note: z.string().optional(),
});

type FormData = z.infer<typeof editTransactionSchema>;

type EditTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { description: string; note?: string }) => void;
  transaction: {
    description: string;
    note?: string;
  } | null;
};

export function EditTransactionDialog({ open, onOpenChange, onSubmit, transaction }: EditTransactionDialogProps) {
  const { t } = useLanguage();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      description: '',
      note: '',
    },
  });

  useEffect(() => {
    if (transaction) {
      reset({
        description: transaction.description,
        note: transaction.note || '',
      });
    }
  }, [transaction, open, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      description: data.description,
      note: data.note?.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogHeader>
            <DialogTitle>{t('dashboard.editTransaction')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.editTransactionDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="description" className="sm:text-right">
                {t('transaction.name')}
              </Label>
              <Input
                id="description"
                {...register('description')}
                className="sm:col-span-3"
              />
              {errors.description && (
                <p className="sm:col-span-4 sm:text-right text-red-500 text-xs">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label htmlFor="note" className="sm:text-right pt-2">
                {t('transaction.note')}
              </Label>
              <Textarea
                id="note"
                {...register('note')}
                placeholder={t('transaction.notePlaceholder')}
                className="sm:col-span-3 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
