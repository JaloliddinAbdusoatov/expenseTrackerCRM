import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeParticipant } from './challenge-participant.entity';
import { UsersService } from '../users/users.service';
import { Goal } from '../goals/goal.entity';
import { Income } from '../chat/income.entity';
import { AchievementsService } from '../achievements/achievements.service';

interface CreateChallengeDto {
  title: string;
  description?: string;
  targetAmount: number;
}

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepo: Repository<ChallengeParticipant>,
    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
    @InjectRepository(Income)
    private readonly incomeRepo: Repository<Income>,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AchievementsService))
    private readonly achievementsService: AchievementsService,
  ) {}

  async createChallenge(dto: CreateChallengeDto) {
    const challenge = this.challengeRepo.create({
      title: dto.title,
      description: dto.description,
      targetAmount: dto.targetAmount,
    });
    const savedChallenge = await this.challengeRepo.save(challenge);
    
    // Automatically find users with similar goals and add them as participants
    await this.addParticipantsFromGoals(savedChallenge.id, dto.targetAmount);
    
    return savedChallenge;
  }

  /**
   * Automatically create challenges based on user goals
   * Finds users with similar goal amounts and groups them into challenges
   */
  async autoCreateChallengesFromGoals() {
    // Get all goals from all users
    const allGoals = await this.goalRepo.find({
      relations: ['user'],
      where: { 
        // Only consider active goals (currentAmount < targetAmount)
      },
    });

    // Group goals by similar target amounts (within 20% difference)
    const goalGroups: Map<string, Goal[]> = new Map();

    for (const goal of allGoals) {
      // Find existing group with similar target amount
      let foundGroup = false;
      for (const [groupId, goals] of goalGroups.entries()) {
        const groupTarget = parseFloat(groupId);
        const diff = Math.abs(goal.targetAmount - groupTarget) / groupTarget;
        if (diff <= 0.2) { // 20% difference
          goals.push(goal);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        // Create new group
        goalGroups.set(goal.targetAmount.toString(), [goal]);
      }
    }

    // Create challenges for groups with at least 2 goals
    const createdChallenges = [];
    
    // Check existing challenges to avoid duplicates
    const existingChallenges = await this.challengeRepo.find({
      relations: ['participants'],
    });
    
    for (const [targetAmountStr, goals] of goalGroups.entries()) {
      if (goals.length >= 2) {
        const targetAmount = parseFloat(targetAmountStr);
        
        // Check if challenge with similar target already exists (within 5% difference)
        const existingChallenge = existingChallenges.find((ch) => {
          const diff = Math.abs(ch.targetAmount - targetAmount) / targetAmount;
          return diff <= 0.05; // 5% difference
        });
        
        let savedChallenge;
        if (existingChallenge) {
          // Use existing challenge
          savedChallenge = existingChallenge;
          console.log(`Using existing challenge for $${targetAmount.toLocaleString()}`);
        } else {
          // Create new challenge
          const challenge = this.challengeRepo.create({
            title: `Save $${targetAmount.toLocaleString()}`,
            description: `Challenge to save $${targetAmount.toLocaleString()} based on your goals`,
            targetAmount,
          });
          savedChallenge = await this.challengeRepo.save(challenge);
          console.log(`Created new challenge for $${targetAmount.toLocaleString()}`);
        }
        
        // Add all users with this goal as participants (if not already added)
        for (const goal of goals) {
          const existingParticipant = await this.participantRepo.findOne({
            where: {
              challenge: { id: savedChallenge.id },
              user: { id: goal.user.id },
            },
          });
          
          if (!existingParticipant) {
            try {
              await this.addParticipant(savedChallenge.id, goal.user.id, goal.currentAmount);
            } catch (error) {
              console.log(`Error adding participant ${goal.user.id}:`, error);
            }
          }
        }
        
        // Check if we need to add artificial participants to fill the challenge
        const currentParticipants = await this.participantRepo.find({
          where: { challenge: { id: savedChallenge.id } },
          relations: ['user'],
        });
        
        if (currentParticipants.length < 5) {
          await this.addArtificialParticipants(savedChallenge.id, targetAmount);
        }
        
        if (!existingChallenge) {
          createdChallenges.push(savedChallenge);
        }
      }
    }

    console.log(`✅ Created/updated ${createdChallenges.length} challenges from ${goalGroups.size} goal groups`);
    return createdChallenges;
  }

  /**
   * Add participants based on goals with similar target amounts
   */
  private async addParticipantsFromGoals(challengeId: string, targetAmount: number) {
    // Check if challenge is completed - don't add participants to completed challenges
    const challenge = await this.challengeRepo.findOne({ where: { id: challengeId } });
    if (challenge?.isCompleted) {
      console.log(`⚠️ Skipping addParticipantsFromGoals for completed challenge: ${challenge.title}`);
      return;
    }

    // Find goals with similar target amounts (within 20% difference)
    const allGoals = await this.goalRepo.find({
      relations: ['user'],
    });

    const similarGoals = allGoals.filter(goal => {
      const diff = Math.abs(goal.targetAmount - targetAmount) / targetAmount;
      return diff <= 0.2; // 20% difference
    });

    // Add users with similar goals as participants
    for (const goal of similarGoals) {
      try {
        await this.addParticipant(challengeId, goal.user.id, goal.currentAmount);
      } catch (error: any) {
        // Participant might already exist or challenge is completed, skip
        if (error.message?.includes('completed challenge')) {
          console.log('Cannot add participant to completed challenge');
          break; // Stop trying to add more participants
        } else {
          console.log('Participant already exists or error:', error.message || error);
        }
      }
    }

    // If not enough participants, add artificial ones
    if (similarGoals.length < 3) {
      await this.addArtificialParticipants(challengeId, targetAmount);
    }
  }

  /**
   * Add artificial participants with similar saved amounts
   * Uses artificial users from database (must be created via SQL script)
   */
  private async addArtificialParticipants(challengeId: string, targetAmount: number) {
    // Get artificial users from database (users with email ending in @artificial.local)
    const allUsers = await this.usersService.findAll();
    const artificialUsers = allUsers.filter(user => user.email.endsWith('@artificial.local'));
    
    // If no artificial users exist, log warning
    if (artificialUsers.length === 0) {
      console.warn('⚠️ No artificial users found in database. Please run the seed script to create them.');
      return;
    }

    // Select up to 4 artificial users (or whatever space is left)
    const availableUsers = artificialUsers.slice(0, 4);
    const participants: ChallengeParticipant[] = [];

    for (const user of availableUsers) {
      // Check if user is already a participant
      const existingParticipant = await this.participantRepo.findOne({
        where: {
          challenge: { id: challengeId },
          user: { id: user.id },
        },
      });

      if (existingParticipant) {
        continue; // Skip if already a participant
      }

      // Generate random saved amount between 40% and 95% of target
      const savedAmount = Math.floor(targetAmount * (0.4 + Math.random() * 0.55));
      
      const participant = this.participantRepo.create({
        challenge: { id: challengeId } as Challenge,
        user,
        savedAmount,
      });
      participants.push(participant);
    }

    // Save all participants
    if (participants.length > 0) {
      await this.participantRepo.save(participants);
    }
  }

  async addParticipant(challengeId: string, userId: string, savedAmount = 0) {
    const [challenge, user] = await Promise.all([
      this.challengeRepo.findOne({ where: { id: challengeId } }),
      this.usersService.findById(userId),
    ]);
    if (!challenge || !user) {
      throw new Error('Challenge or user not found');
    }
    
    // Check if participant already exists
    const existing = await this.participantRepo.findOne({
      where: {
        challenge: { id: challengeId },
        user: { id: userId },
      },
    });
    
    if (existing) {
      // Update savedAmount if it's different (to keep it in sync with goal)
      if (existing.savedAmount !== savedAmount) {
        existing.savedAmount = savedAmount;
        return this.participantRepo.save(existing);
      }
      return existing;
    }
    
    // Don't add participant to completed challenges
    if (challenge.isCompleted) {
      console.log(`⚠️ Skipping adding participant to completed challenge: ${challenge.title}`);
      throw new Error('Cannot add participant to completed challenge');
    }
    
    const cp = this.participantRepo.create({
      challenge,
      user,
      savedAmount,
    });
    const savedParticipant = await this.participantRepo.save(cp);

    // Achievement: first challenge joined
    this.achievementsService
      .giveFirstChallengeJoined(user, challenge)
      .catch((error) =>
        console.error('Failed to create first_challenge_joined achievement:', error),
      );

    return savedParticipant;
  }

  /**
   * Remove participant from challenge
   */
  async removeParticipant(challengeId: string, userId: string) {
    console.log(`🚪 Removing participant: challengeId=${challengeId}, userId=${userId}`);
    
    // Get challenge info for logging
    const challenge = await this.challengeRepo.findOne({ 
      where: { id: challengeId },
      relations: ['participants', 'participants.user'],
    });
    
    const participant = await this.participantRepo.findOne({
      where: {
        challenge: { id: challengeId },
        user: { id: userId },
      },
      relations: ['challenge', 'user'],
    });
    
    if (!participant) {
      console.error(`❌ Participant not found: challengeId=${challengeId}, userId=${userId}`);
      throw new Error('Participant not found in this challenge');
    }
    
    console.log(`✅ Found participant to remove: challenge="${challenge?.title || 'unknown'}", user="${participant.user.username}", isCompleted=${challenge?.isCompleted || false}`);
    
    await this.participantRepo.remove(participant);
    console.log(`✅ Participant removed successfully`);
    
    return { success: true, message: 'Participant removed from challenge' };
  }

  /**
   * Check and mark challenge as completed if someone reached 100%
   */
  private async checkAndMarkCompleted(challenge: Challenge) {
    if (challenge.isCompleted) {
      return; // Already completed
    }

    // Get all participants with their progress
    const participants = await this.participantRepo.find({
      where: { challenge: { id: challenge.id } },
      relations: ['user'],
    });

    if (participants.length === 0) {
      return;
    }

    // Calculate progress for each participant
    const participantsWithProgress = participants.map(p => ({
      ...p,
      progress: Math.min(100, Math.round((p.savedAmount / challenge.targetAmount) * 100)),
    }));

    // Sort by progress (descending)
    participantsWithProgress.sort((a, b) => b.progress - a.progress);

    // Check if anyone reached 100%
    const winner = participantsWithProgress[0];
    if (winner && winner.progress >= 100) {
      challenge.isCompleted = true;
      challenge.completedAt = new Date();
      challenge.winnerId = winner.user.id;
      await this.challengeRepo.save(challenge);
      console.log(`🏆 Challenge "${challenge.title}" completed! Winner: ${winner.user.username}`);

      // Create achievement for the winner
      try {
        await this.achievementsService.createChallengeWinnerAchievement(winner.user, challenge);
        console.log(`✅ Achievement created for winner: ${winner.user.username}`);
      } catch (error) {
        console.error('Failed to create achievement:', error);
      }

      // Automatically create a new challenge with higher target (20% increase)
      try {
        const newTargetAmount = Math.round(challenge.targetAmount * 1.2);
        await this.createNextLevelChallenge(winner.user.id, newTargetAmount);
      } catch (error) {
        console.error('Failed to create next level challenge:', error);
      }
    }
  }

  /**
   * Create a new challenge with higher target after winning
   */
  private async createNextLevelChallenge(userId: string, newTargetAmount: number) {
    // Find user's goals to see if there's a matching goal
    const userGoals = await this.goalRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    // Find a goal with similar target amount (within 20%)
    const matchingGoal = userGoals.find(goal => {
      const diff = Math.abs(goal.targetAmount - newTargetAmount) / newTargetAmount;
      return diff <= 0.2;
    });

    if (matchingGoal) {
      // Use existing goal to create/join challenge
      await this.findOrCreateChallengeForGoal(matchingGoal.id, userId, newTargetAmount);
      console.log(`✅ Created next level challenge for user ${userId} with target $${newTargetAmount}`);
    } else {
      // Create a new challenge without a specific goal
      const challenge = this.challengeRepo.create({
        title: `Next Level: Save $${newTargetAmount.toLocaleString()}`,
        description: `Продолжайте свой путь к финансовой свободе! Новая цель: $${newTargetAmount.toLocaleString()}`,
        targetAmount: newTargetAmount,
      });
      const savedChallenge = await this.challengeRepo.save(challenge);
      
      // Add user as participant
      await this.addParticipant(savedChallenge.id, userId, 0);
      
      // Add other participants with similar goals
      await this.addParticipantsFromGoals(savedChallenge.id, newTargetAmount);
      
      // Add artificial participants if needed
      const currentParticipants = await this.participantRepo.find({
        where: { challenge: { id: savedChallenge.id } },
      });
      if (currentParticipants.length < 5) {
        await this.addArtificialParticipants(savedChallenge.id, newTargetAmount);
      }
      
      console.log(`✅ Created next level challenge for user ${userId} with target $${newTargetAmount}`);
    }
  }

  /**
   * Get all challenges with participants
   * Automatically creates challenges from goals if they don't exist
   * Note: This method returns ALL challenges. Filtering by user should be done on frontend.
   */
  /**
   * Translate challenge title based on pattern
   */
  private translateChallengeTitle(title: string, language: 'ru' | 'en' | 'ja' = 'en'): string {
    // Pattern: "Save $X Challenge" or "Save $X" or "Next Level: Save $X"
    const saveMatch = title.match(/Save \$([\d,]+)(\s+Challenge)?/i);
    const nextLevelMatch = title.match(/Next Level:\s*Save \$([\d,]+)/i);
    
    if (nextLevelMatch) {
      const amount = nextLevelMatch[1];
      const translations: Record<'ru' | 'en' | 'ja', string> = {
        ru: `Следующий уровень: Накопить $${amount}`,
        en: `Next Level: Save $${amount}`,
        ja: `次のレベル: $${amount}を貯める`,
      };
      return translations[language];
    }
    
    if (saveMatch) {
      const amount = saveMatch[1];
      const translations: Record<'ru' | 'en' | 'ja', string> = {
        ru: `Накопить $${amount}`,
        en: `Save $${amount}`,
        ja: `$${amount}を貯める`,
      };
      return translations[language];
    }
    
    // If no pattern matches, return original
    return title;
  }

  async getAllChallenges(language: 'ru' | 'en' | 'ja' = 'en') {
    // Auto-create challenges from goals if they don't exist
    await this.autoCreateChallengesFromGoals();
    
    // Sync all goals with challenges before returning
    await this.syncAllGoalsWithChallenges();
    
    const challenges = await this.challengeRepo.find({
      relations: ['participants', 'participants.user'],
      order: { createdAt: 'DESC' },
    });
    
    // Check and mark completed challenges
    for (const challenge of challenges) {
      await this.checkAndMarkCompleted(challenge);
    }
    
    // Reload to get updated completion status
    const updatedChallenges = await this.challengeRepo.find({
      relations: ['participants', 'participants.user'],
      order: { createdAt: 'DESC' },
    });
    
    // Ensure all challenges have participants array (even if empty) and translate titles
    return updatedChallenges.map(challenge => ({
      ...challenge,
      title: this.translateChallengeTitle(challenge.title, language),
      participants: challenge.participants || [],
    }));
  }

  /**
   * Get challenge by ID with participants
   */
  async getChallengeById(id: string) {
    return this.challengeRepo.findOne({
      where: { id },
      relations: ['participants', 'participants.user'],
    });
  }

  /**
   * Very simple matching: finds participants whose targetAmount is closest
   * to the given target and returns top N.
   */
  async findClosestChallenges(targetAmount: number, limit = 5) {
    const challenges = await this.challengeRepo.find({
      relations: ['participants', 'participants.user'],
    });
    const sorted = challenges
      .map((c) => ({
        challenge: c,
        diff: Math.abs(c.targetAmount - targetAmount),
      }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, limit)
      .map((x) => x.challenge);
    return sorted;
  }

  /**
   * Find or create a challenge for a goal with similar target amounts
   * Finds up to 4 other users with similar goals (total 5 participants)
   */
  async findOrCreateChallengeForGoal(goalId: string, userId: string, targetAmount: number) {
    // Get the goal to access its details
    const goal = await this.goalRepo.findOne({
      where: { id: goalId },
      relations: ['user'],
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Find existing challenge with similar target amount (within 20% difference)
    const existingChallenges = await this.challengeRepo.find({
      relations: ['participants', 'participants.user'],
    });

    // Find challenge with similar target and less than 5 participants
    // Exclude completed challenges
    let suitableChallenge = existingChallenges.find((challenge) => {
      if (challenge.isCompleted) {
        return false; // Don't add to completed challenges
      }
      const diff = Math.abs(challenge.targetAmount - targetAmount) / targetAmount;
      const hasSpace = challenge.participants.length < 5;
      // Check if user is already a participant
      const notAlreadyParticipant = !challenge.participants.some(
        (p) => p.user && p.user.id === userId,
      );
      return diff <= 0.2 && hasSpace && notAlreadyParticipant;
    });

    if (suitableChallenge) {
      // Add user to existing challenge
      await this.addParticipant(suitableChallenge.id, userId, goal.currentAmount);
      return suitableChallenge;
    }

    // Create new challenge if no suitable one exists
    // Find up to 4 other users with similar goals
    const allGoals = await this.goalRepo.find({
      relations: ['user'],
    });

    // Filter goals with similar target amounts (within 20% difference)
    // Find goals that are approximately the same (3000 ± 20% = 2400-3600)
    const similarGoals = allGoals
      .filter((g) => {
        const diff = Math.abs(g.targetAmount - targetAmount) / targetAmount;
        return diff <= 0.2 && g.user.id !== userId; // Exclude current user
      })
      .sort((a, b) => {
        // Sort by how close the target amount is (closest first)
        const diffA = Math.abs(a.targetAmount - targetAmount);
        const diffB = Math.abs(b.targetAmount - targetAmount);
        return diffA - diffB;
      })
      .slice(0, 4); // Take up to 4 other users (total 5 including current)

    // Create challenge
    const challenge = this.challengeRepo.create({
      title: `Save $${targetAmount.toLocaleString()} Challenge`,
      description: `Challenge to save $${targetAmount.toLocaleString()} based on your goals`,
      targetAmount,
    });
    const savedChallenge = await this.challengeRepo.save(challenge);

    // Add current user as first participant
    await this.addParticipant(savedChallenge.id, userId, goal.currentAmount);

    // Add other users with similar goals
    for (const similarGoal of similarGoals) {
      try {
        await this.addParticipant(
          savedChallenge.id,
          similarGoal.user.id,
          similarGoal.currentAmount,
        );
      } catch (error) {
        // Skip if user already added or error
        console.log('Error adding participant:', error);
      }
    }

    // If we still have space (less than 5 participants), add artificial participants
    const currentParticipants = await this.participantRepo.find({
      where: { challenge: { id: savedChallenge.id } },
      relations: ['user'],
    });

    if (currentParticipants.length < 5) {
      await this.addArtificialParticipants(savedChallenge.id, targetAmount);
    }

    return savedChallenge;
  }

  /**
   * Sync challenge participant progress when a goal's currentAmount is updated
   * Finds all challenges where the user participates with a similar target amount
   * and updates savedAmount to match the goal's currentAmount
   */
  async syncGoalProgress(userId: string, goalId: string, currentAmount: number, targetAmount: number) {
    // Find the goal to get its target amount
    const goal = await this.goalRepo.findOne({
      where: { id: goalId },
    });

    if (!goal) {
      return;
    }

    // Find all participant entries for this user
    const userParticipants = await this.participantRepo.find({
      where: {
        user: { id: userId },
      },
      relations: ['challenge', 'user'],
    });

    // For each participant, check if challenge's targetAmount matches (within 20% difference)
    for (const participant of userParticipants) {
      const challenge = participant.challenge;
      if (!challenge) continue;

      const diff = Math.abs(challenge.targetAmount - targetAmount) / targetAmount;
      
      // If target amounts are similar (within 20%), update savedAmount
      if (diff <= 0.2) {
        // Update savedAmount to match goal's currentAmount
        participant.savedAmount = currentAmount;
        await this.participantRepo.save(participant);
        console.log(`✅ Synced challenge progress: User ${userId}, Challenge ${challenge.id}, savedAmount = ${currentAmount}`);
        
        // Check if challenge should be marked as completed after this update
        await this.checkAndMarkCompleted(challenge);
      }
    }
  }

  /**
   * Sync all goals with their corresponding challenges
   * This ensures that savedAmount in challenges always matches currentAmount in goals
   */
  async syncAllGoalsWithChallenges() {
    // Get all goals with their users
    const allGoals = await this.goalRepo.find({
      relations: ['user'],
    });

    // Get all challenges
    const allChallenges = await this.challengeRepo.find({
      relations: ['participants', 'participants.user'],
    });

    // For each goal, find matching challenges and sync
    for (const goal of allGoals) {
      const userId = goal.user.id;
      const targetAmount = goal.targetAmount;
      const currentAmount = goal.currentAmount;

      // Find all challenges where this user participates
      for (const challenge of allChallenges) {
        const participant = challenge.participants?.find(
          p => p.user && p.user.id === userId
        );

        if (!participant) continue;

        // Check if target amounts match (within 20% difference)
        const diff = Math.abs(challenge.targetAmount - targetAmount) / targetAmount;
        
        if (diff <= 0.2) {
          // Update savedAmount to match goal's currentAmount
          if (participant.savedAmount !== currentAmount) {
            participant.savedAmount = currentAmount;
            await this.participantRepo.save(participant);
            console.log(`✅ Synced: Goal "${goal.name}" (${currentAmount}) → Challenge "${challenge.title}" (was ${participant.savedAmount}, now ${currentAmount})`);
          }
        }
      }
    }

    // After syncing, check all challenges for completion
    for (const challenge of allChallenges) {
      await this.checkAndMarkCompleted(challenge);
    }
  }

  /**
   * Ensure challenges are created from existing goals in database
   * This method should be called after artificial users are added via SQL
   */
  async generateArtificialUsersWithGoals() {
    // Get artificial users from database (must be created via SQL script)
    const allUsers = await this.usersService.findAll();
    const artificialUsers = allUsers.filter(user => user.email.endsWith('@artificial.local'));
    
    if (artificialUsers.length === 0) {
      return {
        users: 0,
        goals: 0,
        challenges: 0,
        message: 'No artificial users found. Please run the seed script to create them in the database.',
      };
    }
    
    const userIds = artificialUsers.map(u => u.id);
    const allGoals = await this.goalRepo.find({
      relations: ['user'],
    });
    const filteredGoals = allGoals.filter(g => userIds.includes(g.user.id));
    
    // Auto-create challenges based on existing goals
    const challenges = await this.autoCreateChallengesFromGoals();
    
    return {
      users: artificialUsers.length,
      goals: filteredGoals.length,
      challenges: challenges.length,
      message: `Found ${artificialUsers.length} artificial users with ${filteredGoals.length} goals. Created/updated ${challenges.length} challenges.`,
    };
  }
}

