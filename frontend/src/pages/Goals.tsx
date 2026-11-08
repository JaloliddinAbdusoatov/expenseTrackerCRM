import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Users, UserPlus, Bell, X, Target } from 'lucide-react';
import { AddGoalDialog } from '@/components/add-goal-dialog';
import { goalsApi, expensesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { convertToUsd, formatCurrency } from '@/lib/currency';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  imageUrl?: string;
  autoAllocatePercent?: number;
}

interface SharedGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  imageUrl?: string;
  isFamilyMode: boolean;
  createdBy: { id: string; username: string; email: string };
  participants: Array<{ id: string; username: string; email: string }>;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [sharedGoals, setSharedGoals] = React.useState<SharedGoal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSharedLoading, setIsSharedLoading] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
  const [amountToAdd, setAmountToAdd] = React.useState<number>(0);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState('personal');
  const [invitations, setInvitations] = React.useState<any[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [selectedGoalForInvite, setSelectedGoalForInvite] = React.useState<SharedGoal | null>(null);
  const [inviteEmailOrUsername, setInviteEmailOrUsername] = React.useState('');
  const [isCreateSharedDialogOpen, setIsCreateSharedDialogOpen] = React.useState(false);
  const [newSharedGoalName, setNewSharedGoalName] = React.useState('');
  const [newSharedGoalTarget, setNewSharedGoalTarget] = React.useState<number>(0);
  const [newSharedGoalParticipants, setNewSharedGoalParticipants] = React.useState<string[]>([]);
  const [newSharedGoalParticipantInput, setNewSharedGoalParticipantInput] = React.useState<string>('');
  const [newSharedGoalInvitedEmail, setNewSharedGoalInvitedEmail] = React.useState<string>('');
  const [newSharedGoalAutoAllocate, setNewSharedGoalAutoAllocate] = React.useState<number>(0);
  const [isInviteRegularGoalDialogOpen, setIsInviteRegularGoalDialogOpen] = React.useState(false);
  const [selectedRegularGoalForInvite, setSelectedRegularGoalForInvite] = React.useState<Goal | null>(null);
  const [inviteRegularGoalEmail, setInviteRegularGoalEmail] = React.useState('');
  const [isContributeDialogOpen, setIsContributeDialogOpen] = React.useState(false);
  const [selectedSharedGoalForContribution, setSelectedSharedGoalForContribution] = React.useState<SharedGoal | null>(null);
  const [contributionAmount, setContributionAmount] = React.useState<number>(0);
  const currency = user?.currency || 'USD';
  const fc = (value: number) => formatCurrency(value, currency, language);
  const toUsd = (value: number) => convertToUsd(value, currency);

  React.useEffect(() => {
    if (user?.id) {
      loadGoals();
      loadInvitations(); // Загружаем приглашения всегда
      if (activeTab === 'shared') {
        loadSharedGoals();
      }
    }
  }, [user?.id, activeTab]);

  const loadGoals = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const [goalsData, balanceData] = await Promise.all([
        goalsApi.getAll(user.id),
        goalsApi.getBalance(user.id).catch(() => ({ balance: 0 })), // Fallback if balance fails
      ]);
      setGoals(goalsData);
      setBalance(balanceData.balance || 0);
    } catch (error: any) {
      console.error('Failed to load goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSharedGoals = async () => {
    if (!user?.id) return;
    try {
      setIsSharedLoading(true);
      const sharedGoalsData = await goalsApi.getShared(user.id);
      setSharedGoals(sharedGoalsData || []);
    } catch (error: any) {
      console.error('Failed to load shared goals:', error);
    } finally {
      setIsSharedLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!user?.id) return;
    try {
      const invitationsData = await goalsApi.getInvitations(user.id, 'received');
      setInvitations(invitationsData || []);
    } catch (error: any) {
      console.error('Failed to load invitations:', error);
    }
  };

  const handleSendInvitation = async () => {
    if (!user?.id || !selectedGoalForInvite || !inviteEmailOrUsername.trim()) return;
    try {
      await goalsApi.sendInvitation(selectedGoalForInvite.id, user.id, inviteEmailOrUsername.trim());
      alert(t('goals.invitationSent') || 'Приглашение отправлено!');
      setIsInviteDialogOpen(false);
      setInviteEmailOrUsername('');
      setSelectedGoalForInvite(null);
    } catch (error: any) {
      alert(`Ошибка: ${error.message || 'Не удалось отправить приглашение'}`);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user?.id) return;
    try {
      const result = await goalsApi.acceptInvitation(invitationId, user.id);
      // Если цель была конвертирована из обычной в совместную, обновляем оба списка
      if (result.converted) {
        await loadGoals(); // Обновляем личные цели (удаленная цель исчезнет)
        await loadSharedGoals(); // Обновляем совместные (новая цель появится)
      } else {
        await loadSharedGoals();
      }
      await loadInvitations();
      alert(t('goals.invitationAccepted') || 'Приглашение принято!');
    } catch (error: any) {
      alert(`Ошибка: ${error.message || 'Не удалось принять приглашение'}`);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    if (!user?.id) return;
    try {
      await goalsApi.rejectInvitation(invitationId, user.id);
      await loadInvitations();
      alert(t('goals.invitationRejected') || 'Приглашение отклонено');
    } catch (error: any) {
      alert(`Ошибка: ${error.message || 'Не удалось отклонить приглашение'}`);
    }
  };

  const handleCreateSharedGoal = async () => {
    if (!user?.id || !newSharedGoalName.trim() || newSharedGoalTarget <= 0) return;
    try {
      // Создаем совместную цель
      const createdGoal = await goalsApi.createShared(
        user.id,
        newSharedGoalName.trim(),
        toUsd(newSharedGoalTarget),
        undefined,
        false
      );

      let totalInvitations = 0;
      let successCount = 0;
      let failCount = 0;

      // Если указан email в поле "Invite by email", отправляем приглашение
      if (newSharedGoalInvitedEmail.trim()) {
        totalInvitations++;
        try {
          await goalsApi.sendInvitation(createdGoal.id, user.id, newSharedGoalInvitedEmail.trim());
          successCount++;
        } catch (error: any) {
          console.warn(`Не удалось пригласить ${newSharedGoalInvitedEmail}:`, error.message);
          failCount++;
        }
      }

      // Если есть участники в массиве, отправляем приглашения
      if (newSharedGoalParticipants.length > 0) {
        totalInvitations += newSharedGoalParticipants.length;
        
        for (const emailOrUsername of newSharedGoalParticipants) {
          try {
            await goalsApi.sendInvitation(createdGoal.id, user.id, emailOrUsername);
            successCount++;
          } catch (error: any) {
            console.warn(`Не удалось пригласить ${emailOrUsername}:`, error.message);
            failCount++;
          }
        }
      }

      if (totalInvitations > 0) {
        if (successCount > 0) {
          alert(t('goals.sharedGoalCreated') + (failCount > 0 ? ` (${successCount} приглашений отправлено, ${failCount} ошибок)` : ` (${successCount} приглашений отправлено)`));
        } else {
          alert(t('goals.sharedGoalCreated') + ` (Не удалось отправить приглашения, но цель создана)`);
        }
      } else {
        alert(t('goals.sharedGoalCreated') || 'Совместная цель создана!');
      }

      setIsCreateSharedDialogOpen(false);
      setNewSharedGoalName('');
      setNewSharedGoalTarget(0);
      setNewSharedGoalParticipants([]);
      setNewSharedGoalParticipantInput('');
      setNewSharedGoalInvitedEmail('');
      setNewSharedGoalAutoAllocate(0);
      await loadSharedGoals();
      await loadInvitations();
    } catch (error: any) {
      alert(`Ошибка: ${error.message || 'Не удалось создать совместную цель'}`);
    }
  };

  const handleAddGoal = async (goal: Omit<Goal, 'id' | 'currentAmount'> & { imageUrl?: string | File; autoAllocatePercent?: number }) => {
    if (!user?.id) return;
    try {
      // Upload photo first if it's a File object
      let imageUrl: string | undefined = undefined;
      const imageUrlValue = goal.imageUrl;
      if (imageUrlValue) {
        if (imageUrlValue instanceof File) {
          try {
            const uploadResult = await expensesApi.uploadPhoto(imageUrlValue);
            imageUrl = uploadResult.path;
          } catch (error: any) {
            console.error('Failed to upload photo:', error);
            alert(`Не удалось загрузить фото: ${error.message || 'Ошибка загрузки'}`);
            return;
          }
        } else if (typeof imageUrlValue === 'string') {
          imageUrl = imageUrlValue;
        }
      }

      const newGoal = await goalsApi.create(user.id, goal.name, toUsd(goal.targetAmount), imageUrl, goal.autoAllocatePercent);
      setGoals(prev => [newGoal, ...prev]);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to create goal:', error);
      throw error;
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.id) return;
    try {
      await goalsApi.delete(goalId, user.id);
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } catch (error: any) {
      console.error('Failed to delete goal:', error);
      alert(`Не удалось удалить цель: ${error.message || 'Ошибка подключения к серверу'}`);
    }
  };

  const handleUpdateProgress = async () => {
    if (!user?.id || !selectedGoal || amountToAdd <= 0) return;
    
    // Validate: amountToAdd should not be negative
    if (amountToAdd < 0) {
      alert('Сумма не может быть отрицательной');
      return;
    }
    
    // Validate: check balance before updating
    try {
      const balanceData = await goalsApi.getBalance(user.id);
      const availableBalance = balanceData.balance || 0;
      
      const amountToAddUsd = toUsd(amountToAdd);

      if (amountToAddUsd > availableBalance) {
        alert(`Недостаточно средств. Доступно: ${fc(availableBalance)}, запрошено: ${fc(amountToAdd)}`);
        return;
      }
      
      const newCurrentAmount = selectedGoal.currentAmount + amountToAddUsd;
      
      // Validate: newCurrentAmount should not exceed targetAmount
      if (newCurrentAmount > selectedGoal.targetAmount) {
        alert(`Сумма не может превышать целевую сумму ${fc(selectedGoal.targetAmount)}`);
        return;
      }
      
      await goalsApi.update(selectedGoal.id, user.id, { currentAmount: newCurrentAmount });
      
      // Reload goals and balance to update progress bars immediately
      await Promise.all([loadGoals(), goalsApi.getBalance(user.id).then(data => setBalance(data.balance || 0))]);
      
      setIsUpdateDialogOpen(false);
      setAmountToAdd(0);
      setSelectedGoal(null);
    } catch (error: any) {
      console.error('Failed to update goal progress:', error);
      alert(`Не удалось обновить прогресс: ${error.message || 'Ошибка подключения к серверу'}`);
    }
  };

  const openUpdateDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    setAmountToAdd(0);
    setIsUpdateDialogOpen(true);
  };

  const handleConfirmContribution = async () => {
    if (!user?.id || !selectedSharedGoalForContribution || contributionAmount <= 0) return;
    try {
      await goalsApi.addContribution(selectedSharedGoalForContribution.id, user.id, toUsd(contributionAmount));
      // Обновляем совместные цели и баланс для немедленного обновления прогресс-баров
      await Promise.all([
        loadSharedGoals(),
        goalsApi.getBalance(user.id).then(data => setBalance(data.balance || 0)),
      ]);
      alert(t('goals.contributionAdded') || 'Вклад добавлен!');
      setIsContributeDialogOpen(false);
      setSelectedSharedGoalForContribution(null);
      setContributionAmount(0);
    } catch (error: any) {
      alert(`Ошибка: ${error.message || 'Не удалось добавить вклад'}`);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t('goals.title')}</h1>
              {invitations.filter((inv: any) => inv.status === 'pending').length > 0 && (
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white flex-shrink-0">
                  {invitations.filter((inv: any) => inv.status === 'pending').length}
                </span>
              )}
            </div>
            {balance !== null && (
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {t('goals.availableBalance')}:{" "}
                <span className="font-semibold text-foreground">
                  {fc(balance)}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <AddGoalDialog
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              onSubmit={handleAddGoal}
            >
              <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto text-sm">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('goals.addNewGoal')}</span>
                <span className="sm:hidden">{t('goals.addNewGoal').split(' ')[0]}</span>
              </Button>
            </AddGoalDialog>
            <Button onClick={() => setIsCreateSharedDialogOpen(true)} variant="outline" className="w-full sm:w-auto text-sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('goals.createSharedGoal')}</span>
              <span className="sm:hidden">{t('goals.createSharedGoal').split(' ')[0]}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Приглашения вверху страницы (уведомления) */}
      {invitations.filter((inv: any) => inv.status === 'pending').length > 0 && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-wrap">
              <Bell className="h-5 w-5 text-primary flex-shrink-0" />
              <span>{t('goals.invitations')}</span>
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white flex-shrink-0">
                {invitations.filter((inv: any) => inv.status === 'pending').length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3">
              {invitations
                .filter((inv: any) => inv.status === 'pending')
                .map((invitation: any) => (
                    <div key={invitation.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg bg-background">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base break-words">
                            {t('goals.invitedTo')}: <span className="text-primary">{invitation.goal?.name || invitation.goalName || 'Unknown Goal'}</span>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {t('goals.from')}: <span className="font-medium">{invitation.invitedBy?.username || invitation.invitedBy?.email || 'Unknown'}</span>
                          </div>
                          {(invitation.goal || invitation.goalName) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {t('goals.target')}: {fc(invitation.goal?.targetAmount || 0)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectInvitation(invitation.id)}
                            className="text-destructive hover:text-destructive flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
                          >
                            {t('common.reject')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            className="bg-primary flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
                          >
                            {t('common.accept')}
                          </Button>
                        </div>
                      </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">{t('goals.personal')}</TabsTrigger>
          <TabsTrigger value="shared" className="relative">
            <Users className="mr-2 h-4 w-4" />
            {t('goals.shared')}
            {invitations.filter((inv: any) => inv.status === 'pending').length > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {invitations.filter((inv: any) => inv.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center text-muted-foreground">{t('goals.loading')}</div>
        ) : goals.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">{t('goals.noGoals')}</div>
        ) : goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <Card key={goal.id} className="flex flex-col">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg break-words">{goal.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      {t('goals.target')}: {fc(goal.targetAmount)}
                      {goal.autoAllocatePercent && goal.autoAllocatePercent > 0 && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          🔄 {goal.autoAllocatePercent} {t('goals.autoAllocate').split(' ')[1]}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 sm:h-8 sm:w-8 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                      onClick={() => {
                        setSelectedRegularGoalForInvite(goal);
                        setIsInviteRegularGoalDialogOpen(true);
                      }}
                      title={t('goals.inviteUser') || 'Пригласить пользователя'}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('goals.deleteConfirm')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('goals.deleteConfirmDesc').replace('{name}', goal.name)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-4 sm:p-6">
                {goal.imageUrl ? (
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md">
                    <img
                      src={(() => {
                        const imgUrl = goal.imageUrl!;
                        if (imgUrl.startsWith('http')) {
                          return imgUrl;
                        }
                        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                        const imgPath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
                        return `${backendUrl}${imgPath}`;
                      })()}
                      alt={goal.name}
                      className="object-cover w-full h-full"
                    />
                    <div
                      className="absolute inset-0 bg-background/70 backdrop-grayscale"
                      style={{
                        clipPath: `inset(0 0 ${100 - progress}% 0)`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <div className="text-4xl font-bold text-primary/50">{goal.name.charAt(0)}</div>
                    <div
                      className="absolute inset-0 bg-background/70 backdrop-grayscale"
                      style={{
                        clipPath: `inset(0 0 ${100 - progress}% 0)`,
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-4xl font-bold text-primary/50">{goal.name.charAt(0)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 p-4 sm:p-6">
                <div className="flex w-full justify-between text-xs sm:text-sm text-muted-foreground">
                  <span className="truncate">{fc(goal.currentAmount)} {t('goals.saved')}</span>
                  <span className="flex-shrink-0 ml-2">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} aria-label={`${progress.toFixed(0)}% towards ${goal.name}`} className="w-full" />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 min-h-[44px] sm:min-h-0"
                  onClick={() => openUpdateDialog(goal)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('goals.addProgress')}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
          </div>
        </TabsContent>

        <TabsContent value="shared" className="mt-4 space-y-6">
          {/* Приглашения во вкладке Shared - показываем ТОЛЬКО если есть pending invitations */}
          {invitations.filter((inv: any) => inv.status === 'pending').length > 0 && (
            <Card className="mb-4 border-primary/20 bg-primary/5">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-wrap">
                  <Bell className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{t('goals.invitations')}</span>
                  <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white flex-shrink-0">
                    {invitations.filter((inv: any) => inv.status === 'pending').length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3">
                  {invitations
                    .filter((inv: any) => inv.status === 'pending')
                    .map((invitation: any) => (
                      <div key={invitation.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg bg-background">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base break-words">
                            {t('goals.invitedTo')}: <span className="text-primary">{invitation.goal?.name || invitation.goalName || 'Unknown Goal'}</span>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {t('goals.from')}: <span className="font-medium">{invitation.invitedBy?.username || invitation.invitedBy?.email || 'Unknown'}</span>
                          </div>
                          {(invitation.goal || invitation.goalName) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {t('goals.target')}: {fc(invitation.goal?.targetAmount || 0)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectInvitation(invitation.id)}
                            className="text-destructive hover:text-destructive flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
                          >
                            {t('common.reject')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            className="bg-primary flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
                          >
                            {t('common.accept')}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Список совместных целей */}
          {isSharedLoading ? (
            <div className="text-center text-muted-foreground py-8">{t('goals.loading')}</div>
          ) : sharedGoals.length > 0 ? (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {sharedGoals.map((goal) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  const isCreator = goal.createdBy.id === user?.id;
                  return (
                  <Card key={goal.id} className="flex flex-col">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                            <span className="break-words">{goal.name}</span>
                            {goal.isFamilyMode && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded flex-shrink-0">
                                {t('goals.familyMode')}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            {t('goals.target')}: {fc(goal.targetAmount)}
                            <div className="mt-1 text-xs">
                              {t('goals.createdBy')}: {goal.createdBy.username || goal.createdBy.email}
                            </div>
                            <div className="mt-1 text-xs">
                              {t('goals.participants')}: {goal.participants.length}
                            </div>
                          </CardDescription>
                        </div>
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                            onClick={() => {
                              setSelectedGoalForInvite(goal);
                              setIsInviteDialogOpen(true);
                            }}
                            title={t('goals.inviteUser') || 'Пригласить пользователя'}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          {isCreator && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('goals.deleteConfirm')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('goals.deleteConfirmDesc').replace('{name}', goal.name)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    if (!user?.id) return;
                                    try {
                                      await goalsApi.deleteShared(goal.id, user.id);
                                      await loadSharedGoals();
                                    } catch (error: any) {
                                      alert(`Ошибка: ${error.message || 'Не удалось удалить цель'}`);
                                    }
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-4 sm:p-6">
                      {goal.imageUrl ? (
                        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md">
                          <img
                            src={(() => {
                              const imgUrl = goal.imageUrl!;
                              if (imgUrl.startsWith('http')) return imgUrl;
                              const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                              const imgPath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
                              return `${backendUrl}${imgPath}`;
                            })()}
                            alt={goal.name}
                            className="object-cover w-full h-full"
                          />
                          <div
                            className="absolute inset-0 bg-background/70 backdrop-grayscale"
                            style={{ clipPath: `inset(0 0 ${100 - progress}% 0)` }}
                          />
                        </div>
                      ) : (
                        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <div className="text-4xl font-bold text-primary/50">{goal.name.charAt(0)}</div>
                          <div
                            className="absolute inset-0 bg-background/70 backdrop-grayscale"
                            style={{ clipPath: `inset(0 0 ${100 - progress}% 0)` }}
                          />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col items-start gap-2 p-4 sm:p-6">
                      <div className="flex w-full justify-between text-xs sm:text-sm text-muted-foreground">
                        <span className="truncate">{fc(goal.currentAmount)} {t('goals.saved')}</span>
                        <span className="flex-shrink-0 ml-2">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 min-h-[44px] sm:min-h-0"
                        onClick={() => {
                          if (!user?.id) return;
                          setSelectedSharedGoalForContribution(goal);
                          setContributionAmount(0);
                          setIsContributeDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('goals.contribute')}
                      </Button>
                    </CardFooter>
                  </Card>
                  );
                })}
              </div>
          ) : (
            // Красивая карточка для пустого состояния
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center justify-center gap-2 text-center text-base sm:text-lg">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <span className="break-words">{t('goals.noSharedGoals')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-center text-muted-foreground py-2 sm:py-4">
                  <p className="text-xs sm:text-sm px-2">
                    {t('goals.noSharedGoalsDesc') || 'Создайте совместную цель или примите приглашение, чтобы начать работать вместе над финансовыми целями.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Update Progress Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('goals.addProgressTitle')}</DialogTitle>
            <DialogDescription>
              {selectedGoal ? t('goals.addProgressDesc').replace('{name}', selectedGoal.name) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                {t('goals.amount')}
              </Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amountToAdd || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountToAdd(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
            {selectedGoal && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{t('goals.currentAmount')}: {fc(selectedGoal.currentAmount)}</div>
                <div>{t('goals.targetAmount')}: {fc(selectedGoal.targetAmount)}</div>
                <div>
                  {t('goals.afterAdding')}: {fc((selectedGoal.currentAmount + amountToAdd) || selectedGoal.currentAmount)}
                </div>
                {balance !== null && (
                  <div className="mt-2 pt-2 border-t text-xs">
                    {t('goals.available')}: {fc(balance)}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleUpdateProgress} 
              disabled={amountToAdd <= 0 || (balance !== null && amountToAdd > balance)}
            >
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute to Shared Goal Dialog */}
      <Dialog open={isContributeDialogOpen} onOpenChange={setIsContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('goals.contribute')}</DialogTitle>
            <DialogDescription>
              {selectedSharedGoalForContribution
                ? (t('goals.contributeAmount') || 'Введите сумму вклада в цель') +
                  ` "${selectedSharedGoalForContribution.name}"`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contribution-amount" className="text-right">
                {t('goals.amount')}
              </Label>
              <Input
                id="contribution-amount"
                type="number"
                min="0"
                step="0.01"
                value={contributionAmount || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setContributionAmount(parseFloat(e.target.value) || 0)
                }
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsContributeDialogOpen(false);
                setSelectedSharedGoalForContribution(null);
                setContributionAmount(0);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmContribution} disabled={contributionAmount <= 0}>
              {t('goals.contribute')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог приглашения */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('goals.inviteUser')}</DialogTitle>
            <DialogDescription>
              {t('goals.inviteUserDesc')} {selectedGoalForInvite?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invite" className="text-right">
                {t('goals.emailOrUsername')}
              </Label>
              <Input
                id="invite"
                type="text"
                value={inviteEmailOrUsername}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmailOrUsername(e.target.value)}
                className="col-span-3"
                placeholder="email@example.com или username"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsInviteDialogOpen(false);
              setInviteEmailOrUsername('');
              setSelectedGoalForInvite(null);
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSendInvitation} disabled={!inviteEmailOrUsername.trim()}>
              {t('goals.sendInvitation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог создания совместной цели */}
      <Dialog open={isCreateSharedDialogOpen} onOpenChange={setIsCreateSharedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('goals.createSharedGoal')}</DialogTitle>
            <DialogDescription>
              {t('goals.createSharedGoalDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sharedGoalName">
                {t('goals.goalName')}
              </Label>
              <Input
                id="sharedGoalName"
                type="text"
                value={newSharedGoalName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSharedGoalName(e.target.value)}
                placeholder={t('goals.goalNamePlaceholder') || 'Название цели'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharedGoalTarget">
                {t('goals.goalTarget')}
              </Label>
              <Input
                id="sharedGoalTarget"
                type="number"
                min="0"
                step="0.01"
                value={newSharedGoalTarget || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSharedGoalTarget(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharedGoalAutoAllocate">
                {t('goals.autoAllocate')}
              </Label>
              <Input
                id="sharedGoalAutoAllocate"
                type="number"
                min="0"
                max="100"
                value={newSharedGoalAutoAllocate || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSharedGoalAutoAllocate(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                {t('goals.autoAllocateDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharedGoalInvitedEmail">
                {t('goals.inviteEmail')}
              </Label>
              <Input
                id="sharedGoalInvitedEmail"
                type="email"
                value={newSharedGoalInvitedEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSharedGoalInvitedEmail(e.target.value)}
                placeholder={t('goals.inviteEmailPlaceholder') || 'email@example.com (необязательно)'}
              />
              <p className="text-xs text-muted-foreground">
                {t('goals.inviteEmailHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharedGoalParticipants">
                {t('goals.participants')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="sharedGoalParticipants"
                  type="text"
                  value={newSharedGoalParticipantInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSharedGoalParticipantInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter' && newSharedGoalParticipantInput.trim()) {
                      e.preventDefault();
                      const value = newSharedGoalParticipantInput.trim();
                      if (!newSharedGoalParticipants.includes(value)) {
                        setNewSharedGoalParticipants([...newSharedGoalParticipants, value]);
                        setNewSharedGoalParticipantInput('');
                      }
                    }
                  }}
                  placeholder={t('goals.participantsPlaceholder') || 'email@example.com или username (Enter для добавления)'}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newSharedGoalParticipantInput.trim()) {
                      const value = newSharedGoalParticipantInput.trim();
                      if (!newSharedGoalParticipants.includes(value)) {
                        setNewSharedGoalParticipants([...newSharedGoalParticipants, value]);
                        setNewSharedGoalParticipantInput('');
                      }
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newSharedGoalParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newSharedGoalParticipants.map((participant, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                    >
                      <span>{participant}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSharedGoalParticipants(newSharedGoalParticipants.filter((_, i) => i !== index));
                        }}
                        className="ml-1 hover:text-destructive rounded-full p-0.5 hover:bg-destructive/10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('goals.participantsHint')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateSharedDialogOpen(false);
              setNewSharedGoalName('');
              setNewSharedGoalTarget(0);
              setNewSharedGoalParticipants([]);
              setNewSharedGoalParticipantInput('');
              setNewSharedGoalInvitedEmail('');
              setNewSharedGoalAutoAllocate(0);
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateSharedGoal} disabled={!newSharedGoalName.trim() || newSharedGoalTarget <= 0}>
              {t('goals.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог приглашения в обычную цель */}
      <Dialog open={isInviteRegularGoalDialogOpen} onOpenChange={setIsInviteRegularGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('goals.inviteUser')}</DialogTitle>
            <DialogDescription>
              {t('goals.inviteUserDesc')} {selectedRegularGoalForInvite?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteRegularGoal">
                {t('goals.emailOrUsername')}
              </Label>
              <Input
                id="inviteRegularGoal"
                type="text"
                value={inviteRegularGoalEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteRegularGoalEmail(e.target.value)}
                placeholder="email@example.com или username"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsInviteRegularGoalDialogOpen(false);
              setInviteRegularGoalEmail('');
              setSelectedRegularGoalForInvite(null);
            }}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={async () => {
                if (!user?.id || !selectedRegularGoalForInvite || !inviteRegularGoalEmail.trim()) return;
                try {
                  await goalsApi.sendInvitationToRegularGoal(selectedRegularGoalForInvite.id, user.id, inviteRegularGoalEmail.trim());
                  alert(t('goals.invitationSent') || 'Приглашение отправлено!');
                  setIsInviteRegularGoalDialogOpen(false);
                  setInviteRegularGoalEmail('');
                  setSelectedRegularGoalForInvite(null);
                  await loadInvitations();
                } catch (error: any) {
                  alert(`Ошибка: ${error.message || 'Не удалось отправить приглашение'}`);
                }
              }} 
              disabled={!inviteRegularGoalEmail.trim()}
            >
              {t('goals.sendInvitation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
