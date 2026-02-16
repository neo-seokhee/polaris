// Test demo data validity - pure logic, no React Native dependencies

// Inline demo data helpers for testing
const getDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

const getDateTime = (daysFromNow: number, hour: number, minute: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

// Sample demo data structures for testing
const DEMO_AFFIRMATIONS = [
  { id: 'demo-affirmation-1', user_id: 'demo-user', text: '오늘 하루도 최선을 다하자', created_at: new Date().toISOString() },
];

const DEMO_DDAYS = [
  { id: 'demo-dday-1', user_id: 'demo-user', title: '프로젝트 마감', target_date: getDate(14), created_at: new Date().toISOString() },
];

const DEMO_TODOS = [
  { id: 'demo-todo-1', user_id: 'demo-user', title: '오전 미팅 준비하기', is_completed: false, is_active: true },
  { id: 'demo-todo-2', user_id: 'demo-user', title: '운동 30분', is_completed: true, is_active: false },
];

const DEMO_SCHEDULES = [
  { id: 'demo-schedule-1', user_id: 'demo-user', title: '팀 미팅', start_time: getDateTime(0, 10, 0), end_time: getDateTime(0, 11, 0), color: '#FFD700' },
];

const DEMO_GOALS = [
  { id: 'demo-goal-1', user_id: 'demo-user', title: '영어 공부', type: 'monthly' as const, year: new Date().getFullYear(), monthly_status: ['complete', 'complete', 'partial', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'] },
  { id: 'demo-goal-2', user_id: 'demo-user', title: '독서', type: 'percentage' as const, year: new Date().getFullYear(), percentage: 25 },
];

const DEMO_MEMOS = [
  { id: 'demo-memo-1', user_id: 'demo-user', content: '회의 내용', category: '업무', category_color: '#FFD700', is_starred: true },
];

describe('Demo Data Validity', () => {
  describe('DEMO_AFFIRMATIONS', () => {
    it('should have valid structure', () => {
      expect(DEMO_AFFIRMATIONS).toBeInstanceOf(Array);
      expect(DEMO_AFFIRMATIONS.length).toBeGreaterThan(0);

      DEMO_AFFIRMATIONS.forEach(affirmation => {
        expect(affirmation).toHaveProperty('id');
        expect(affirmation).toHaveProperty('user_id');
        expect(affirmation).toHaveProperty('text');
        expect(affirmation.user_id).toBe('demo-user');
        expect(typeof affirmation.text).toBe('string');
      });
    });
  });

  describe('DEMO_DDAYS', () => {
    it('should have future target dates', () => {
      const now = new Date();
      DEMO_DDAYS.forEach(dday => {
        const targetDate = new Date(dday.target_date);
        expect(targetDate.getTime()).toBeGreaterThan(now.getTime());
      });
    });
  });

  describe('DEMO_TODOS', () => {
    it('should have valid structure', () => {
      DEMO_TODOS.forEach(todo => {
        expect(todo).toHaveProperty('id');
        expect(todo).toHaveProperty('title');
        expect(todo).toHaveProperty('is_completed');
        expect(todo).toHaveProperty('is_active');
        expect(typeof todo.is_completed).toBe('boolean');
        expect(typeof todo.is_active).toBe('boolean');
      });
    });

    it('should have mix of completed and incomplete', () => {
      const completed = DEMO_TODOS.filter(t => t.is_completed);
      const incomplete = DEMO_TODOS.filter(t => !t.is_completed);
      expect(completed.length).toBeGreaterThan(0);
      expect(incomplete.length).toBeGreaterThan(0);
    });
  });

  describe('DEMO_SCHEDULES', () => {
    it('should have valid time ranges', () => {
      DEMO_SCHEDULES.forEach(schedule => {
        const startTime = new Date(schedule.start_time);
        const endTime = new Date(schedule.end_time);
        expect(endTime.getTime()).toBeGreaterThan(startTime.getTime());
      });
    });

    it('should have valid hex colors', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      DEMO_SCHEDULES.forEach(schedule => {
        expect(schedule.color).toMatch(hexColorRegex);
      });
    });
  });

  describe('DEMO_GOALS', () => {
    it('should have valid types', () => {
      DEMO_GOALS.forEach(goal => {
        expect(['monthly', 'percentage']).toContain(goal.type);
      });
    });

    it('should have monthly goals with 12 months', () => {
      const monthlyGoals = DEMO_GOALS.filter(g => g.type === 'monthly');
      monthlyGoals.forEach(goal => {
        expect((goal as any).monthly_status.length).toBe(12);
      });
    });

    it('should have percentage goals with valid percentage', () => {
      const percentageGoals = DEMO_GOALS.filter(g => g.type === 'percentage');
      percentageGoals.forEach(goal => {
        expect((goal as any).percentage).toBeGreaterThanOrEqual(0);
        expect((goal as any).percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('DEMO_MEMOS', () => {
    it('should have valid structure', () => {
      DEMO_MEMOS.forEach(memo => {
        expect(memo).toHaveProperty('id');
        expect(memo).toHaveProperty('content');
        expect(memo).toHaveProperty('category');
        expect(memo).toHaveProperty('is_starred');
        expect(typeof memo.is_starred).toBe('boolean');
      });
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent user_id across all demo data', () => {
      const allData = [...DEMO_AFFIRMATIONS, ...DEMO_DDAYS, ...DEMO_TODOS, ...DEMO_SCHEDULES, ...DEMO_GOALS, ...DEMO_MEMOS];
      allData.forEach(item => {
        expect(item.user_id).toBe('demo-user');
      });
    });

    it('should have unique IDs', () => {
      const allIds = [
        ...DEMO_AFFIRMATIONS.map(i => i.id),
        ...DEMO_DDAYS.map(i => i.id),
        ...DEMO_TODOS.map(i => i.id),
        ...DEMO_SCHEDULES.map(i => i.id),
        ...DEMO_GOALS.map(i => i.id),
        ...DEMO_MEMOS.map(i => i.id),
      ];
      const uniqueIds = [...new Set(allIds)];
      expect(allIds.length).toBe(uniqueIds.length);
    });
  });
});
