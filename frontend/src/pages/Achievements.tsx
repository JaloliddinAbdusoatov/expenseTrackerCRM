import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Target, TrendingUp, Sparkles } from 'lucide-react';
import { achievementsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Achievement {
  id: string;
  type: string;
  title: string;
  description?: string;
  points: number;
  earnedAt: string;
  challenge?: {
    id: string;
    title: string;
    targetAmount: number;
  };
}

interface Stats {
  totalAchievements: number;
  totalPoints: number;
  winsCount: number;
  achievements: Achievement[];
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id, language]);

  const loadStats = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await achievementsApi.getStats(user.id, language);
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'challenge_winner':
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      default:
        return <Award className="h-6 w-6 text-primary" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const localeMap: Record<'ru' | 'en' | 'ja', string> = {
      ru: 'ru-RU',
      en: 'en-US',
      ja: 'ja-JP',
    };
    return date.toLocaleDateString(localeMap[language], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            {t('achievements.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('achievements.subtitle')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">{t('achievements.loading')}</p>
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Statistics Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('achievements.totalAchievements')}
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAchievements}</div>
                <p className="text-xs text-muted-foreground">
                  {t('achievements.earned')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('achievements.totalPoints')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPoints}</div>
                <p className="text-xs text-muted-foreground">
                  {t('achievements.accumulated')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('achievements.winsCount')}
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.winsCount}</div>
                <p className="text-xs text-muted-foreground">
                  {t('achievements.firstPlaces')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Achievements List */}
          {stats.achievements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Trophy className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('achievements.noAchievements')}</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {t('achievements.noAchievementsDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('achievements.history')}
              </h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(244px, 1fr))' }}>
                {stats.achievements.map((achievement) => (
                  <Card key={achievement.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getAchievementIcon(achievement.type)}
                          <div className="flex-1">
                            <CardTitle className="text-lg">{achievement.title}</CardTitle>
                            {achievement.description && (
                              <CardDescription className="mt-1">
                                {achievement.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-semibold">
                          +{achievement.points} {t('achievements.points')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(achievement.earnedAt)}
                        </span>
                      </div>
                      {achievement.challenge && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <span>{achievement.challenge.title}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('achievements.loadingError')}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t('achievements.loadingErrorDesc')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
