import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/database.types';
import { DEMO_MEMOS } from '@/data/demoData';

type Memo = Database['public']['Tables']['memos']['Row'];
type MemoInsert = Database['public']['Tables']['memos']['Insert'];

export function useMemos() {
    const { user, isDemoMode } = useAuth();
    const [memos, setMemos] = useState<Memo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch memos
    const fetchMemos = async () => {
        if (isDemoMode) {
            setMemos(DEMO_MEMOS as Memo[]);
            setLoading(false);
            return;
        }
        if (!user) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('memos')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setMemos(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Add memo
    const addMemo = async (content: string, category: string = '메모', categoryColor: string = '#FFD700') => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        try {
            const newMemo: MemoInsert = {
                user_id: user.id,
                content,
                category,
                category_color: categoryColor,
                is_starred: false,
            };

            const { data, error } = await supabase
                .from('memos')
                .insert(newMemo)
                .select()
                .single();

            if (error) throw error;

            setMemos((prev) => [data, ...prev]);
            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    // Update memo
    const updateMemo = async (id: string, updates: { content?: string; category?: string; category_color?: string }) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const { error } = await supabase
                .from('memos')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setMemos((prev) =>
                prev.map((memo) =>
                    memo.id === id ? { ...memo, ...updates } : memo
                )
            );
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Toggle starred
    const toggleStarred = async (id: string, isStarred: boolean) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const { error } = await supabase
                .from('memos')
                .update({ is_starred: !isStarred })
                .eq('id', id);

            if (error) throw error;

            setMemos((prev) =>
                prev.map((memo) =>
                    memo.id === id ? { ...memo, is_starred: !isStarred } : memo
                )
            );
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Delete memo
    const deleteMemo = async (id: string) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const { error } = await supabase
                .from('memos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setMemos((prev) => prev.filter((memo) => memo.id !== id));
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Reorder memos (local only)
    const reorderMemos = (reorderedMemos: Memo[]) => {
        setMemos(reorderedMemos);
    };

    // Subscribe to realtime changes
    useEffect(() => {
        if (isDemoMode) {
            setMemos(DEMO_MEMOS as Memo[]);
            setLoading(false);
            return;
        }
        if (!user) return;

        fetchMemos();

        const channel = supabase
            .channel('public:memos')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'memos',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMemo = payload.new as Memo;
                        setMemos((prev) => {
                            if (prev.some(memo => memo.id === newMemo.id)) {
                                return prev;
                            }
                            return [newMemo, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setMemos((prev) =>
                            prev.map((memo) =>
                                memo.id === payload.new.id ? (payload.new as Memo) : memo
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setMemos((prev) => prev.filter((memo) => memo.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isDemoMode]);

    return {
        memos,
        loading,
        error,
        isDemoMode,
        addMemo,
        updateMemo,
        toggleStarred,
        deleteMemo,
        reorderMemos,
        refetch: fetchMemos,
    };
}
