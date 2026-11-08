const getDefaultApiUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Safe fallback for production: use same-origin /api
    return `${window.location.origin}/api`;
  }
  return '/api';
};

const API_URL = import.meta.env.VITE_API_URL || getDefaultApiUrl();
const BACKEND_URL = API_URL.replace(/\/api\/?$/, '');

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  avatarUrl?: string;
  role?: 'user' | 'admin' | 'superadmin' | 'viewer_admin';
  isBlocked?: boolean;
  currency?: 'USD' | 'UZS' | 'JPY' | 'RUB';
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  role: 'user' | 'admin' | 'superadmin' | 'viewer_admin';
  isBlocked: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  adminsOnline: number;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserFeedbackItem {
  id: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  username: string;
  email: string;
}

export interface AdminFeedbacksResponse {
  items: UserFeedbackItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText || 'An error occurred',
      }));
      throw {
        message: error.message || 'An error occurred',
        statusCode: response.status,
      } as ApiError;
    }

    return response.json();
  } catch (error) {
    // Handle network errors (server not running, CORS, etc.)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw {
        message: 'Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на порту 3000.',
        statusCode: 0,
      } as ApiError;
    }
    // Re-throw other errors
    throw error;
  }
}

// Auth API
export const authApi = {
  async requestEmailVerification(email: string) {
    return apiRequest<{ success: boolean; token?: string }>('/auth/request-email-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async register(email: string, username: string, password: string) {
    return apiRequest<{ userId: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  },

  async login(email: string, password: string) {
    return apiRequest<{ userId: string; emailVerified: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async verifyEmail(token: string) {
    return apiRequest<{ success: boolean; email?: string }>(`/auth/verify-email/${token}`, {
      method: 'POST',
    });
  },

  async requestPasswordReset(email: string) {
    return apiRequest<{ success: boolean }>('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyResetCode(code: string) {
    return apiRequest<{ success: boolean; email?: string }>('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return apiRequest<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async getProfile(userId: string) {
    return apiRequest<UserProfile>(`/auth/profile/${userId}`);
  },

  async updateProfile(userId: string, avatarUrl?: string) {
    return apiRequest<UserProfile>(`/auth/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ avatarUrl }),
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return apiRequest<{ success: boolean }>(`/auth/change-password/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async verifyCurrentPassword(userId: string, password: string) {
    return apiRequest<{ success: boolean }>(`/auth/verify-current-password/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async updateUsername(userId: string, username: string) {
    return apiRequest<{ success: boolean }>(`/auth/username/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ username }),
    });
  },

  async verifyCurrentEmail(userId: string, email: string) {
    return apiRequest<{ success: boolean }>(`/auth/verify-current-email/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async requestNewEmailVerification(userId: string, newEmail: string) {
    return apiRequest<{ success: boolean; token?: string }>(`/auth/request-new-email-verification/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    });
  },

  async updateEmail(userId: string, verificationToken: string) {
    return apiRequest<{ success: boolean; email?: string }>(`/auth/update-email/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ verificationToken }),
    });
  },

  async updateCurrency(userId: string, currency: 'USD' | 'UZS' | 'JPY' | 'RUB') {
    return apiRequest<UserProfile>(`/auth/currency/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ currency }),
    });
  },
};

// Chat API
export const chatApi = {
  async sendMessage(userId: string, message: string, language?: string, context: 'chat' | 'emotions' = 'chat') {
    return apiRequest<{ message: string; toolUsed?: string }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ userId, message, context, language }),
    });
  },
};

