import type { Transaction, NewTransaction, TransactionCategory, Goal } from './types';
import {
  Utensils,
  ShoppingBag,
  Car,
  Ticket,
  Home,
  Landmark,
  Gift,
} from 'lucide-react';
import { transactions as initialTransactions } from './initial-data';
import { PlaceHolderImages } from './placeholder-images';

// This is a placeholder for a database.
let transactions: Omit<Transaction, 'icon'>[] = [];
let goals: Goal[] = [];

// Simulate fetching initial data
transactions = initialTransactions.map(({ icon, ...rest }) => rest);
import { goals as initialGoals } from './initial-data';
goals = initialGoals;

export async function addTransaction(transaction: NewTransaction & { photo?: string }): Promise<Omit<Transaction, 'icon'>> {
  const newTransaction: Omit<Transaction, 'icon'> = {
    ...transaction,
    id: Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString(),
    photo: transaction.photo,
  };
  transactions.unshift(newTransaction);
  return newTransaction;
}

export async function updateTransaction(updatedTransaction: NewTransaction & { id: string; photo?: string }): Promise<Omit<Transaction, 'icon'>> {
    const transaction = {
        ...updatedTransaction,
        date: new Date().toISOString(),
    }
  transactions = transactions.map((t) =>
    t.id === transaction.id ? transaction : t
  );
  return transaction;
}

export async function deleteTransaction(id: string): Promise<{ id: string }> {
  transactions = transactions.filter((t) => t.id !== id);
  return { id };
}

export async function addGoal(goal: Omit<Goal, 'id' | 'currentAmount' | 'imageHint' | 'imageUrl'> & {imageUrl?: string}): Promise<Goal> {

  const placeholder = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

  const newGoal: Goal = {
    ...goal,
    id: Math.random().toString(36).substring(2, 9),
    currentAmount: 0,
    imageUrl: goal.imageUrl || placeholder.imageUrl,
    imageHint: placeholder.imageHint,
  };
  goals.unshift(newGoal);
  return newGoal;
}

import { chatApi } from './api';

export async function handleChat(query: string, userId?: string, language?: string): Promise<{ response: string }> {
  if (!userId) {
    return { 
      response: "Please log in to use the chat feature." 
    };
  }

  try {
    const data = await chatApi.sendMessage(userId, query, language);
    return {
      response: data.message || 'Got it!',
    };
  } catch (error: any) {
    console.error('Chat error:', error);
    return {
      response: error.message || "Sorry, I'm having trouble connecting. Please try again later.",
    };
  }
}
