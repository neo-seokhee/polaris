import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/database.types';
import { DEMO_GOALS } from '@/data/demoData';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];

export type MonthStatus = 'complete' | 'partial' | 'failed' | 'pending';

export interface Goal {
    id: string;
    title: string;
    description: string | null;
    type: 'monthly' | 'percentage';
    year: number;
    percentage: number | null;
    monthlyStatus: MonthStatus[];
    targetValue: number | null;
    targetUnit: string | null;
    monthlyProgress: number[];
    createdAt: Date;
}

interface AddGoalParams {
    title: string;
    description?: string;
    type: 'monthly' | 'percentage';
    year: number;
    targetValue?: number;
    targetUnit?: string;
}

interface UpdateGoalParams {
    id: string;
    title?: string;
    description?: string;
    type?: 'monthly' | 'percentage';
    percentage?: number;
    monthlyStatus?: MonthStatus[];
    targetValue?: number;
    targetUnit?: string;
    monthlyProgress?: number[];
}

export function useGoals() {
    const { user, isDemoMode } = useAuth();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // DB 데이터를 Goal 타입으로 변환
    const transformGoal = (row: GoalRow): Goal => {
        const monthlyStatus = row.monthly_status as MonthStatus[] | null;
        const monthlyProgress = row.monthly_progress as number[] | null;
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            type: row.type as 'monthly' | 'percentage',
            year: row.year,
            percentage: row.percentage,
            monthlyStatus: monthlyStatus || Array(12).fill('pending'),
            targetValue: row.target_value,
            targetUnit: row.target_unit,
            monthlyProgress: monthlyProgress || Array(12).fill(0),
            createdAt: new Date(row.created_at),
        };
    };

    // 목표 목록 불러오기
    const fetchGoals = useCallback(async (year: number) => {
        if (isDemoMode) {
            const demoGoalsForYear = DEMO_GOALS.filter(g => g.year === year);
            setGoals(demoGoalsForYear.map(transformGoal));
            setIsLoading(false);
            return;
        }
        if (!user) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('goals')
                .select('*')
                .eq('user_id', user.id)
                .eq('year', year)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setGoals((data || []).map(transformGoal));
        } catch (err) {
            // Error loading goals
        } finally {
            setIsLoading(false);
        }
    }, [user, isDemoMode]);

    // 연도 변경 시 목표 다시 불러오기
    useEffect(() => {
        if (isDemoMode) {
            const demoGoalsForYear = DEMO_GOALS.filter(g => g.year === selectedYear);
            setGoals(demoGoalsForYear.map(transformGoal));
            setIsLoading(false);
            return;
        }
        if (user) {
            fetchGoals(selectedYear);
        } else {
            setGoals([]);
            setIsLoading(false);
        }
    }, [user, isDemoMode, selectedYear, fetchGoals]);

    // 목표 추가
    const addGoal = async (params: AddGoalParams): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '로그인이 필요합니다.' };

        try {
            const newGoal: GoalInsert = {
                user_id: user.id,
                title: params.title,
                description: params.description || null,
                type: params.type,
                year: params.year,
                percentage: params.type === 'percentage' ? 0 : null,
                monthly_status: params.type === 'monthly' ? Array(12).fill('pending') : null,
                target_value: params.type === 'percentage' ? (params.targetValue || null) : null,
                target_unit: params.type === 'percentage' ? (params.targetUnit || null) : null,
                monthly_progress: params.type === 'percentage' ? Array(12).fill(0) : null,
            };

            const { data, error } = await supabase
                .from('goals')
                .insert(newGoal)
                .select()
                .single();

            if (error) throw error;

            if (data && params.year === selectedYear) {
                setGoals(prev => [transformGoal(data), ...prev]);
            }

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    // 목표 수정
    const updateGoal = async (params: UpdateGoalParams): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '로그인이 필요합니다.' };

        try {
            const updates: GoalUpdate = {};
            if (params.title !== undefined) updates.title = params.title;
            if (params.description !== undefined) updates.description = params.description;
            if (params.type !== undefined) updates.type = params.type;
            if (params.percentage !== undefined) updates.percentage = params.percentage;
            if (params.monthlyStatus !== undefined) updates.monthly_status = params.monthlyStatus;
            if (params.targetValue !== undefined) updates.target_value = params.targetValue;
            if (params.targetUnit !== undefined) updates.target_unit = params.targetUnit;
            if (params.monthlyProgress !== undefined) updates.monthly_progress = params.monthlyProgress;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('goals')
                .update(updates)
                .eq('id', params.id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setGoals(prev => prev.map(g => g.id === params.id ? transformGoal(data) : g));
            }

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    // 월별 상태 업데이트 (단일 월)
    const updateMonthStatus = async (
        goalId: string,
        monthIndex: number,
        status: MonthStatus
    ): Promise<{ success: boolean; error?: string }> => {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return { success: false, error: '목표를 찾을 수 없습니다.' };

        const newMonthlyStatus = [...goal.monthlyStatus];
        newMonthlyStatus[monthIndex] = status;

        return updateGoal({ id: goalId, monthlyStatus: newMonthlyStatus });
    };

    // 달성률 업데이트
    const updatePercentage = async (
        goalId: string,
        percentage: number
    ): Promise<{ success: boolean; error?: string }> => {
        return updateGoal({ id: goalId, percentage: Math.min(100, Math.max(0, percentage)) });
    };

    // 월별 진행 상황 업데이트 (단일 월)
    const updateMonthlyProgress = async (
        goalId: string,
        monthIndex: number,
        value: number
    ): Promise<{ success: boolean; error?: string }> => {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return { success: false, error: '목표를 찾을 수 없습니다.' };

        const newMonthlyProgress = [...goal.monthlyProgress];
        newMonthlyProgress[monthIndex] = Math.max(0, value);

        // 달성률 자동 계산
        const total = newMonthlyProgress.reduce((sum, v) => sum + v, 0);
        const newPercentage = goal.targetValue ? Math.min(100, Math.round((total / goal.targetValue) * 100)) : 0;

        return updateGoal({ id: goalId, monthlyProgress: newMonthlyProgress, percentage: newPercentage });
    };

    // 목표 삭제
    const deleteGoal = async (goalId: string): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '로그인이 필요합니다.' };

        try {
            const { error } = await supabase
                .from('goals')
                .delete()
                .eq('id', goalId)
                .eq('user_id', user.id);

            if (error) throw error;

            setGoals(prev => prev.filter(g => g.id !== goalId));

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    return {
        goals,
        isLoading,
        isDemoMode,
        selectedYear,
        setSelectedYear,
        addGoal,
        updateGoal,
        updateMonthStatus,
        updatePercentage,
        updateMonthlyProgress,
        deleteGoal,
        refetch: () => fetchGoals(selectedYear),
    };
}
