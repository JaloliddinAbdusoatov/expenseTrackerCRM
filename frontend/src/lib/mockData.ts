export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

// Mock database functions
const STORAGE_KEYS = {
  USER: 'emotion_tracker_user',
};

export const mockDb = {
  // User operations
  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  setUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Auth simulation
  login: (email: string, password: string): User | null => {
    // Simulate login - in real app would verify credentials
    const existingUser = mockDb.getUser();
    if (existingUser && existingUser.email === email) {
      return existingUser;
    }
    return null;
  },

  register: (email: string, password: string, name: string): User => {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      name,
    };
    mockDb.setUser(user);
    return user;
  },
};