// Challenges API
export const challengesApi = {
  async getAll(language?: string) {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    return apiRequest(`/challenges?${params.toString()}`);
  },

  async getById(id: string) {
    return apiRequest(`/challenges/${id}`);
  },

  async createChallenge(title: string, targetAmount: number, description?: string) {
    return apiRequest('/challenges', {
      method: 'POST',
      body: JSON.stringify({ title, targetAmount, description }),
    });
  },

  async addParticipant(challengeId: string, userId: string, savedAmount?: number) {
    return apiRequest(`/challenges/${challengeId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ userId, savedAmount }),
    });
  },

  async findClosestChallenges(targetAmount: number) {
    return apiRequest(`/challenges/match?targetAmount=${targetAmount}`);
  },

  async removeParticipant(challengeId: string, userId: string) {
    return apiRequest(`/challenges/${challengeId}/participants/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Goals API
export const goalsApi = {
  async getAll(userId: string) {
    return apiRequest(`/goals?userId=${userId}`);
  },

  async getBalance(userId: string) {
    return apiRequest(`/goals/balance/${userId}`);
  },

  async create(userId: string, name: string, targetAmount: number, imageUrl?: string, autoAllocatePercent?: number) {
    return apiRequest('/goals', {
      method: 'POST',
      body: JSON.stringify({ userId, name, targetAmount, imageUrl, autoAllocatePercent: autoAllocatePercent || 0 }),
    });
  },

  async update(goalId: string, userId: string, data: { currentAmount?: number; targetAmount?: number; name?: string; imageUrl?: string; autoAllocatePercent?: number }) {
    return apiRequest(`/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...data }),
    });
  },

  async delete(goalId: string, userId: string) {
    return apiRequest(`/goals/${goalId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },

  // Совместные цели
  async createShared(userId: string, name: string, targetAmount: number, imageUrl?: string, isFamilyMode?: boolean, participantIds?: string[]) {
    return apiRequest('/goals/shared', {
      method: 'POST',
      body: JSON.stringify({ userId, name, targetAmount, imageUrl, isFamilyMode, participantIds }),
    });
  },

  async getShared(userId: string) {
    return apiRequest(`/goals/shared?userId=${userId}`);
  },

  async addContribution(goalId: string, userId: string, amount: number) {
    return apiRequest(`/goals/shared/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ userId, amount }),
    });
  },

  async getContributions(goalId: string) {
    return apiRequest(`/goals/shared/${goalId}/contributions`);
  },

  async addParticipant(goalId: string, userId: string, participantId: string) {
    return apiRequest(`/goals/shared/${goalId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ userId, participantId }),
    });
  },

  async removeParticipant(goalId: string, userId: string, participantId: string) {
    return apiRequest(`/goals/shared/${goalId}/participants/${participantId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },

  async deleteShared(goalId: string, userId: string) {
    return apiRequest(`/goals/shared/${goalId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },

  // Приглашения
  async sendInvitation(goalId: string, userId: string, invitedUserEmailOrUsername: string) {
    return apiRequest(`/goals/shared/${goalId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userId, invitedUserEmailOrUsername }),
    });
  },

  async getInvitations(userId: string, type: 'sent' | 'received' = 'received') {
    return apiRequest(`/goals/invitations?userId=${userId}&type=${type}`);
  },

  async acceptInvitation(invitationId: string, userId: string) {
    return apiRequest(`/goals/invitations/${invitationId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async rejectInvitation(invitationId: string, userId: string) {
    return apiRequest(`/goals/invitations/${invitationId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async sendInvitationToRegularGoal(goalId: string, userId: string, invitedUserEmailOrUsername: string) {
    return apiRequest(`/goals/${goalId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userId, invitedUserEmailOrUsername }),
    });
  },
};

// Expenses/Incomes API (Timeline)
export const expensesApi = {
  async getExpenses(userId: string) {
    return apiRequest(`/chat/expenses?userId=${userId}`);
  },

  async getIncomes(userId: string) {
    return apiRequest(`/chat/incomes?userId=${userId}`);
  },

  async uploadPhoto(file: File): Promise<{ path: string; filename: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await fetch(`${API_URL}/chat/upload-photo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText || 'An error occurred',
      }));
      throw {
        message: error.message || 'An error occurred',
        statusCode: response.status,
      } as ApiError;
    }

    return response.json();
  },

  async deletePhoto(photoPath: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('/chat/delete-photo', {
      method: 'DELETE',
      body: JSON.stringify({ path: photoPath }),
    });
  },

  async addExpense(
    userId: string,
    description: string,
    amount: number,
    emotion: 'low' | 'medium' | 'high' = 'medium',
    photo?: string,
    category?: string,
    isRecurring?: boolean,
    recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly',
    recurrenceInterval?: number,
    recurrenceDaysCount?: number,
  ) {
    const body: any = { userId, description, amount };
    // Добавляем emotion только если он определен
    if (emotion) {
      body.emotion = emotion;
    }
    if (photo) {
      body.photo = photo;
    }
    if (category) {
      body.category = category;
    }
    // Добавляем поля повторения только если isRecurring явно true
    if (isRecurring === true) {
      body.isRecurring = true;
      if (recurrenceType) {
        body.recurrenceType = recurrenceType;
      }
      if (recurrenceInterval !== undefined && recurrenceInterval !== null && recurrenceInterval > 0) {
        body.recurrenceInterval = recurrenceInterval;
      }
      if (recurrenceDaysCount !== undefined && recurrenceDaysCount !== null && recurrenceDaysCount > 0) {
        body.recurrenceDaysCount = recurrenceDaysCount;
      }
    }
    return apiRequest('/chat/expenses', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async addIncome(
    userId: string,
    description: string,
    amount: number,
    photo?: string,
    isRecurring?: boolean,
    recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly',
    recurrenceInterval?: number,
    recurrenceDaysCount?: number,
  ) {
    const body: any = { userId, description, amount: Number(amount) };
    if (photo && photo.trim().length > 0) {
      body.photo = photo;
    }
    // Добавляем поля повторения только если isRecurring явно true
    if (isRecurring === true) {
      body.isRecurring = true;
      if (recurrenceType) {
        body.recurrenceType = recurrenceType;
      }
      if (recurrenceInterval !== undefined && recurrenceInterval !== null && recurrenceInterval > 0) {
        body.recurrenceInterval = recurrenceInterval;
      }
      if (recurrenceDaysCount !== undefined && recurrenceDaysCount !== null && recurrenceDaysCount > 0) {
        body.recurrenceDaysCount = recurrenceDaysCount;
      }
    }
    return apiRequest('/chat/incomes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async deleteExpense(expenseId: string, userId: string) {
    return apiRequest(`/chat/expenses/${expenseId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },

  async updateExpense(
    expenseId: string,
    userId: string,
    data: {
      description?: string;
      note?: string;
      amount?: number;
      emotion?: 'low' | 'medium' | 'high';
      category?: string;
      photo?: string;
    },
  ) {
    const body: Record<string, unknown> = { userId };
    if (data.description !== undefined) body.description = data.description;
    if (data.note !== undefined) body.note = data.note;
    if (data.amount !== undefined) body.amount = data.amount;
    if (data.emotion !== undefined) body.emotion = data.emotion;
    if (data.category !== undefined) body.category = data.category;
    if (data.photo !== undefined) body.photo = data.photo;
    return apiRequest(`/chat/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updateIncome(incomeId: string, userId: string, description?: string, note?: string) {
    return apiRequest(`/chat/incomes/${incomeId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, description, note }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async deleteIncome(incomeId: string, userId: string) {
    return apiRequest(`/chat/incomes/${incomeId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },

  async getCategories(userId: string) {
    return apiRequest(`/chat/categories?userId=${userId}`);
  },

  async renameCategory(userId: string, oldCategory: string, newCategory: string) {
    return apiRequest('/chat/categories/rename', {
      method: 'POST',
      body: JSON.stringify({ userId, oldCategory, newCategory }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async mergeCategories(userId: string, sourceCategory: string, targetCategory: string) {
    return apiRequest('/chat/categories/merge', {
      method: 'POST',
      body: JSON.stringify({ userId, sourceCategory, targetCategory }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updateTransactionCategory(userId: string, transactionIds: string[], newCategory: string) {
    return apiRequest('/chat/categories/update-transactions', {
      method: 'POST',
      body: JSON.stringify({ userId, transactionIds, newCategory }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async generateReport(
    userId: string,
    format: 'pdf' | 'excel' | 'html' | 'all',
    dateRange: string,
    includeCharts: boolean = true,
    sendToEmail: boolean = false,
    language: 'ru' | 'en' | 'ja' = 'en',
  ) {
    return apiRequest('/chat/generate-report', {
      method: 'POST',
      body: JSON.stringify({ userId, format, dateRange, includeCharts, sendToEmail, language }),
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

// Emotions API
export const emotionsApi = {
  async getEmotions(userId: string, from?: string, to?: string) {
    const params = new URLSearchParams({ userId });
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return apiRequest(`/chat/emotions?${params.toString()}`);
  },
};

// Achievements API
export const achievementsApi = {
  async getAchievements(userId: string, language?: string) {
    const params = new URLSearchParams({ userId: userId });
    if (language) params.append('language', language);
    return apiRequest(`/achievements/${userId}?${params.toString()}`);
  },

  async getStats(userId: string, language?: string) {
    const params = new URLSearchParams({ userId: userId });
    if (language) params.append('language', language);
    return apiRequest(`/achievements/stats/${userId}?${params.toString()}`);
  },
};

// Budgets API
export const budgetsApi = {
  async getAll(userId: string, withSpending = true) {
    const params = new URLSearchParams({ userId });
    if (withSpending) params.append('withSpending', 'true');
    return apiRequest(`/budgets?${params.toString()}`);
  },

  async getById(userId: string, budgetId: string) {
    return apiRequest(`/budgets/${budgetId}?userId=${userId}`);
  },

  async create(userId: string, data: { category: string; limit: number; period: 'weekly' | 'monthly' | 'yearly'; note?: string }) {
    return apiRequest(`/budgets?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(userId: string, budgetId: string, data: { category?: string; limit?: number; period?: 'weekly' | 'monthly' | 'yearly'; note?: string }) {
    return apiRequest(`/budgets/${budgetId}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(userId: string, budgetId: string) {
    return apiRequest(`/budgets/${budgetId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },
};

export const adminApi = {
  async getStats(adminUserId: string) {
    return apiRequest<AdminStats>(`/admin/stats?adminUserId=${adminUserId}`);
  },

  async getUsers(adminUserId: string, search = '', page = 1, limit = 20) {
    const params = new URLSearchParams({ adminUserId });
    if (search.trim()) {
      params.append('search', search.trim());
    }
    params.append('page', String(page));
    params.append('limit', String(limit));
    return apiRequest<AdminUsersResponse>(`/admin/users?${params.toString()}`);
  },

  async setUserBlocked(userId: string, adminUserId: string, isBlocked: boolean) {
    return apiRequest<{ success: boolean; user: AdminUser }>(`/admin/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ adminUserId, isBlocked }),
    });
  },

  async createUser(
    adminUserId: string,
    payload: {
      email: string;
      username: string;
      password: string;
      role?: 'user' | 'admin' | 'viewer_admin';
    },
  ) {
    return apiRequest<{ success: boolean; user: AdminUser }>(`/admin/users`, {
      method: 'POST',
      body: JSON.stringify({ adminUserId, ...payload }),
    });
  },

  async deleteUser(userId: string, adminUserId: string) {
    const params = new URLSearchParams({ adminUserId });
    return apiRequest<{ success: boolean }>(`/admin/users/${userId}?${params.toString()}`, {
      method: 'DELETE',
    });
  },

  async updateUsername(userId: string, adminUserId: string, username: string) {
    return apiRequest<{ success: boolean; user: AdminUser }>(`/admin/users/${userId}/username`, {
      method: 'POST',
      body: JSON.stringify({ adminUserId, username }),
    });
  },

  async updatePassword(userId: string, adminUserId: string, password: string) {
    return apiRequest<{ success: boolean }>(`/admin/users/${userId}/password`, {
      method: 'POST',
      body: JSON.stringify({ adminUserId, password }),
    });
  },

  async getEvents(adminUserId: string) {
    return apiRequest<Array<{ id: number; message: string; time: string; severity: string }>>(
      `/admin/events?adminUserId=${adminUserId}`,
    );
  },

  async getFeedbacks(adminUserId: string, page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({
      adminUserId,
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.append('search', search.trim());
    return apiRequest<AdminFeedbacksResponse>(`/admin/feedbacks?${params.toString()}`);
  },

  async getFeedbackById(adminUserId: string, feedbackId: string) {
    const params = new URLSearchParams({ adminUserId });
    return apiRequest<UserFeedbackItem>(`/admin/feedbacks/${feedbackId}?${params.toString()}`);
  },

  async createFeedback(adminUserId: string, userId: string, message: string) {
    return apiRequest<UserFeedbackItem>(`/admin/feedbacks`, {
      method: 'POST',
      body: JSON.stringify({ adminUserId, userId, message }),
    });
  },

  async updateFeedback(adminUserId: string, feedbackId: string, message: string) {
    return apiRequest<UserFeedbackItem>(`/admin/feedbacks/${feedbackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ adminUserId, message }),
    });
  },

  async deleteFeedback(adminUserId: string, feedbackId: string) {
    const params = new URLSearchParams({ adminUserId });
    return apiRequest<{ success: boolean }>(`/admin/feedbacks/${feedbackId}?${params.toString()}`, {
      method: 'DELETE',
    });
  },

  async sendFeedbackReply(adminUserId: string, feedbackId: string, message: string) {
    return apiRequest<{ success: boolean; sentTo: string }>(`/admin/feedbacks/${feedbackId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ adminUserId, message }),
    });
  },
};

export const feedbackApi = {
  async submit(userId: string, message: string) {
    return apiRequest<UserFeedbackItem>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ userId, message }),
    });
  },
};

export default apiRequest;
