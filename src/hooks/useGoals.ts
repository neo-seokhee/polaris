import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { notifySlack } from '@/lib/slackNotify';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
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

const TABLE = 'goals';

export function useGoals() {
    const { user, isDemoMode } = useAuth();
    const { isOnline, syncVersion } = useNetwork();
    const { track } = useAnalytics();
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

    const cacheTable = `${TABLE}_${selectedYear}`;

    // 목표 목록 불러오기
    const fetchGoals = useCallback(async (year: number) => {
        if (isDemoMode) {
            const demoGoalsForYear = DEMO_GOALS.filter(g => g.year === year);
            setGoals((demoGoalsForYear as GoalRow[]).map(transformGoal));
            setIsLoading(false);
            return;
        }
        if (!user) return;

        const ct = `${TABLE}_${year}`;

        try {
            setIsLoading(true);

            if (isOnline) {
                const { data, error } = await supabase
                    .from(TABLE)
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('year', year)
                    .order('position', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const sortedData = (data || []).sort((a, b) => {
                    if (a.position === null && b.position === null) return 0;
                    if (a.position === null) return 1;
                    if (b.position === null) return -1;
                    return a.position - b.position;
                });

                setGoals(sortedData.map(transformGoal));
                writeCache(user.id, ct, sortedData);
            } else {
                const cached = await readCache<GoalRow[]>(user.id, ct);
                setGoals((cached || []).map(transformGoal));
            }
        } catch (err) {
            const cached = await readCache<GoalRow[]>(user.id, ct);
            if (cached) setGoals(cached.map(transformGoal));
        } finally {
            setIsLoading(false);
        }
    }, [user, isDemoMode, isOnline]);

    // 연도 변경 시 목표 다시 불러오기
    useEffect(() => {
        if (isDemoMode) {
            const demoGoalsForYear = DEMO_GOALS.filter(g => g.year === selectedYear);
            setGoals((demoGoalsForYear as GoalRow[]).map(transformGoal));
            setIsLoading(false);
            return;
        }
        if (user) {
            fetchGoals(selectedYear);
        } else {
            setGoals([]);
            setIsLoading(false);
        }
    }, [user, isDemoMode, selectedYear, fetchGoals, syncVersion]);

    // 목표 추가
    const addGoal = async (params: AddGoalParams): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '먼저 로그인해주세요.' };

        const newGoalData: GoalInsert = {
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

        if (isOnline) {
            try {
                const { data, error } = await supabase
                    .from(TABLE)
                    .insert(newGoalData)
                    .select()
                    .single();

                if (error) throw error;

                if (data && params.year === selectedYear) {
                    setGoals(prev => [transformGoal(data), ...prev]);
                }

                track('goal_created', { type: params.type, year: params.year });
                notifySlack('goal_created', { userId: user.id }, params.title);
                return { success: true };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        } else {
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const optimistic: GoalRow = {
                ...newGoalData,
                id: tempId,
                position: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as unknown as GoalRow;

            if (params.year === selectedYear) {
                setGoals(prev => [transformGoal(optimistic), ...prev]);
            }
            await enqueue(user.id, {
                table: TABLE,
                type: 'insert',
                rowId: tempId,
                data: newGoalData as unknown as Record<string, unknown>,
            });
            track('goal_created', { type: params.type, year: params.year });
            return { success: true };
        }
    };

    // 목표 수정
    const updateGoal = async (params: UpdateGoalParams): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '먼저 로그인해주세요.' };

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

        // Optimistic update (로컬에서 먼저 반영)
        setGoals(prev => prev.map(g => {
            if (g.id !== params.id) return g;
            return {
                ...g,
                ...(params.title !== undefined && { title: params.title }),
                ...(params.description !== undefined && { description: params.description }),
                ...(params.type !== undefined && { type: params.type }),
                ...(params.percentage !== undefined && { percentage: params.percentage }),
                ...(params.monthlyStatus !== undefined && { monthlyStatus: params.monthlyStatus }),
                ...(params.targetValue !== undefined && { targetValue: params.targetValue }),
                ...(params.targetUnit !== undefined && { targetUnit: params.targetUnit }),
                ...(params.monthlyProgress !== undefined && { monthlyProgress: params.monthlyProgress }),
            };
        }));

        if (isOnline) {
            try {
                const { data, error } = await supabase
                    .from(TABLE)
                    .update(updates)
                    .eq('id', params.id)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    setGoals(prev => prev.map(g => g.id === params.id ? transformGoal(data) : g));
                }

                track('goal_updated', {
                    has_title: params.title !== undefined,
                    has_description: params.description !== undefined,
                    has_type: params.type !== undefined,
                    has_percentage: params.percentage !== undefined,
                    has_monthly_status: params.monthlyStatus !== undefined,
                    has_target: params.targetValue !== undefined || params.targetUnit !== undefined,
                    has_monthly_progress: params.monthlyProgress !== undefined,
                });
                return { success: true };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        } else {
            await enqueue(user.id, {
                table: TABLE,
                type: 'update',
                rowId: params.id,
                data: updates as unknown as Record<string, unknown>,
                filters: { user_id: user.id },
            });
            track('goal_updated');
            return { success: true };
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
        const result = await updateGoal({ id: goalId, percentage: Math.min(100, Math.max(0, percentage)) });
        if (result.success) {
            track('goal_progress_updated', { percentage: Math.min(100, Math.max(0, percentage)) });
        }
        return result;
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

        const total = newMonthlyProgress.reduce((sum, v) => sum + v, 0);
        const newPercentage = goal.targetValue ? Math.min(100, Math.round((total / goal.targetValue) * 100)) : 0;

        return updateGoal({ id: goalId, monthlyProgress: newMonthlyProgress, percentage: newPercentage });
    };

    // 목표 삭제
    const deleteGoal = async (goalId: string): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '먼저 로그인해주세요.' };

        // Optimistic
        setGoals(prev => prev.filter(g => g.id !== goalId));

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .delete()
                    .eq('id', goalId)
                    .eq('user_id', user.id);

                if (error) throw error;
                track('goal_deleted');
                return { success: true };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        } else {
            await enqueue(user.id, {
                table: TABLE,
                type: 'delete',
                rowId: goalId,
                filters: { user_id: user.id },
            });
            track('goal_deleted');
            return { success: true };
        }
    };

    // 목표 순서 변경
    const reorderGoals = async (fromIndex: number, toIndex: number) => {
        if (isDemoMode || !user) return;

        const newGoals = [...goals];
        const [movedItem] = newGoals.splice(fromIndex, 1);
        newGoals.splice(toIndex, 0, movedItem);
        setGoals(newGoals);

        if (isOnline) {
            try {
                const updates = newGoals.map((goal, index) =>
                    supabase
                        .from(TABLE)
                        .update({ position: index })
                        .eq('id', goal.id)
                        .eq('user_id', user.id)
                );
                await Promise.all(updates);
                track('goals_reordered', { count: newGoals.length });
            } catch (err) {
                console.error('[Goals] Failed to save order:', err);
                fetchGoals(selectedYear);
            }
        } else {
            // 오프라인: 각 목표의 position update를 큐에 추가
            for (let i = 0; i < newGoals.length; i++) {
                await enqueue(user.id, {
                    table: TABLE,
                    type: 'update',
                    rowId: newGoals[i].id,
                    data: { position: i },
                    filters: { user_id: user.id },
                });
            }
            track('goals_reordered', { count: newGoals.length });
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
        reorderGoals,
        refetch: () => fetchGoals(selectedYear),
    };
}
