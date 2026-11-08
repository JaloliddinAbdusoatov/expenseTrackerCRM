import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './goal.entity';
import { SharedGoal, SharedGoalContribution, SharedGoalInvitation, InvitationStatus } from './shared-goal.entity';
import { Expense } from '../chat/expense.entity';
import { Income } from '../chat/income.entity';
import { UsersService } from '../users/users.service';
import { ChallengesService } from '../challenges/challenges.service';
import { AchievementsService } from '../achievements/achievements.service';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

interface CreateGoalDto {
  name: string;
  targetAmount: number;
  imageUrl?: string;
  autoAllocatePercent?: number;
}

interface UpdateGoalDto {
  currentAmount?: number;
  targetAmount?: number;
  name?: string;
  imageUrl?: string;
  autoAllocatePercent?: number;
}

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
    @InjectRepository(SharedGoal)
    private readonly sharedGoalRepo: Repository<SharedGoal>,
    @InjectRepository(SharedGoalContribution)
    private readonly contributionRepo: Repository<SharedGoalContribution>,
    @InjectRepository(SharedGoalInvitation)
    private readonly invitationRepo: Repository<SharedGoalInvitation>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Income)
    private readonly incomeRepo: Repository<Income>,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ChallengesService))
    private readonly challengesService: ChallengesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async createGoal(userId: string, dto: CreateGoalDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const goal = this.goalRepo.create({
      user,
      name: dto.name,
      targetAmount: dto.targetAmount,
      currentAmount: 0,
      imageUrl: dto.imageUrl,
      autoAllocatePercent: dto.autoAllocatePercent || 0,
    });
    const savedGoal = await this.goalRepo.save(goal);

    // Achievement: first goal created
    this.achievementsService
      .giveFirstGoalCreated(user)
      .catch((error) => console.error('Failed to create first_goal_created achievement:', error));

    // Automatically create or join challenge with similar goals
    // This runs asynchronously to not block goal creation
    this.challengesService
      .findOrCreateChallengeForGoal(savedGoal.id, userId, dto.targetAmount)
      .catch((error) => {
        console.error('Failed to create/join challenge for goal:', error);
      });

    return savedGoal;
  }

  async getUserGoals(userId: string) {
    return this.goalRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Calculate user's available balance
   * Balance = Total Income - Total Expenses - Total Amount in Goals
   */
  async getUserBalance(userId: string): Promise<number> {
    // Get total income
    const incomes = await this.incomeRepo.find({
      where: { user: { id: userId } },
    });
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

    // Get total expenses
    const expenses = await this.expenseRepo.find({
      where: { user: { id: userId } },
    });
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Get total amount allocated to goals
    const goals = await this.goalRepo.find({
      where: { user: { id: userId } },
    });
    const totalInGoals = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

    // Balance = Income - Expenses - Amount in Goals
    const balance = totalIncome - totalExpenses - totalInGoals;
    
    console.log(`💰 User ${userId} balance: Income=${totalIncome}, Expenses=${totalExpenses}, InGoals=${totalInGoals}, Balance=${balance}`);
    
    // Не ограничиваем баланс до 0, чтобы видеть реальное состояние
    // Отрицательный баланс означает, что пользователь потратил больше, чем заработал
    return balance;
  }

  async updateGoal(goalId: string, userId: string, dto: UpdateGoalDto) {
    const goal = await this.goalRepo.findOne({
      where: { id: goalId, user: { id: userId } },
    });
    if (!goal) {
      throw new Error('Goal not found');
    }

    const currentAmountChanged = dto.currentAmount !== undefined && dto.currentAmount !== goal.currentAmount;
    const wasCompleted = goal.currentAmount >= goal.targetAmount;
    const oldTargetAmount = goal.targetAmount;
    const oldImageUrl = goal.imageUrl;

    // If imageUrl is being updated, delete old photo file
    if (dto.imageUrl !== undefined && dto.imageUrl !== goal.imageUrl && oldImageUrl) {
      // Only delete if old image is from our server (not placeholder or external URL)
      if (oldImageUrl.includes('/uploads/photos/') || oldImageUrl.startsWith('uploads/photos/')) {
        try {
          let photoPath = oldImageUrl;
          if (photoPath.includes('/uploads/photos/')) {
            photoPath = photoPath.replace(/.*\/uploads\/photos\//, '');
          } else if (photoPath.startsWith('uploads/photos/')) {
            photoPath = photoPath.replace('uploads/photos/', '');
          }
          const fullPath = join(process.cwd(), 'uploads', 'photos', photoPath);
          if (existsSync(fullPath)) {
            unlinkSync(fullPath);
            console.log(`Deleted old goal photo file: ${fullPath}`);
          }
        } catch (error) {
          console.error('Error deleting old goal photo file:', error);
          // Continue with update even if photo deletion fails
        }
      }
    }

    // If currentAmount is being updated manually, check balance and limits
    if (dto.currentAmount !== undefined && dto.currentAmount !== goal.currentAmount) {
      // How much we are trying to add (can be negative if reducing)
      const amountToAdd = dto.currentAmount - goal.currentAmount;

      // If user is adding money to the goal – check balance
      if (amountToAdd > 0) {
        const balance = await this.getUserBalance(userId);

        // Validate: we cannot add more than the available balance
        if (amountToAdd > balance) {
          throw new Error(
            `Недостаточно средств. Доступно: $${balance.toLocaleString()}, запрошено: $${amountToAdd.toLocaleString()}`,
          );
        }
      }

      // Validate: currentAmount should not be negative
      if (dto.currentAmount < 0) {
        throw new Error('Сумма не может быть отрицательной');
      }

      // Validate: currentAmount should not exceed targetAmount
      if (dto.currentAmount > goal.targetAmount) {
        throw new Error(
          `Сумма не может превышать целевую сумму $${goal.targetAmount.toLocaleString()}`,
        );
      }
    }

    if (dto.currentAmount !== undefined) {
      goal.currentAmount = dto.currentAmount;
    }
    if (dto.targetAmount !== undefined) {
      goal.targetAmount = dto.targetAmount;
    }
    if (dto.name !== undefined) {
      goal.name = dto.name;
    }
    if (dto.imageUrl !== undefined) {
      goal.imageUrl = dto.imageUrl;
    }
    if (dto.autoAllocatePercent !== undefined) {
      goal.autoAllocatePercent = dto.autoAllocatePercent;
    }

    const savedGoal = await this.goalRepo.save(goal);

    // Sync challenge progress if currentAmount changed
    if (currentAmountChanged) {
      // Find challenges where user participates with similar target amount
      this.challengesService
        .syncGoalProgress(userId, savedGoal.id, savedGoal.currentAmount, savedGoal.targetAmount)
        .catch((error) => {
          console.error('Failed to sync challenge progress:', error);
        });
    }

    // Achievement: first goal completed (only when crossing the target)
    const isCompletedNow = savedGoal.currentAmount >= savedGoal.targetAmount;
    if (!wasCompleted && isCompletedNow) {
      const user = await this.usersService.findById(userId);
      if (user) {
        this.achievementsService
          .giveFirstGoalCompleted(user, savedGoal.name, savedGoal.targetAmount)
          .catch((error) =>
            console.error('Failed to create first_goal_completed achievement:', error),
          );
      }
    }

    return savedGoal;
  }

  async deleteGoal(goalId: string, userId: string) {
    const goal = await this.goalRepo.findOne({
      where: { id: goalId, user: { id: userId } },
    });
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Delete photo file if exists and is from our server
    console.log(`🔍 deleteGoal called for goalId: ${goalId}, userId: ${userId}`);
    console.log(`🔍 Goal imageUrl: ${goal.imageUrl}`);
    if (goal.imageUrl) {
      console.log(`🔍 Attempting to delete goal photo. imageUrl: ${goal.imageUrl}`);
      try {
        // Extract filename from imageUrl (can be full URL or relative path)
        let filename = '';
        
        // Try to extract filename using regex (works for both full URLs and relative paths)
        const match = goal.imageUrl.match(/\/uploads\/photos\/([^\/\?]+)/);
        if (match && match[1]) {
          filename = match[1];
          console.log(`🔍 Extracted filename: ${filename}`);
        } else {
          // Fallback: try to get last part after last slash
          const parts = goal.imageUrl.split('/');
          filename = parts[parts.length - 1];
          // Remove query parameters if any
          filename = filename.split('?')[0];
          console.log(`🔍 Extracted filename (fallback): ${filename}`);
        }
        
        // Only proceed if we have a valid filename (not external URL or placeholder)
        if (filename && filename.length > 0 && !filename.startsWith('http') && !filename.includes('://') && !filename.includes('ui-avatars.com') && filename.includes('.')) {
          const fullPath = join(process.cwd(), 'uploads', 'photos', filename);
          console.log(`🔍 Full path to delete: ${fullPath}`);
          console.log(`🔍 Current working directory: ${process.cwd()}`);
          console.log(`🔍 File exists: ${existsSync(fullPath)}`);
          
          if (existsSync(fullPath)) {
            unlinkSync(fullPath);
            console.log(`✅ Deleted goal photo file: ${fullPath}`);
          } else {
            console.warn(`⚠️ Goal photo file not found: ${fullPath}`);
            // List files in directory for debugging
            try {
              const { readdirSync } = require('fs');
              const files = readdirSync(join(process.cwd(), 'uploads', 'photos'));
              console.log(`📁 Files in uploads/photos: ${files.join(', ')}`);
            } catch (e) {
              console.error('Could not list files:', e);
            }
          }
        } else {
          console.warn(`⚠️ Skipping deletion - invalid filename: ${filename}`);
        }
      } catch (error) {
        console.error('❌ Error deleting goal photo file:', error);
        // Continue with deletion even if photo deletion fails
      }
    } else {
      console.log(`ℹ️ Goal has no imageUrl, skipping photo deletion`);
    }
    
    // При удалении незавершённой цели (не 100%) вся сумма currentAmount должна вернуться в баланс
    // Баланс = Доходы - Расходы - Сумма в целях
    // При удалении цели сумма в целях уменьшается, баланс автоматически увеличивается
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    const amountToReturn = goal.currentAmount;
    
    const balanceBefore = await this.getUserBalance(userId);
    const goalsBefore = await this.goalRepo.find({
      where: { user: { id: userId } },
    });
    const totalInGoalsBefore = goalsBefore.reduce((sum, g) => sum + g.currentAmount, 0);
    
    console.log(`🔄 Удаление цели: "${goal.name}"`);
    console.log(`📊 Статус цели: ${isCompleted ? 'ЗАВЕРШЕНА (100%)' : `НЕ ЗАВЕРШЕНА (${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%)`}`);
    console.log(`💰 Сумма в цели: ${amountToReturn} из ${goal.targetAmount}`);
    console.log(`💰 Баланс до удаления цели: ${balanceBefore}`);
    console.log(`💰 Общая сумма в целях до удаления: ${totalInGoalsBefore}`);
    
    if (!isCompleted && amountToReturn > 0) {
      console.log(`✅ Цель не завершена - сумма ${amountToReturn} вернётся в баланс при удалении`);
    } else if (isCompleted) {
      console.log(`ℹ️ Цель завершена (100%) - сумма ${amountToReturn} всё равно вернётся в баланс`);
    }
    
    // Удаляем цель
    await this.goalRepo.remove(goal);
    
    // Баланс автоматически пересчитается при следующем запросе
    // Формула: Balance = Income - Expenses - InGoals
    // После удаления цели InGoals уменьшится на amountToReturn, баланс увеличится на amountToReturn
    const balanceAfter = await this.getUserBalance(userId);
    const goalsAfter = await this.goalRepo.find({
      where: { user: { id: userId } },
    });
    const totalInGoalsAfter = goalsAfter.reduce((sum, g) => sum + g.currentAmount, 0);
    
    console.log(`💰 Баланс после удаления цели: ${balanceAfter}`);
    console.log(`💰 Общая сумма в целях после удаления: ${totalInGoalsAfter}`);
    console.log(`💰 Ожидаемое увеличение баланса: ${amountToReturn}, фактическое: ${balanceAfter - balanceBefore}`);
    
    // Проверяем, что баланс увеличился правильно
    const expectedBalanceIncrease = amountToReturn;
    const actualBalanceIncrease = balanceAfter - balanceBefore;
    
    if (Math.abs(actualBalanceIncrease - expectedBalanceIncrease) > 0.01) {
      console.warn(`⚠️ Несоответствие баланса! Ожидалось увеличение на ${expectedBalanceIncrease}, фактическое: ${actualBalanceIncrease}`);
    } else {
      console.log(`✅ Баланс корректно увеличился на ${amountToReturn} (сумма вернулась из цели)`);
    }
    
    return { success: true, amountReturned: amountToReturn, wasCompleted: isCompleted };
  }

  // ========== Совместные цели ==========

  async createSharedGoal(userId: string, dto: { name: string; targetAmount: number; imageUrl?: string; isFamilyMode?: boolean; participantIds?: string[] }) {
    const creator = await this.usersService.findById(userId);
    if (!creator) {
      throw new Error('User not found');
    }

    const participants = [creator];
    if (dto.participantIds && dto.participantIds.length > 0) {
      for (const participantId of dto.participantIds) {
        const participant = await this.usersService.findById(participantId);
        if (participant && participant.id !== userId) {
          participants.push(participant);
        }
      }
    }

    const sharedGoal = this.sharedGoalRepo.create({
      createdBy: creator,
      participants,
      name: dto.name,
      targetAmount: dto.targetAmount,
      currentAmount: 0,
      imageUrl: dto.imageUrl,
      isFamilyMode: dto.isFamilyMode || false,
    });

    return this.sharedGoalRepo.save(sharedGoal);
  }

  async getSharedGoals(userId: string) {
    return this.sharedGoalRepo.find({
      where: [
        { createdBy: { id: userId } },
        { participants: { id: userId } },
      ],
      relations: ['createdBy', 'participants', 'contributions', 'contributions.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async addContribution(goalId: string, userId: string, amount: number) {
    const goal = await this.sharedGoalRepo.findOne({
      where: { id: goalId },
      relations: ['participants', 'contributions'],
    });

    if (!goal) {
      throw new Error('Shared goal not found');
    }

    // Проверяем, что пользователь является участником
    const isParticipant = goal.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new Error('User is not a participant of this goal');
    }

    // Проверяем баланс (как при добавлении в личную цель)
    const balance = await this.getUserBalance(userId);
    if (amount > balance) {
      throw new Error(
        `Insufficient balance. Available: $${balance.toFixed(2)}, requested: $${amount.toFixed(2)}`,
      );
    }

    // Проверяем, не превысит ли это целевую сумму
    if (goal.currentAmount + amount > goal.targetAmount) {
      const maxAmount = goal.targetAmount - goal.currentAmount;
      throw new Error(`Amount exceeds target. Maximum contribution: $${maxAmount.toFixed(2)}`);
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Создаем вклад
    const contribution = this.contributionRepo.create({
      goal,
      user,
      amount,
    });

    await this.contributionRepo.save(contribution);

    // Обновляем текущую сумму цели
    goal.currentAmount += amount;
    await this.sharedGoalRepo.save(goal);

    return { success: true, contribution, goal };
  }

  async getGoalContributions(goalId: string) {
    const contributions = await this.contributionRepo.find({
      where: { goal: { id: goalId } },
      relations: ['user', 'goal'],
      order: { createdAt: 'DESC' },
    });

    // Группируем по пользователям
    const byUser = new Map<string, { user: any; total: number; contributions: any[] }>();
    
    for (const contrib of contributions) {
      const userId = contrib.user.id;
      if (!byUser.has(userId)) {
        byUser.set(userId, {
          user: contrib.user,
          total: 0,
          contributions: [],
        });
      }
      const userData = byUser.get(userId)!;
      userData.total += contrib.amount;
      userData.contributions.push(contrib);
    }

    return Array.from(byUser.values());
  }

  async addParticipant(goalId: string, userId: string, newParticipantId: string) {
    const goal = await this.sharedGoalRepo.findOne({
      where: { id: goalId },
      relations: ['participants', 'createdBy'],
    });

    if (!goal) {
      throw new Error('Shared goal not found');
    }

    // Проверяем права (только создатель может добавлять участников)
    if (goal.createdBy.id !== userId) {
      throw new Error('Only goal creator can add participants');
    }

    const newParticipant = await this.usersService.findById(newParticipantId);
    if (!newParticipant) {
      throw new Error('Participant not found');
    }

    // Проверяем, не добавлен ли уже
    if (goal.participants.some(p => p.id === newParticipantId)) {
      throw new Error('User is already a participant');
    }

    goal.participants.push(newParticipant);
    return this.sharedGoalRepo.save(goal);
  }

  async removeParticipant(goalId: string, userId: string, participantIdToRemove: string) {
    const goal = await this.sharedGoalRepo.findOne({
      where: { id: goalId },
      relations: ['participants', 'createdBy'],
    });

    if (!goal) {
      throw new Error('Shared goal not found');
    }

    // Проверяем права (только создатель может удалять участников, или участник может удалить себя)
    if (goal.createdBy.id !== userId && participantIdToRemove !== userId) {
      throw new Error('Only goal creator can remove participants');
    }

    // Нельзя удалить создателя
    if (participantIdToRemove === goal.createdBy.id) {
      throw new Error('Cannot remove goal creator');
    }

    goal.participants = goal.participants.filter(p => p.id !== participantIdToRemove);
    return this.sharedGoalRepo.save(goal);
  }

  async deleteSharedGoal(goalId: string, userId: string) {
    const goal = await this.sharedGoalRepo.findOne({
      where: { id: goalId },
      relations: ['createdBy'],
    });

    if (!goal) {
      throw new Error('Shared goal not found');
    }

    // Только создатель может удалить цель
    if (goal.createdBy.id !== userId) {
      throw new Error('Only goal creator can delete the goal');
    }

    await this.sharedGoalRepo.remove(goal);
    return { success: true };
  }

  // ========== Приглашения ==========

  async sendInvitation(goalId: string, inviterId: string, invitedUserEmailOrUsername: string, isRegularGoal: boolean = false) {
    // Находим приглашаемого пользователя
    let invitedUser = await this.usersService.findByEmail(invitedUserEmailOrUsername);
    if (!invitedUser) {
      invitedUser = await this.usersService.findByUsername(invitedUserEmailOrUsername);
    }
    if (!invitedUser) {
      throw new Error('User not found');
    }

    // Нельзя пригласить себя
    if (invitedUser.id === inviterId) {
      throw new Error('Cannot invite yourself');
    }

    const inviter = await this.usersService.findById(inviterId);
    if (!inviter) {
      throw new Error('Inviter not found');
    }

    if (isRegularGoal) {
      // Приглашение в обычную цель
      const goal = await this.goalRepo.findOne({
        where: { id: goalId },
        relations: ['user'],
      });

      if (!goal) {
        throw new Error('Goal not found');
      }

      // Проверяем права (только владелец может приглашать)
      if (goal.user.id !== inviterId) {
        throw new Error('Only goal owner can send invitations');
      }

      // Проверяем, нет ли уже активного приглашения
      const existingInvitation = await this.invitationRepo.findOne({
        where: {
          regularGoalId: goal.id,
          invitedUser: { id: invitedUser.id },
          status: InvitationStatus.PENDING,
        },
      });

      if (existingInvitation) {
        throw new Error('Invitation already sent');
      }

      const invitation = this.invitationRepo.create({
        regularGoalId: goal.id,
        goalName: goal.name,
        invitedBy: inviter,
        invitedUser,
        status: InvitationStatus.PENDING,
      });

      return this.invitationRepo.save(invitation);
    } else {
      // Приглашение в совместную цель
      const goal = await this.sharedGoalRepo.findOne({
        where: { id: goalId },
        relations: ['createdBy', 'participants'],
      });

      if (!goal) {
        throw new Error('Shared goal not found');
      }

      // Проверяем права (только создатель или участник может приглашать)
      const isCreator = goal.createdBy.id === inviterId;
      const isParticipant = goal.participants.some(p => p.id === inviterId);
      if (!isCreator && !isParticipant) {
        throw new Error('Only goal creator or participants can send invitations');
      }

      // Нельзя пригласить уже участника
      if (goal.participants.some(p => p.id === invitedUser.id)) {
        throw new Error('User is already a participant');
      }

      // Проверяем, нет ли уже активного приглашения
      const existingInvitation = await this.invitationRepo.findOne({
        where: {
          goal: { id: goalId },
          invitedUser: { id: invitedUser.id },
          status: InvitationStatus.PENDING,
        },
      });

      if (existingInvitation) {
        throw new Error('Invitation already sent');
      }

      const invitation = this.invitationRepo.create({
        goal,
        invitedBy: inviter,
        invitedUser,
        status: InvitationStatus.PENDING,
      });

      return this.invitationRepo.save(invitation);
    }
  }

  async getInvitations(userId: string, type: 'sent' | 'received' = 'received') {
    if (type === 'received') {
      const invitations = await this.invitationRepo.find({
        where: {
          invitedUser: { id: userId },
          status: InvitationStatus.PENDING,
        },
        relations: ['goal', 'goal.createdBy', 'invitedBy'],
        order: { createdAt: 'DESC' },
      });
      
      // Автоматически отклоняем приглашения старше 3 дней
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      for (const inv of invitations) {
        if (inv.createdAt < threeDaysAgo) {
          inv.status = InvitationStatus.REJECTED;
          inv.respondedAt = now;
          await this.invitationRepo.save(inv);
        }
      }
      
      // Получаем обновленный список (без автоматически отклоненных)
      const validInvitations = await this.invitationRepo.find({
        where: {
          invitedUser: { id: userId },
          status: InvitationStatus.PENDING,
        },
        relations: ['goal', 'goal.createdBy', 'invitedBy'],
        order: { createdAt: 'DESC' },
      });
      
      // Для приглашений в обычные цели загружаем информацию о цели
      for (const inv of validInvitations) {
        if (inv.regularGoalId && !inv.goal) {
          const goal = await this.goalRepo.findOne({
            where: { id: inv.regularGoalId },
            relations: ['user'],
          });
          if (goal) {
            (inv as any).goal = {
              id: goal.id,
              name: goal.name,
              targetAmount: goal.targetAmount,
              currentAmount: goal.currentAmount,
              createdBy: goal.user,
            };
          }
        }
      }
      
      return validInvitations;
    } else {
      return this.invitationRepo.find({
        where: {
          invitedBy: { id: userId },
        },
        relations: ['goal', 'invitedUser'],
        order: { createdAt: 'DESC' },
      });
    }
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
      relations: ['goal', 'goal.participants', 'invitedUser'],
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Проверяем, что приглашение адресовано этому пользователю
    if (invitation.invitedUser.id !== userId) {
      throw new Error('This invitation is not for you');
    }

    // Проверяем статус
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation already responded');
    }

    // Если это приглашение в обычную цель (regularGoalId есть, но goal нет)
    if (invitation.regularGoalId && !invitation.goal) {
      const regularGoal = await this.goalRepo.findOne({
        where: { id: invitation.regularGoalId },
        relations: ['user'],
      });

      if (!regularGoal) {
        throw new Error('Goal not found');
      }

      // Конвертируем обычную цель в совместную
      const creator = regularGoal.user;
      const invitedUser = invitation.invitedUser;
      
      const sharedGoal = this.sharedGoalRepo.create({
        createdBy: creator,
        participants: [creator, invitedUser],
        name: regularGoal.name,
        targetAmount: regularGoal.targetAmount,
        currentAmount: regularGoal.currentAmount,
        imageUrl: regularGoal.imageUrl,
        isFamilyMode: false,
      });

      const savedSharedGoal = await this.sharedGoalRepo.save(sharedGoal);

      // Удаляем обычную цель
      await this.goalRepo.remove(regularGoal);

      // Обновляем приглашение, связывая его с новой совместной целью
      invitation.goal = savedSharedGoal;
      invitation.regularGoalId = undefined;
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.respondedAt = new Date();
      await this.invitationRepo.save(invitation);

      return { success: true, goal: savedSharedGoal, converted: true };
    } else {
      // Это приглашение в совместную цель
      if (!invitation.goal) {
        throw new Error('Goal not found');
      }

      // Добавляем пользователя в участники
      if (!invitation.goal.participants.some(p => p.id === userId)) {
        invitation.goal.participants.push(invitation.invitedUser);
        await this.sharedGoalRepo.save(invitation.goal);
      }

      // Обновляем статус приглашения
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.respondedAt = new Date();
      await this.invitationRepo.save(invitation);

      return { success: true, goal: invitation.goal, converted: false };
    }
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
      relations: ['invitedUser'],
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Проверяем, что приглашение адресовано этому пользователю
    if (invitation.invitedUser.id !== userId) {
      throw new Error('This invitation is not for you');
    }

    // Проверяем статус
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation already responded');
    }

    // Обновляем статус приглашения
    invitation.status = InvitationStatus.REJECTED;
    invitation.respondedAt = new Date();
    await this.invitationRepo.save(invitation);

    return { success: true };
  }
}
