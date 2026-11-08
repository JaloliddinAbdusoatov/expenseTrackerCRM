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
import type { Goal } from '@/lib/types';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  imageUrl: z.union([z.string(), z.instanceof(File)]).optional(),
  autoAllocatePercent: z.number().min(0).max(100).optional(),
});

type FormData = z.infer<typeof goalSchema>;

type AddGoalDialogProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Goal, 'id' | 'currentAmount' | 'imageHint' | 'imageUrl'> & { imageUrl?: string | File }) => void;
};

export function AddGoalDialog({ children, open, onOpenChange, onSubmit }: AddGoalDialogProps) {
  const { t } = useLanguage();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: 0,
      imageUrl: '',
      autoAllocatePercent: 0,
    },
  });

  const photo = watch('imageUrl');

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store the File object instead of base64
      setValue('imageUrl', file as any, { shouldValidate: true });
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogHeader>
            <DialogTitle>{t('goals.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('goals.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="name" className="sm:text-right">
                {t('goals.nameLabel')}
              </Label>
              <Input id="name" {...register('name')} className="sm:col-span-3" />
              {errors.name && <p className="sm:col-span-4 sm:text-right text-red-500 text-xs">{errors.name.message || t('goals.nameRequired')}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="targetAmount" className="sm:text-right">
                {t('goals.targetAmountLabel')}
              </Label>
              <Input id="targetAmount" type="number" {...register('targetAmount', { valueAsNumber: true })} placeholder="0.00" className="sm:col-span-3" />
              {errors.targetAmount && <p className="sm:col-span-4 sm:text-right text-red-500 text-xs">{errors.targetAmount.message || t('goals.targetPositive')}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="autoAllocatePercent" className="sm:text-right">
                {t('goals.autoAllocate')}
              </Label>
              <div className="sm:col-span-3">
                <Input 
                  id="autoAllocatePercent" 
                  type="number" 
                  min="0"
                  max="100"
                  {...register('autoAllocatePercent', { valueAsNumber: true })} 
                  placeholder="0" 
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('goals.autoAllocateDesc')}
                </p>
              </div>
              {errors.autoAllocatePercent && <p className="sm:col-span-4 sm:text-right text-red-500 text-xs">{errors.autoAllocatePercent.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label className="sm:text-right">Image</Label>
                <div className="sm:col-span-3">
                    <Button asChild variant="outline" className="w-full justify-start font-normal text-muted-foreground">
                    <label htmlFor="goal-image-upload" className="cursor-pointer">
                        <Paperclip className="mr-2 h-4 w-4" />
                        {photo ? t('goals.changePhoto') : t('goals.uploadPhoto')}
                        <input id="goal-image-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} />
                    </label>
                    </Button>
                </div>
            </div>
            {photo && (
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                  <Label className="sm:text-right pt-2">{t('goals.preview')}</Label>
                  <div className="sm:col-span-3 relative aspect-video">
                    <img 
                      src={photo instanceof File ? URL.createObjectURL(photo) : photo} 
                      alt="Goal preview" 
                      className="rounded-md object-cover w-full h-full" 
                    />
                  </div>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">{t('goals.addGoal')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
