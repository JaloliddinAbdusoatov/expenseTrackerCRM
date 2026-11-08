import type { Goal, Challenge } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { transactions as allTransactions } from './initial-data';


export const goals: Goal[] = [
  {
    id: 'g1',
    name: 'Buy a new MacBook',
    targetAmount: 2000,
    currentAmount: 850,
    imageUrl:
      PlaceHolderImages.find((img) => img.id === 'macbook-goal')?.imageUrl ??
      '',
    imageHint:
      PlaceHolderImages.find((img) => img.id === 'macbook-goal')?.imageHint ??
      '',
  },
  {
    id: 'g2',
    name: 'Summer Vacation',
    targetAmount: 1500,
    currentAmount: 1100,
    imageUrl:
      PlaceHolderImages.find((img) => img.id === 'vacation-goal')?.imageUrl ??
      '',
    imageHint:
      PlaceHolderImages.find((img) => img.id === 'vacation-goal')?.imageHint ??
      '',
  },
];

export const challenges: Challenge[] = [
  {
    id: 'c1',
    title: 'Less coffee, more savings ☕💰',
    description: 'Cut down on daily coffee expenses for a month.',
    participants: [
      {
        id: 'p1',
        name: 'You',
        avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        progress: 75,
      },
      {
        id: 'p2',
        name: 'Alex',
        avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026705d',
        progress: 90,
      },
      {
        id: 'p3',
        name: 'Sarah',
        avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026706d',
        progress: 60,
      },
    ],
  },
  {
    id: 'c2',
    title: 'No Takeout Challenge',
    description: 'Cook all your meals at home for two weeks.',
    participants: [
      {
        id: 'p1',
        name: 'You',
        avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        progress: 40,
      },
      {
        id: 'p4',
        name: 'Michael',
        avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026707d',
        progress: 55,
      },
    ],
  },
];

export const transactions = allTransactions;
