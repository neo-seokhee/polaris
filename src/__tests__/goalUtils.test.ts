// Test utility functions for goal calculations
// These match the logic in GoalCard.tsx

type MonthStatus = 'complete' | 'partial' | 'failed' | 'pending';

// Utility functions extracted from GoalCard for testing
function getProgress(
  type: 'monthly' | 'percentage',
  monthlyStatus?: MonthStatus[],
  percentage?: number | null,
  targetValue?: number | null,
  targetUnit?: string | null,
  monthlyProgress?: number[]
): string {
  if (type === 'percentage') {
    if (targetValue && targetUnit && monthlyProgress) {
      const current = monthlyProgress.reduce((sum, v) => sum + v, 0);
      return `${current}/${targetValue}${targetUnit} (${percentage || 0}%)`;
    }
    return `${percentage || 0}%`;
  }
  if (monthlyStatus) {
    const completed = monthlyStatus.filter(s => s === 'complete').length;
    return `${completed}/12`;
  }
  return '0/12';
}

function isCompleted(
  type: 'monthly' | 'percentage',
  monthlyStatus?: MonthStatus[],
  percentage?: number | null
): boolean {
  if (type === 'percentage') {
    return percentage === 100;
  }
  if (monthlyStatus) {
    return monthlyStatus.every(s => s === 'complete');
  }
  return false;
}

describe('Goal Utility Functions', () => {
  describe('getProgress', () => {
    describe('monthly goals', () => {
      it('should return correct count for monthly goals', () => {
        const status: MonthStatus[] = ['complete', 'complete', 'partial', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'];
        const result = getProgress('monthly', status);
        expect(result).toBe('2/12');
      });

      it('should return 0/12 when all pending', () => {
        const status: MonthStatus[] = Array(12).fill('pending');
        const result = getProgress('monthly', status);
        expect(result).toBe('0/12');
      });

      it('should return 12/12 when all complete', () => {
        const status: MonthStatus[] = Array(12).fill('complete');
        const result = getProgress('monthly', status);
        expect(result).toBe('12/12');
      });

      it('should handle missing monthlyStatus', () => {
        const result = getProgress('monthly', undefined);
        expect(result).toBe('0/12');
      });
    });

    describe('percentage goals', () => {
      it('should return percentage for simple goals', () => {
        const result = getProgress('percentage', undefined, 45);
        expect(result).toBe('45%');
      });

      it('should return 0% when percentage is null', () => {
        const result = getProgress('percentage', undefined, null);
        expect(result).toBe('0%');
      });

      it('should return detailed progress with target', () => {
        const monthlyProgress = [2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
        const result = getProgress('percentage', undefined, 25, 24, '권', monthlyProgress);
        expect(result).toBe('6/24권 (25%)');
      });
    });
  });

  describe('isCompleted', () => {
    describe('monthly goals', () => {
      it('should return true when all months are complete', () => {
        const status: MonthStatus[] = Array(12).fill('complete');
        expect(isCompleted('monthly', status)).toBe(true);
      });

      it('should return false when any month is not complete', () => {
        const status: MonthStatus[] = ['complete', 'complete', 'partial', ...Array(9).fill('pending')];
        expect(isCompleted('monthly', status)).toBe(false);
      });

      it('should return false for empty monthlyStatus', () => {
        expect(isCompleted('monthly', undefined)).toBe(false);
      });
    });

    describe('percentage goals', () => {
      it('should return true when percentage is 100', () => {
        expect(isCompleted('percentage', undefined, 100)).toBe(true);
      });

      it('should return false when percentage is less than 100', () => {
        expect(isCompleted('percentage', undefined, 99)).toBe(false);
      });

      it('should return false when percentage is null', () => {
        expect(isCompleted('percentage', undefined, null)).toBe(false);
      });

      it('should return false when percentage is 0', () => {
        expect(isCompleted('percentage', undefined, 0)).toBe(false);
      });
    });
  });
});

describe('Goal Status Calculations', () => {
  it('should correctly calculate monthly goal completion percentage', () => {
    const status: MonthStatus[] = ['complete', 'complete', 'complete', 'partial', 'failed', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'];
    const completed = status.filter(s => s === 'complete').length;
    const completionRate = (completed / 12) * 100;

    expect(completionRate).toBe(25);
  });

  it('should correctly sum monthly progress', () => {
    const monthlyProgress = [5, 3, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0];
    const total = monthlyProgress.reduce((sum, v) => sum + v, 0);

    expect(total).toBe(14);
  });

  it('should correctly calculate percentage based on target', () => {
    const targetValue = 100;
    const currentValue = 25;
    const percentage = Math.round((currentValue / targetValue) * 100);

    expect(percentage).toBe(25);
  });
});
