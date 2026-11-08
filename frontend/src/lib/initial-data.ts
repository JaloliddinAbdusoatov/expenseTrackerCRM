import type { Transaction, Goal } from './types';
import { PlaceHolderImages } from './placeholder-images';

const today = new Date();
const daysAgo = (days: number) =>
  new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const transactions: Omit<Transaction, 'icon'>[] = [
  {
    id: '1',
    name: 'Dinner at The Italian Place',
    category: 'Food',
    amount: 75.5,
    date: daysAgo(2),
    emotion: 'happy',
    location: 'Rome, Italy',
    photo: PlaceHolderImages.find((img) => img.id === 'restaurant-meal')
      ?.imageUrl,
    photoHint: PlaceHolderImages.find((img) => img.id === 'restaurant-meal')
      ?.imageHint,
  },
  {
    id: '2',
    name: 'New Sneakers',
    category: 'Shopping',
    amount: 150.0,
    date: daysAgo(5),
    emotion: 'sad',
    location: 'Online Store',
    photo: PlaceHolderImages.find((img) => img.id === 'new-shoes')?.imageUrl,
    photoHint: PlaceHolderImages.find((img) => img.id === 'new-shoes')
      ?.imageHint,
  },
  {
    id: '3',
    name: 'Monthly Salary',
    category: 'Income',
    amount: -5000.0,
    date: daysAgo(0),
  },
  {
    id: '4',
    name: 'Gasoline',
    category: 'Transportation',
    amount: 45.2,
    date: daysAgo(3),
    emotion: 'neutral',
  },
  {
    id: '5',
    name: 'Concert Tickets',
    category: 'Entertainment',
    amount: 220.0,
    date: daysAgo(10),
    emotion: 'happy',
    photo: PlaceHolderImages.find((img) => img.id === 'concert-tickets')
      ?.imageUrl,
    photoHint: PlaceHolderImages.find((img) => img.id === 'concert-tickets')
      ?.imageHint,
  },
  {
    id: '6',
    name: 'Monthly Rent',
    category: 'Housing',
    amount: 1200.0,
    date: daysAgo(1),
    emotion: 'neutral',
  },
  {
    id: '7',
    name: "Mom's Birthday Gift",
    category: 'Other',
    amount: 80.0,
    date: daysAgo(15),
    emotion: 'happy',
  },
];

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
