import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { transactions } from '@/lib/initial-data';
import { Lightbulb } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export function SpendingInsights() {
  const [insights, setInsights] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetInsights = async () => {
    setIsLoading(true);
    setInsights('');
    try {
      const spendingDataString = transactions
        .map(
          (t) =>
            `Category: ${t.category}, Amount: ${t.amount}, Emotion: ${
              t.emotion || 'not-recorded'
            }`
        )
        .join('\n');

      // Simplified insights - in a real app this would call an AI service
      setTimeout(() => {
        setInsights('Based on your spending patterns, you tend to spend more on Food and Entertainment when feeling happy. Consider setting a monthly budget for these categories to maintain financial balance while preserving joy.');
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      setInsights('Sorry, I was unable to generate insights at this time.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="col-span-4 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-yellow-400" />
          AI-Powered Insights
        </CardTitle>
        <CardDescription>
          Get personalized insights on your spending habits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.2s]"></div>
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.4s]"></div>
            <span>Generating insights...</span>
          </div>
        ) : insights ? (
          <p className="text-sm text-muted-foreground">{insights}</p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
