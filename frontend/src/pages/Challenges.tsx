import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { challengesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/currency';
import { LogOut, Trophy, Target, Users, TrendingUp, CheckCircle2, Sparkles } from 'lucide-react';

interface Participant {
  id: string;
  savedAmount: number;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

interface Challenge {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  participants: Participant[];
  isCompleted?: boolean;
  completedAt?: string;
  winnerId?: string;
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const fc = (value: number) => formatCurrency(value, user?.currency || 'USD', language);
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [congratulationsOpen, setCongratulationsOpen] = React.useState(false);
  const [wonChallenge, setWonChallenge] = React.useState<Challenge | null>(null);
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Load shown congratulations from localStorage
  const getShownCongratulations = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('shown_congratulations');
    if (!stored) return new Set();
    try {
      const ids = JSON.parse(stored);
      return new Set(Array.isArray(ids) ? ids : []);
    } catch {
      return new Set();
    }
  };

  // Save shown congratulations to localStorage
  const saveShownCongratulations = (ids: Set<string>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('shown_congratulations', JSON.stringify(Array.from(ids)));
  };

  const [hasShownCongratulations, setHasShownCongratulations] = React.useState<Set<string>>(() => getShownCongratulations());

  React.useEffect(() => {
    loadChallenges();
  }, [user?.id, language]);

  // Check for newly completed challenges and show congratulations (only once per challenge)
  React.useEffect(() => {
    if (!user?.id || challenges.length === 0) return;

    challenges.forEach((challenge) => {
      if (
        challenge.isCompleted &&
        challenge.winnerId === user.id &&
        !hasShownCongratulations.has(challenge.id)
      ) {
        // Show congratulations only once for this challenge
        setWonChallenge(challenge);
        setCongratulationsOpen(true);

        const updated = new Set(hasShownCongratulations);
        updated.add(challenge.id);
        setHasShownCongratulations(updated);
        saveShownCongratulations(updated);
      }
    });
  }, [challenges, user?.id, hasShownCongratulations]);

  const loadChallenges = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await challengesApi.getAll(language);
      console.log('Loaded challenges:', data);
      // Ensure data is an array
      if (Array.isArray(data)) {
        // Filter: show only challenges where user is a participant
        const userChallenges = data.filter((challenge: Challenge) => {
          const participantsList = Array.isArray(challenge.participants) ? challenge.participants : [];
          const isParticipant = participantsList.some((p: Participant) => p.user && p.user.id === user.id);
          console.log(`Challenge ${challenge.id}: isParticipant=${isParticipant}, participants=${participantsList.length}`);
          return isParticipant;
        });
        setChallenges(userChallenges);
        console.log('Filtered user challenges:', userChallenges.length, 'out of', data.length);
      } else {
        console.error('Expected array but got:', typeof data);
        setChallenges([]);
      }
    } catch (error: any) {
      console.error('Failed to load challenges:', error);
      setChallenges([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveChallenge = async (challengeId: string, challengeTitle: string) => {
    if (!user?.id) {
      console.error('Cannot leave challenge: user not found');
      return;
    }
    
    if (!confirm(`Вы уверены, что хотите покинуть челлендж "${challengeTitle}"?`)) {
      return;
    }

    try {
      console.log('🚪 Leaving challenge:', { 
        challengeId, 
        challengeTitle,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      // Make the API call first
      const result = await challengesApi.removeParticipant(challengeId, user.id);
      console.log('✅ Successfully left challenge:', result);
      
      // Then update the UI - remove challenge from list
      setChallenges(prev => {
        const filtered = prev.filter(challenge => challenge.id !== challengeId);
        console.log(`📋 Updated challenges list: ${prev.length} -> ${filtered.length}`);
        return filtered;
      });
      
      // Reload to ensure consistency
      setTimeout(async () => {
        await loadChallenges();
      }, 500);
    } catch (error: any) {
      console.error('❌ Failed to leave challenge:', error);
      console.error('Error details:', {
        challengeId,
        challengeTitle,
        userId: user.id,
        errorMessage: error.message,
        errorStatus: error.statusCode,
        errorStack: error.stack,
      });
      
      // Show error to user
      const errorMessage = error.message || error.statusCode 
        ? `Ошибка ${error.statusCode}: ${error.message || 'Не удалось покинуть челлендж'}`
        : 'Ошибка подключения к серверу';
      
      alert(errorMessage);
      
      // Reload to restore correct state
      await loadChallenges();
    }
  };

  const isUserParticipant = (challenge: Challenge): boolean => {
    if (!user?.id) return false;
    const participantsList = Array.isArray(challenge.participants) ? challenge.participants : [];
    return participantsList.some(p => p.user && p.user.id === user.id);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500/50 text-yellow-600 dark:text-yellow-400 border-yellow-500/80 font-semibold">🥇 1-е место</Badge>;
    if (index === 1) return <Badge className="bg-gray-400/50 text-gray-600 dark:text-gray-300 border-gray-400/80 font-semibold">🥈 2-е место</Badge>;
    if (index === 2) return <Badge className="bg-amber-600/50 text-amber-700 dark:text-amber-500 border-amber-600/80 font-semibold">🥉 3-е место</Badge>;
    return <Badge variant="outline">#{index + 1}</Badge>;
  };

  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return undefined;

    // Normalize any stored full URL that points to our uploads folder
    let avatarPath = avatarUrl;
    const uploadsIndex = avatarPath.indexOf('/uploads/photos/');
    if (uploadsIndex !== -1) {
      avatarPath = avatarPath.substring(uploadsIndex);
    }

    // External avatars (third‑party URLs) should be used as‑is
    if (uploadsIndex === -1 && avatarPath.startsWith('http')) {
      return avatarPath;
    }

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    return avatarPath.startsWith('/')
      ? `${backendUrl}${avatarPath}`
      : `${backendUrl}/${avatarPath}`;
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            {t('challenges.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('challenges.subtitle')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">{t('challenges.loading')}</p>
          </div>
        </div>
      ) : challenges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('challenges.noChallenges')}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t('challenges.noChallengesDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div 
          className="grid gap-6" 
          style={{ 
            gridTemplateColumns: windowWidth <= 1099 
              ? 'repeat(auto-fit, 378px)' 
              : 'repeat(auto-fill, minmax(378px, 1fr))',
            justifyContent: windowWidth <= 1099 ? 'center' : 'stretch',
            maxWidth: '100%'
          }}
        >
          {challenges.map((challenge) => {
            // Ensure participants is an array
            const participantsList = Array.isArray(challenge.participants) ? challenge.participants : [];
            const participants = participantsList.map(p => ({
              ...p,
              progress: Math.min(100, Math.round((p.savedAmount / challenge.targetAmount) * 100)),
              savedAmount: p.savedAmount,
            })).sort((a, b) => b.progress - a.progress);

            const userIsParticipant = isUserParticipant(challenge);
            const userRank = participants.findIndex(p => p.user.id === user?.id);
            const totalParticipants = participants.length;
            const averageProgress = participants.reduce((sum, p) => sum + p.progress, 0) / participants.length;

            const isCompleted = challenge.isCompleted || false;
            const isUserWinner = challenge.winnerId === user?.id;
            
            // Debug logging for completed challenges
            if (isCompleted && userIsParticipant) {
              console.log('🔍 Completed challenge participant check:', {
                challengeId: challenge.id,
                title: challenge.title,
                isCompleted,
                userIsParticipant,
                participantsCount: participants.length,
                userInList: participants.some(p => p.user?.id === user?.id),
                userId: user?.id,
              });
            }

            return (
              <Card 
                key={challenge.id} 
                className={`flex flex-col hover:shadow-lg transition-shadow duration-300 ${
                  isCompleted ? 'border-2 border-primary/50 bg-primary/5' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        ) : (
                          <Target className="h-5 w-5 text-primary shrink-0" />
                        )}
                        <CardTitle className="text-xl">{challenge.title}</CardTitle>
                        {isCompleted && (
                          <Badge className="bg-primary text-primary-foreground ml-2">
                            <Trophy className="h-3 w-3 mr-1" />
                            {t('challenges.completed')}
                          </Badge>
                        )}
                      </div>
                      {isUserWinner && (
                        <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50 w-fit">
                          <Sparkles className="h-3 w-3 mr-1" />
                          🏆 {t('challenges.winner')}
                        </Badge>
                      )}
                      {challenge.description && (
                        <CardDescription className="text-sm">{challenge.description}</CardDescription>
                      )}
                      <div className="flex items-center justify-between text-xs text-foreground/80 dark:text-foreground/90 pt-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>{totalParticipants} участников</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <TrendingUp className="h-4 w-4 shrink-0" />
                          <span>Средний прогресс: {Math.round(averageProgress)}%</span>
                        </div>
                      </div>
                    </div>
                    {userIsParticipant && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          console.log('🔘 Leave button clicked for challenge:', {
                            challengeId: challenge.id,
                            title: challenge.title,
                            isCompleted,
                            userId: user?.id,
                          });
                          handleLeaveChallenge(challenge.id, challenge.title);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        title={t('challenges.removeParticipant')}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        {t('challenges.leaderboard')}
                      </h4>
                      {userRank >= 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {t('challenges.yourPlace')}: #{userRank + 1}
                        </Badge>
                      )}
                    </div>
                    <ul className="space-y-3">
                      {participants.map((participant, index) => {
                        const isCurrentUser = participant.user.id === user?.id;
                        const rankIcon = getRankIcon(index);
                        
                        // Background colors for top 3
                        const getBackgroundColor = () => {
                          if (index === 0) return 'bg-yellow-500/10 border border-yellow-500/30';
                          if (index === 1) return 'bg-gray-400/10 border border-gray-400/30';
                          if (index === 2) return 'bg-amber-600/10 border border-amber-600/30';
                          if (isCurrentUser) return 'bg-primary/10 border border-primary/20';
                          return 'hover:bg-muted/50 border border-transparent';
                        };
                        
                        return (
                          <li 
                            key={participant.id} 
                            className={`relative flex items-center gap-3 p-2 rounded-lg transition-colors ${getBackgroundColor()}`}
                          >
                            {/* Badge positioned to be half outside the li */}
                            {index < 3 && (
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                                {getRankBadge(index)}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {rankIcon ? (
                                rankIcon
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                  {index + 1}
                                </div>
                              )}
                            </div>
                            <Avatar className="h-10 w-10 border-2 border-background">
                              {participant.user.avatarUrl ? (
                                <AvatarImage
                                  src={getAvatarUrl(participant.user.avatarUrl)}
                                  alt={participant.user.username}
                                />
                              ) : null}
                              <AvatarFallback className="text-xs font-semibold">
                                {participant.user.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`font-medium text-sm truncate ${
                                    isCurrentUser 
                                      ? 'text-primary font-semibold dark:text-primary' 
                                      : 'text-foreground'
                                  }`}>
                                    {participant.user.username}
                                  </span>
                                  {isCurrentUser && (
                                    <Badge variant="default" className="text-xs px-1.5 py-0 font-semibold">
                                      Вы
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-col items-end shrink-0">
                                  <span className="text-sm font-bold text-foreground">
                                    {participant.progress}%
                                  </span>
                                  <span className="text-xs text-foreground/70 dark:text-foreground/80">
                                    {fc(participant.savedAmount)} / {fc(challenge.targetAmount)}
                                  </span>
                                </div>
                              </div>
                              <Progress 
                                value={participant.progress} 
                                className={`h-2 ${
                                  index === 0 ? 'bg-yellow-500/20' :
                                  index === 1 ? 'bg-gray-400/20' :
                                  index === 2 ? 'bg-amber-600/20' :
                                  ''
                                }`}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Congratulations Dialog */}
      <Dialog open={congratulationsOpen} onOpenChange={setCongratulationsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Trophy className="h-20 w-20 text-yellow-500 animate-bounce" />
                <Sparkles className="h-8 w-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
            </div>
            <DialogTitle className="text-2xl text-center">
              🎉 {t('challenges.congratulations')}!
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              {wonChallenge ? t('challenges.congratulationsDesc').replace('{title}', wonChallenge.title).replace('${amount}', fc(wonChallenge.targetAmount)) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {wonChallenge && (
              <>
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-2">{wonChallenge.title}</h3>
                  <p className="text-muted-foreground">
                    Вы достигли цели и заняли первое место! 🏆
                  </p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t('challenges.yourProgress')}</p>
                  <p className="text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fc(wonChallenge.targetAmount)} {t('challenges.saved')}
                  </p>
                </div>
                <div className="text-center text-sm text-muted-foreground space-y-2">
                  <p>{t('challenges.keepGoing')}</p>
                  <p className="text-primary font-medium">
                    {t('challenges.newChallengeCreated')}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setCongratulationsOpen(false)} className="w-full">
              {t('challenges.great')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
