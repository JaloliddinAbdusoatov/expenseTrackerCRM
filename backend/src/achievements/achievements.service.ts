import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './achievement.entity';
import { User } from '../users/user.entity';
import { Challenge } from '../challenges/challenge.entity';
import { Goal } from '../goals/goal.entity';
import { ChallengeParticipant } from '../challenges/challenge-participant.entity';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepo: Repository<ChallengeParticipant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Create an achievement for a user
   */
  async createAchievement(
    user: User,
    type: string,
    title: string,
    description?: string,
    points: number = 0,
    challenge?: Challenge,
    titleTranslations?: Record<string, string>,
    descriptionTranslations?: Record<string, string>,
  ) {
    const achievement = this.achievementRepo.create({
      user,
      type,
      title,
      description,
      points,
      challenge,
      titleTranslations: titleTranslations ? JSON.stringify(titleTranslations) : undefined,
      descriptionTranslations: descriptionTranslations ? JSON.stringify(descriptionTranslations) : undefined,
    });
    return this.achievementRepo.save(achievement);
  }

  /**
   * Translate challenge title for achievements
   */
  private translateChallengeTitle(title: string, language: 'ru' | 'en' | 'ja' = 'en'): string {
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
    
    return title;
  }

  /**
   * Create achievement for winning a challenge
   */
  async createChallengeWinnerAchievement(user: User, challenge: Challenge) {
    const existing = await this.achievementRepo.findOne({
      where: {
        user: { id: user.id },
        challenge: { id: challenge.id },
        type: 'challenge_winner',
      },
    });

    if (existing) {
      return existing; // Already earned
    }

    const translatedTitle = this.translateChallengeTitle(challenge.title, 'ru');
    const translatedTitleEn = this.translateChallengeTitle(challenge.title, 'en');
    const translatedTitleJa = this.translateChallengeTitle(challenge.title, 'ja');
    
    return this.createAchievement(
      user,
      'challenge_winner',
      `🏆 Победитель: ${translatedTitle}`,
      `Вы заняли первое место в челлендже "${translatedTitle}" и достигли цели $${challenge.targetAmount.toLocaleString()}!`,
      100,
      challenge,
      {
        ru: `🏆 Победитель: ${translatedTitle}`,
        en: `🏆 Winner: ${translatedTitleEn}`,
        ja: `🏆 勝者: ${translatedTitleJa}`,
      },
      {
        ru: `Вы заняли первое место в челлендже "${translatedTitle}" и достигли цели $${challenge.targetAmount.toLocaleString()}!`,
        en: `You took first place in the challenge "${translatedTitleEn}" and reached the goal of $${challenge.targetAmount.toLocaleString()}!`,
        ja: `チャレンジ「${translatedTitleJa}」で1位を獲得し、$${challenge.targetAmount.toLocaleString()}の目標に到達しました！`,
      },
    );
  }

  /**
   * First goal created
   */
  async giveFirstGoalCreated(user: User) {
    const existing = await this.achievementRepo.findOne({
      where: {
        user: { id: user.id },
        type: 'first_goal_created',
      },
    });

    if (existing) {
      return existing;
    }

    return this.createAchievement(
      user,
      'first_goal_created',
      '🎯 Первая цель',
      'Вы создали свою первую финансовую цель!',
      10,
      undefined,
      {
        ru: '🎯 Первая цель',
        en: '🎯 First Goal',
        ja: '🎯 最初の目標',
      },
      {
        ru: 'Вы создали свою первую финансовую цель!',
        en: 'You created your first financial goal!',
        ja: 'あなたの最初の財務目標を作成しました！',
      },
    );
  }

  /**
   * First goal completed
   */
  async giveFirstGoalCompleted(user: User, goalName: string, targetAmount: number) {
    const existing = await this.achievementRepo.findOne({
      where: {
        user: { id: user.id },
        type: 'first_goal_completed',
      },
    });

    if (existing) {
      return existing;
    }

    return this.createAchievement(
      user,
      'first_goal_completed',
      `✅ Первая завершённая цель`,
      `Вы впервые завершили цель "${goalName}" на сумму $${targetAmount.toLocaleString()}!`,
      30,
      undefined,
      {
        ru: '✅ Первая завершённая цель',
        en: '✅ First Goal Completed',
        ja: '✅ 最初の目標達成',
      },
      {
        ru: `Вы впервые завершили цель "${goalName}" на сумму $${targetAmount.toLocaleString()}!`,
        en: `You completed your first goal "${goalName}" for $${targetAmount.toLocaleString()}!`,
        ja: `初めて目標「${goalName}」を$${targetAmount.toLocaleString()}で達成しました！`,
      },
    );
  }

  /**
   * First challenge joined
   */
  async giveFirstChallengeJoined(user: User, challenge: Challenge) {
    const existing = await this.achievementRepo.findOne({
      where: {
        user: { id: user.id },
        type: 'first_challenge_joined',
      },
    });

    if (existing) {
      return existing;
    }

    return this.createAchievement(
      user,
      'first_challenge_joined',
      '🚀 Первый челлендж',
      `Вы впервые присоединились к челленджу "${challenge.title}". Удачи в достижении цели!`,
      15,
      challenge,
      {
        ru: '🚀 Первый челлендж',
        en: '🚀 First Challenge',
        ja: '🚀 最初のチャレンジ',
      },
      {
        ru: `Вы впервые присоединились к челленджу "${challenge.title}". Удачи в достижении цели!`,
        en: `You joined your first challenge "${challenge.title}". Good luck reaching your goal!`,
        ja: `初めてチャレンジ「${challenge.title}」に参加しました。目標達成を応援しています！`,
      },
    );
  }

  /**
   * Update existing achievement with translations if missing
   */
  private async updateAchievementTranslations(achievement: Achievement) {
    if (achievement.titleTranslations && achievement.descriptionTranslations) {
      return; // Already has translations
    }

    let titleTranslations: Record<string, string> | undefined;
    let descriptionTranslations: Record<string, string> | undefined;

    // Generate translations based on type
    switch (achievement.type) {
      case 'first_goal_created':
        titleTranslations = {
          ru: '🎯 Первая цель',
          en: '🎯 First Goal',
          ja: '🎯 最初の目標',
        };
        descriptionTranslations = {
          ru: 'Вы создали свою первую финансовую цель!',
          en: 'You created your first financial goal!',
          ja: 'あなたの最初の財務目標を作成しました！',
        };
        break;
      case 'first_goal_completed':
        titleTranslations = {
          ru: '✅ Первая завершённая цель',
          en: '✅ First Goal Completed',
          ja: '✅ 最初の目標達成',
        };
        // Description might have dynamic content, try to extract it
        const goalMatch = achievement.description?.match(/"([^"]+)"/);
        const amountMatch = achievement.description?.match(/\$([\d,]+)/);
        if (goalMatch && amountMatch) {
          const goalName = goalMatch[1];
          const amount = amountMatch[1];
          descriptionTranslations = {
            ru: `Вы впервые завершили цель "${goalName}" на сумму $${amount}!`,
            en: `You completed your first goal "${goalName}" for $${amount}!`,
            ja: `初めて目標「${goalName}」を$${amount}で達成しました！`,
          };
        } else {
          descriptionTranslations = {
            ru: achievement.description || '',
            en: achievement.description || '',
            ja: achievement.description || '',
          };
        }
        break;
      case 'first_challenge_joined':
        titleTranslations = {
          ru: '🚀 Первый челлендж',
          en: '🚀 First Challenge',
          ja: '🚀 最初のチャレンジ',
        };
        const challengeMatch = achievement.description?.match(/"([^"]+)"/);
        if (challengeMatch) {
          const challengeName = challengeMatch[1];
          descriptionTranslations = {
            ru: `Вы впервые присоединились к челленджу "${challengeName}". Удачи в достижении цели!`,
            en: `You joined your first challenge "${challengeName}". Good luck reaching your goal!`,
            ja: `初めてチャレンジ「${challengeName}」に参加しました。目標達成を応援しています！`,
          };
        } else {
          descriptionTranslations = {
            ru: achievement.description || '',
            en: achievement.description || '',
            ja: achievement.description || '',
          };
        }
        break;
      case 'challenge_winner':
        // Extract challenge name from title (could be in any language)
        // Try to extract after emoji and language-specific prefix
        let challengeName = '';
        const titleMatchRu = achievement.title?.match(/[🏆🎯]?\s*Победитель:\s*(.+)/i);
        const titleMatchEn = achievement.title?.match(/[🏆🎯]?\s*Winner:\s*(.+)/i);
        const titleMatchJa = achievement.title?.match(/[🏆🎯]?\s*勝者:\s*(.+)/i);
        
        if (titleMatchRu) challengeName = titleMatchRu[1];
        else if (titleMatchEn) challengeName = titleMatchEn[1];
        else if (titleMatchJa) challengeName = titleMatchJa[1];
        else {
          // Fallback: remove emoji and common prefixes
          challengeName = achievement.title?.replace(/[🏆🎯]?\s*(?:Победитель|Winner|勝者):\s*/i, '') || '';
        }
        
        // If challenge name is empty or doesn't match pattern, try to extract from description
        if (!challengeName || (!challengeName.match(/Save \$|Накопить \$|\$.*を貯める/i))) {
          const descMatch = achievement.description?.match(/челлендже\s+"([^"]+)"/i) || 
                           achievement.description?.match(/challenge\s+"([^"]+)"/i) ||
                           achievement.description?.match(/チャレンジ「([^」]+)」/i);
          if (descMatch) {
            challengeName = descMatch[1];
          }
        }
        
        // If still empty, try to extract amount and reconstruct
        if (!challengeName || challengeName.trim() === '') {
          const amountMatch = achievement.title?.match(/\$([\d,]+)/) || achievement.description?.match(/\$([\d,]+)/);
          if (amountMatch) {
            challengeName = `Save $${amountMatch[1]} Challenge`;
          }
        }
        
        // Translate challenge name if it matches pattern
        const translatedNameRu = this.translateChallengeTitle(challengeName, 'ru');
        const translatedNameEn = this.translateChallengeTitle(challengeName, 'en');
        const translatedNameJa = this.translateChallengeTitle(challengeName, 'ja');
        
        titleTranslations = {
          ru: `🏆 Победитель: ${translatedNameRu}`,
          en: `🏆 Winner: ${translatedNameEn}`,
          ja: `🏆 勝者: ${translatedNameJa}`,
        };
        
        const descMatch = achievement.description?.match(/\$([\d,]+)/);
        if (descMatch) {
          const amount2 = descMatch[1];
          descriptionTranslations = {
            ru: `Вы заняли первое место в челлендже "${translatedNameRu}" и достигли цели $${amount2}!`,
            en: `You took first place in the challenge "${translatedNameEn}" and reached the goal of $${amount2}!`,
            ja: `チャレンジ「${translatedNameJa}」で1位を獲得し、$${amount2}の目標に到達しました！`,
          };
        } else {
          descriptionTranslations = {
            ru: achievement.description || '',
            en: achievement.description || '',
            ja: achievement.description || '',
          };
        }
        break;
      default:
        // For unknown types, use the existing title/description for all languages
        titleTranslations = {
          ru: achievement.title,
          en: achievement.title,
          ja: achievement.title,
        };
        descriptionTranslations = {
          ru: achievement.description || '',
          en: achievement.description || '',
          ja: achievement.description || '',
        };
    }

    // Update the achievement
    achievement.titleTranslations = JSON.stringify(titleTranslations);
    achievement.descriptionTranslations = JSON.stringify(descriptionTranslations);
    await this.achievementRepo.save(achievement);
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string, language: 'ru' | 'en' | 'ja' = 'ru') {
    const achievements = await this.achievementRepo.find({
      where: { user: { id: userId } },
      relations: ['challenge'],
      order: { earnedAt: 'DESC' },
    });

    // Update achievements without translations
    for (const achievement of achievements) {
      if (!achievement.titleTranslations || !achievement.descriptionTranslations) {
        await this.updateAchievementTranslations(achievement);
      }
    }

    // Reload to get updated translations
    const updatedAchievements = await this.achievementRepo.find({
      where: { user: { id: userId } },
      relations: ['challenge'],
      order: { earnedAt: 'DESC' },
    });

    // Apply translations if available
    return updatedAchievements.map((achievement) => {
      let title = achievement.title;
      let description = achievement.description;

      if (achievement.titleTranslations) {
        try {
          const translations = JSON.parse(achievement.titleTranslations);
          if (translations[language]) {
            title = translations[language];
            // If title contains untranslated challenge name (e.g., "Save $X Challenge"), translate it
            if (achievement.type === 'challenge_winner' && title.match(/Save \$|Challenge/i)) {
              // Extract challenge name and translate
              const challengeMatch = title.match(/[🏆🎯]?\s*(?:Победитель|Winner|勝者):\s*(.+)/i);
              if (challengeMatch) {
                const challengeName = challengeMatch[1];
                const translatedChallengeName = this.translateChallengeTitle(challengeName, language);
                const prefix = language === 'ru' ? '🏆 Победитель: ' : language === 'ja' ? '🏆 勝者: ' : '🏆 Winner: ';
                title = prefix + translatedChallengeName;
              }
            }
          }
        } catch (e) {
          // Fallback to default title
        }
      } else if (achievement.type === 'challenge_winner') {
        // If no translations but it's a challenge winner, translate on the fly
        const challengeMatch = title.match(/[🏆🎯]?\s*(?:Победитель|Winner|勝者):\s*(.+)/i);
        if (challengeMatch) {
          const challengeName = challengeMatch[1];
          const translatedChallengeName = this.translateChallengeTitle(challengeName, language);
          const prefix = language === 'ru' ? '🏆 Победитель: ' : language === 'ja' ? '🏆 勝者: ' : '🏆 Winner: ';
          title = prefix + translatedChallengeName;
        }
      }

      if (achievement.descriptionTranslations) {
        try {
          const translations = JSON.parse(achievement.descriptionTranslations);
          if (translations[language]) {
            description = translations[language];
            // If description contains untranslated challenge name, translate it
            if (achievement.type === 'challenge_winner' && description && description.match(/Save \$|Challenge/i)) {
              const challengeMatch = description.match(/челлендже\s+"([^"]+)"/i) || 
                                     description.match(/challenge\s+"([^"]+)"/i) ||
                                     description.match(/チャレンジ「([^」]+)」/i);
              if (challengeMatch && description) {
                const challengeName = challengeMatch[1];
                const translatedChallengeName = this.translateChallengeTitle(challengeName, language);
                if (language === 'ru') {
                  description = description.replace(/челлендже\s+"[^"]+"/i, `челлендже "${translatedChallengeName}"`);
                } else if (language === 'ja') {
                  description = description.replace(/チャレンジ「[^」]+」/i, `チャレンジ「${translatedChallengeName}」`);
                } else if (description) {
                  description = description.replace(/challenge\s+"[^"]+"/i, `challenge "${translatedChallengeName}"`);
                }
              }
            }
          }
        } catch (e) {
          // Fallback to default description
        }
      }

      return {
        ...achievement,
        title,
        description,
      };
    });
  }

  /**
   * Backfill base achievements (first goal/challenge) from existing data
   * so that users get them задним числом, если начали играть до появления ачивок.
   */
  private async backfillBaseAchievements(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }

    const existingAchievements = await this.achievementRepo.find({
      where: { user: { id: userId } },
    });
    const existingTypes = new Set(existingAchievements.map((a) => a.type));

    // First goal created
    if (!existingTypes.has('first_goal_created')) {
      const firstGoal = await this.goalRepo.findOne({
        where: { user: { id: userId } },
        order: { createdAt: 'ASC' },
      });

      if (firstGoal) {
        await this.giveFirstGoalCreated(user);
      }
    }

    // First goal completed (any goal where currentAmount >= targetAmount)
    if (!existingTypes.has('first_goal_completed')) {
      const firstCompletedGoal = await this.goalRepo
        .createQueryBuilder('goal')
        .where('goal.userId = :userId', { userId })
        .andWhere('goal.currentAmount >= goal.targetAmount')
        .orderBy('goal.createdAt', 'ASC')
        .getOne();

      if (firstCompletedGoal) {
        await this.giveFirstGoalCompleted(
          user,
          firstCompletedGoal.name,
          firstCompletedGoal.targetAmount,
        );
      }
    }

    // First challenge joined
    if (!existingTypes.has('first_challenge_joined')) {
      const firstParticipant = await this.participantRepo.findOne({
        where: { user: { id: userId } },
        relations: ['challenge'],
        order: { joinedAt: 'ASC' },
      });

      if (firstParticipant?.challenge) {
        await this.giveFirstChallengeJoined(user, firstParticipant.challenge);
      }
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string, language: 'ru' | 'en' | 'ja' = 'ru') {
    // Ensure базовые ачивки существуют даже для старых пользователей
    await this.backfillBaseAchievements(userId);

    const achievements = await this.getUserAchievements(userId, language);
    const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
    const winsCount = achievements.filter(a => a.type === 'challenge_winner').length;

    return {
      totalAchievements: achievements.length,
      totalPoints,
      winsCount,
      achievements,
    };
  }
}
