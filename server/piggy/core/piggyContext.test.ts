import { describe, it, expect, vi } from 'vitest';
import { collectUserContext } from './piggyContext.js';
import { dbService } from '../../db/index.js';

vi.mock('../../db/index.js', () => {
  return {
    dbService: {
      getDatabaseState: vi.fn(),
      getCachedPiggyContext: vi.fn((userId, generator) => generator())
    }
  };
});

describe('collectUserContext', () => {
  it('should collect context with empty/default user data', () => {
    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: []
    } as any);

    const userData = {};
    const context = collectUserContext(userData);

    expect(context.profile.name).toBe('User');
    expect(context.profile.email).toBe('');
    expect(context.profile.aiPersonality).toBe('Logical');
    expect(context.profile.budgetLimit).toBe(1000);
    expect(context.currentView).toBe('dashboard');
    expect(context.highlightedEntity).toBe('None');
    expect(context.tasksList).toEqual([]);
    expect(context.habitsList).toEqual([]);
    expect(context.financialBudgets).toEqual([]);
    expect(context.recentSleepLogs).toEqual([]);
    expect(context.recentMoodLogs).toEqual([]);
  });

  it('should find user record by email and use corresponding userId for caching', () => {
    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: [
        { id: 'user-123', email: 'test@lifeos.com', name: 'John Doe' }
      ]
    } as any);

    const userData = {
      profile: {
        name: 'John Doe',
        email: 'test@lifeos.com',
        aiPersonality: 'Inspiring',
        budgetLimit: 2000
      }
    };

    const context = collectUserContext(userData);
    expect(dbService.getCachedPiggyContext).toHaveBeenCalledWith('user-123', expect.any(Function));
    expect(context.profile.name).toBe('John Doe');
    expect(context.profile.email).toBe('test@lifeos.com');
    expect(context.profile.aiPersonality).toBe('Inspiring');
    expect(context.profile.budgetLimit).toBe(2000);
  });

  it('should handle tasks, active goals, and habits list', () => {
    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: []
    } as any);

    const userData = {
      goals: [
        { title: 'Learn TypeScript', status: 'active' },
        { title: 'Archived Goal', status: 'completed' }
      ],
      tasks: [
        { category: 'work', title: 'Code review', date: '2026-07-01', status: 'pending', rescheduledCount: 2 }
      ],
      habits: [
        { name: 'Exercise', streak: 5, logs: ['2026-07-01'], logTimes: [] }
      ]
    };

    const context = collectUserContext(userData);
    expect(context.activeGoals).toHaveLength(1);
    expect(context.activeGoals[0].title).toBe('Learn TypeScript');
    expect(context.tasksList).toEqual([
      '[Category: work, Title: Code review, Date: 2026-07-01, Status: pending, Rescheduled Count: 2]'
    ]);
    expect(context.habitsList[0]).toContain('Habit: Exercise');
  });

  it('should handle financial budgets and calculate current spend by category', () => {
    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: []
    } as any);

    const userData = {
      expenses: [
        { category: 'Food', amount: 15.50 },
        { category: 'Food', amount: 24.50 },
        { category: 'Bills', amount: 100.00 }
      ],
      budgets: [
        { category: 'Food', limit: 200 },
        { category: 'Bills', limit: 150 },
        { category: 'Travel', limit: 50 }
      ]
    };

    const context = collectUserContext(userData);
    expect(context.financialBudgets).toEqual([
      '[Category: Food, Limit: $200, CurrentSpend: $40.00]',
      '[Category: Bills, Limit: $150, CurrentSpend: $100.00]',
      '[Category: Travel, Limit: $50, CurrentSpend: $0.00]'
    ]);
  });

  it('should slice and format sleep and mood logs (up to 3 recent entries)', () => {
    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: []
    } as any);

    const userData = {
      sleepLogs: [
        { date: '2026-06-27', sleepTime: '23:00', wakeTime: '07:00', duration: 8 },
        { date: '2026-06-28', sleepTime: '23:00', wakeTime: '07:00', duration: 8 },
        { date: '2026-06-29', sleepTime: '23:00', wakeTime: '07:00', duration: 8 },
        { date: '2026-06-30', sleepTime: '22:30', wakeTime: '06:30', duration: 8 }
      ],
      moods: [
        { createdAt: '2026-06-27T10:00:00Z', mood: 'Calm', note: 'productive day' },
        { createdAt: '2026-06-28T10:00:00Z', mood: 'Tired', note: '' },
        { createdAt: '2026-06-29T10:00:00Z', mood: 'Happy', note: 'great weather' },
        { createdAt: '2026-06-30T10:00:00Z', mood: 'Excited' }
      ]
    };

    const context = collectUserContext(userData);
    expect(context.recentSleepLogs).toHaveLength(3);
    expect(context.recentSleepLogs[0]).toBe('[Date: 2026-06-28, Sleep Time: 23:00, Wake Time: 07:00, Duration: 8h]');
    expect(context.recentSleepLogs[2]).toBe('[Date: 2026-06-30, Sleep Time: 22:30, Wake Time: 06:30, Duration: 8h]');

    expect(context.recentMoodLogs).toHaveLength(3);
    expect(context.recentMoodLogs[0]).toBe('[Date: 2026-06-28, Mood: Tired, Note: none]');
    expect(context.recentMoodLogs[1]).toBe('[Date: 2026-06-29, Mood: Happy, Note: great weather]');
    expect(context.recentMoodLogs[2]).toBe('[Date: 2026-06-30, Mood: Excited, Note: none]');
  });

  it('should handle highlighted entities in activeContext', () => {
    vi.mocked(dbService.getDatabaseState).mockReturnValue({
      users: []
    } as any);

    // Case 1: selectedTaskName
    let context = collectUserContext({}, { selectedTaskName: 'Clean Room', selectedTaskId: 'task-1' });
    expect(context.highlightedEntity).toBe("Task 'Clean Room' (ID: task-1)");

    // Case 2: selectedHabitName
    context = collectUserContext({}, { selectedHabitName: 'Drink Water', selectedHabitId: 'habit-1' });
    expect(context.highlightedEntity).toBe("Habit 'Drink Water' (ID: habit-1)");

    // Case 3: currentView override
    context = collectUserContext({}, { currentView: 'calendar' });
    expect(context.currentView).toBe('calendar');
  });
});
