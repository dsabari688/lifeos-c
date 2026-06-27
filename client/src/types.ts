export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  budgetLimit: number;
  aiPersonality: 'Calm' | 'Energetic' | 'Cynical' | 'Logical';
  dailyPlanningReminderTime: string; // e.g. "21:00"
  hasPlannedTomorrow: boolean;
  listeningMode?: 'always-listening' | 'push-to-talk' | 'text-only';
  proactiveModeEnabled?: boolean;
  maxProactiveNudges?: number;
  dailyReviewTime?: string;
  learnedPatterns?: string[];
}

export type TaskPriority = 'urgent-important' | 'important-not-urgent' | 'urgent-not-important' | 'not-urgent-not-important';

export interface Task {
  id: string;
  title: string;
  category: TaskPriority;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  recurType: 'none' | 'daily' | 'weekly';
  status: 'pending' | 'completed';
  originalDate?: string; // Track original date for skipped list
  rescheduledCount: number;
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  logs: string[]; // Array of YYYY-MM-DD completion dates
  skippedDaysCount: number;
}

export interface Expense {
  id: string;
  amount: number;
  category: 'food' | 'transportation' | 'shopping' | 'education' | 'healthcare' | 'entertainment' | 'misc';
  note: string;
  date: string; // YYYY-MM-DD
  isImpulsive?: boolean;
  explanation?: string; // User's self-reflection if impulsive/over-budget
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'chat' | 'scheduling' | 'predictive' | 'motivation';
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'reminder' | 'warning' | 'streak' | 'budget';
  read: boolean;
}

// --- NEW: Strategic Goals Module ---
export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string; // YYYY-MM-DD
  progress: number; // 0 to 100
  status: 'active' | 'completed' | 'paused';
}

export interface FullOSData {
  profile: UserProfile;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[]; // <-- We wired this in!
  expenses: Expense[];
  budgets: CategoryBudget[];
  chatHistory: ChatMessage[];
  notifications: SystemNotification[];
}