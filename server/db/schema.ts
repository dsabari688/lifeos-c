export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  budgetLimit: number;
  aiPersonality: string;
  dailyPlanningReminderTime: string;
  hasPlannedTomorrow: boolean;
  listeningMode: string;
  proactiveModeEnabled: boolean;
  maxProactiveNudges: number;
  dailyReviewTime: string;
  learnedPatterns: string[];
}

export interface Task {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  recurType: string;
  status: string;
  rescheduledCount: number;
  originalDate?: string;
}

export interface Habit {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  logs: string[];
  logTimes?: string[];
  skippedDaysCount: number;
  icon: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  status: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  isImpulsive: boolean;
  explanation?: string;
}

export interface SleepLog {
  date: string;
  duration: number;
  sleepTime: string;
  wakeTime: string;
}

export interface MoodLog {
  id: string;
  mood: string;
  note: string;
  createdAt: string;
}

export interface FocusSession {
  durationMinutes: number;
  completedTasks: number;
  distractions: number;
  score: number;
  timestamp: string;
}

export interface AIMemory {
  id: string;
  fact: string;
  category: string;
  timestamp: string;
}

export interface RecommendationFeedback {
  id: string;
  text: string;
  type: string;
  status: string;
  timestamp: string;
  baselineRateBefore: number;
  habitId?: string;
}

export interface MonthlySnapshot {
  month: string;
  habitConsistency: number;
}

export interface Reflection {
  date: string;
  completedHabitsCount: number;
  totalHabitsCount: number;
  mood: string;
  focusMinutes: number;
  reflectionText: string;
  timestamp: string;
}

export interface UserPatterns {
  taskCompletionByHour: Record<string, number>;
  mostProductiveDay: string;
  mostSkippedHabit: string;
  avgTasksCompletedPerDay: number;
  streakBreakDays: string[];
  spendingByCategory: Record<string, number>;
  focusSessionAvgMinutes: number;
  goalProgressRate: number;
}

export interface UserData {
  profile: UserProfile;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  expenses: Expense[];
  budgets: Budget[];
  chatHistory: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    type?: string;
  }[];
  notifications: {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    type: string;
    read: boolean;
  }[];
  moods?: MoodLog[];
  sleepLogs?: SleepLog[];
  focusSessions?: FocusSession[];
  aiMemory?: AIMemory[];
  recommendationsFeedback?: RecommendationFeedback[];
  monthlySnapshots?: MonthlySnapshot[];
  reflections?: Reflection[];
  userPatterns?: UserPatterns;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface DatabaseState {
  users: UserRecord[];
  userData: Record<string, UserData>;
}
