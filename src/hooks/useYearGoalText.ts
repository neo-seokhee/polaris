import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
import { DEMO_YEAR_GOAL_TEXT } from '@/data/demoData';

const TABLE = 'year_goal_texts';

export function useYearGoalText(year: number) {
    const { user, isDemoMode } = useAuth();
    const { isOnline, syncVersion } = useNetwork();
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    const cacheTable = `${TABLE}_${year}`;

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

            if (isOnline) {
                const { data, error } = await supabase
                    .from(TABLE)
                    .select('content')
                    .eq('user_id', user.id)
                    .eq('year', year)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                const text = data?.content || '';
                setContent(text);
                writeCache(user.id, cacheTable, text);
            } else {
                const cached = await readCache<string>(user.id, cacheTable);
                setContent(cached ?? '');
            }
        } catch (err) {
            const cached = await readCache<string>(user.id, cacheTable);
            setContent(cached ?? '');
        } finally {
            setIsLoading(false);
        }
    }, [user, isDemoMode, year, isOnline, cacheTable]);

    useEffect(() => {
        fetchYearGoalText();
    }, [fetchYearGoalText, syncVersion]);

    // 연도별 목표 텍스트 저장/업데이트
    const saveYearGoalText = async (newContent: string): Promise<{ success: boolean; error?: string; demoBlocked?: boolean }> => {
        if (isDemoMode) return { success: false, demoBlocked: true };
        if (!user) return { success: false, error: '먼저 로그인해주세요.' };

        // Optimistic update
        setContent(newContent);

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .upsert({
                        user_id: user.id,
                        year: year,
                        content: newContent,
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'user_id,year',
                    });

                if (error) throw error;
                writeCache(user.id, cacheTable, newContent);
                return { success: true };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        } else {
            writeCache(user.id, cacheTable, newContent);
            await enqueue(user.id, {
                table: TABLE,
                type: 'upsert',
                rowId: `${user.id}_${year}`,
                onConflict: 'user_id,year',
                data: {
                    user_id: user.id,
                    year: year,
                    content: newContent,
                    updated_at: new Date().toISOString(),
                },
            });
            return { success: true };
        }
    };

    return {
        content,
        isLoading,
        saveYearGoalText,
        refetch: fetchYearGoalText,
    };
}
