import type { LucideIcon } from 'lucide-react';

export type Emotion = 'happy' | 'neutral' | 'sad';

export type TransactionCategory =
  | 'Food & Dining'
  | 'Shopping'
  | 'Transportation'
  | 'Entertainment'
  | 'Bills & Utilities'
  | 'Health & Medical'
  | 'Education'
  | 'Travel & Tourism'
  | 'Fitness & Sports'
  | 'Gifts & Donations'
  | 'Income'
  | 'Other';

export type Transaction = {
  id: string;
  name: string;
  category: TransactionCategory;
  amount: number;
  date: string; // ISO string
  emotion?: Emotion;
  location?: string;
  photo?: string; // URL to photo
  photoHint?: string;
};

export type NewTransaction = Omit<Transaction, 'id' | 'date'> & { id?: string };

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  imageUrl: string;
  imageHint: string;
};

export type Challenge = {
  id:string;
  title: string;
  description: string;
  participants: {
    id: string;
    name: string;
    avatarUrl: string;
    progress: number;
  }[];
};
