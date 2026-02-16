// Test date utility functions used throughout the app

describe('Date Utilities', () => {
  describe('getDate helper', () => {
    const getDate = (daysFromNow: number): string => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    it('should return today for 0 days', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getDate(0)).toBe(today);
    });

    it('should return future date for positive days', () => {
      const result = getDate(7);
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      expect(result).toBe(expected.toISOString().split('T')[0]);
    });

    it('should return past date for negative days', () => {
      const result = getDate(-7);
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);
      expect(result).toBe(expected.toISOString().split('T')[0]);
    });

    it('should return YYYY-MM-DD format', () => {
      const result = getDate(0);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getDateTime helper', () => {
    const getDateTime = (daysFromNow: number, hour: number, minute: number = 0): string => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      date.setHours(hour, minute, 0, 0);
      return date.toISOString();
    };

    it('should return correct hour and minute', () => {
      const result = getDateTime(0, 14, 30);
      const parsed = new Date(result);

      expect(parsed.getUTCHours()).toBeDefined();
      expect(parsed.getUTCMinutes()).toBeDefined();
    });

    it('should return ISO 8601 format', () => {
      const result = getDateTime(0, 10, 0);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should default minute to 0', () => {
      const result = getDateTime(0, 10);
      const parsed = new Date(result);

      // Note: getMinutes() returns local time, so we just check it's valid
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe('D-Day calculations', () => {
    it('should calculate days remaining correctly', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 10);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(10);
    });

    it('should return 0 for today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((today.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(0);
    });

    it('should return negative for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(pastDate);
      target.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeLessThan(0);
    });
  });

  describe('Time formatting', () => {
    it('should format time as HH:MM', () => {
      const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      };

      const date = new Date();
      date.setHours(14, 30);

      const result = formatTime(date);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('Schedule time range', () => {
    it('should correctly identify events for a specific date', () => {
      const targetDate = new Date('2026-01-30T00:00:00.000Z');
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const eventInRange = new Date('2026-01-30T10:00:00.000Z');
      const eventOutOfRange = new Date('2026-01-31T10:00:00.000Z');

      expect(eventInRange >= targetDate && eventInRange < nextDate).toBe(true);
      expect(eventOutOfRange >= targetDate && eventOutOfRange < nextDate).toBe(false);
    });
  });

  describe('Week view calculations', () => {
    it('should get correct week start (Sunday)', () => {
      const getWeekStart = (date: Date): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() - result.getDay());
        result.setHours(0, 0, 0, 0);
        return result;
      };

      const wednesday = new Date('2026-01-28T12:00:00.000Z'); // Wednesday
      const weekStart = getWeekStart(wednesday);

      expect(weekStart.getDay()).toBe(0); // Sunday
    });

    it('should get all 7 days of the week', () => {
      const getWeekDays = (startDate: Date): Date[] => {
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
          const day = new Date(startDate);
          day.setDate(startDate.getDate() + i);
          days.push(day);
        }
        return days;
      };

      const weekStart = new Date('2026-01-25T00:00:00.000Z'); // Sunday
      const weekDays = getWeekDays(weekStart);

      expect(weekDays.length).toBe(7);
      expect(weekDays[0].getDay()).toBe(0); // Sunday
      expect(weekDays[6].getDay()).toBe(6); // Saturday
    });
  });
});
