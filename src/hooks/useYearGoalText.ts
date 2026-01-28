import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_YEAR_GOAL_TEXT } from '@/data/demoData';

export function useYearGoalText(year: number) {
    const { user, isDemoMode } = useAuth();
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // 연도별 목표 텍스트 불러오기
    const fetchYearGoalText = useCallback(async () => {
        if (isDemoMode) {
            setContent(DEMO_YEAR_GOAL_TEXT);
            setIsLoading(false);
            return;
        }
        if (!user) {
            setContent('');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('year_goal_texts')
                .select('content')
                .eq('user_id', user.id)
                .eq('year', year)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 = no rows returned (정상적인 경우)
                throw error;
            }

            setContent(data?.content || '');
        } catch (err) {
            setContent('');
        } finally {
            setIsLoading(false);
        }
    }, [user, isDemoMode, year]);

    useEffect(() => {
        fetchYearGoalText();
    }, [fetchYearGoalText]);

    // 연도별 목표 텍스트 저장/업데이트
    const saveYearGoalText = async (newContent: string): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '로그인이 필요합니다.' };

        try {
            const { error } = await supabase
                .from('year_goal_texts')
                .upsert({
                    user_id: user.id,
                    year: year,
                    content: newContent,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,year',
                });

            if (error) throw error;

            setContent(newContent);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    return {
        content,
        isLoading,
        saveYearGoalText,
        refetch: fetchYearGoalText,
    };
}
