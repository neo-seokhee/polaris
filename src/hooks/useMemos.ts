import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/contexts/EntitlementsContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { notifySlack } from '@/lib/slackNotify';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
import type { Database } from '@/lib/database.types';
import { DEMO_MEMOS } from '@/data/demoData';

type Memo = Database['public']['Tables']['memos']['Row'];
type MemoInsert = Database['public']['Tables']['memos']['Insert'];

const TABLE = 'memos';

export function useMemos() {
    const { user, isDemoMode } = useAuth();
    const { checkMemoLimit, showUpgradePrompt } = useEntitlements();
    const { isOnline, syncVersion } = useNetwork();
    const { track } = useAnalytics();
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

            if (isOnline) {
                const { data, error } = await supabase
                    .from(TABLE)
                    .select('*')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                setMemos(data || []);
                writeCache(user.id, TABLE, data || []);
            } else {
                const cached = await readCache<Memo[]>(user.id, TABLE);
                setMemos(cached || []);
            }
        } catch (err: any) {
            setError(err.message);
            const cached = await readCache<Memo[]>(user.id, TABLE);
            if (cached) setMemos(cached);
        } finally {
            setLoading(false);
        }
    };

    // Add memo
    const addMemo = async (content: string, category: string = '메모', categoryColor: string = '#FFD700') => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        // Plan limit check
        const check = checkMemoLimit(memos.length);
        if (!check.allowed) {
            showUpgradePrompt('메모 작성', check.message);
            return { error: null, limitReached: true };
        }

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (isOnline) {
            try {
                const newMemo: MemoInsert = {
                    user_id: user.id,
                    content,
                    category,
                    category_color: categoryColor,
                    is_starred: false,
                };

                const { data, error } = await supabase
                    .from(TABLE)
                    .insert(newMemo)
                    .select()
                    .single();

                if (error) throw error;
                setMemos((prev) => [data, ...prev]);
                track('memo_created', { category });
                notifySlack('memo_created', { userId: user.id }, `[${category}] ${content.substring(0, 50)}`);
                return { data, error: null };
            } catch (err: any) {
                setError(err.message);
                return { error: err.message };
            }
        } else {
            const optimistic = {
                id: tempId,
                user_id: user.id,
                content,
                category,
                category_color: categoryColor,
                is_starred: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as Memo;
            setMemos((prev) => [optimistic, ...prev]);
            await enqueue(user.id, {
                table: TABLE,
                type: 'insert',
                rowId: tempId,
                data: { user_id: user.id, content, category, category_color: categoryColor, is_starred: false },
            });
            track('memo_created', { category });
            return { data: optimistic, error: null };
        }
    };

    // Update memo
    const updateMemo = async (id: string, updates: { content?: string; category?: string; category_color?: string }) => {
        if (isDemoMode) return { demoBlocked: true };

        setMemos((prev) =>
            prev.map((memo) =>
                memo.id === id ? { ...memo, ...updates } : memo
            )
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update(updates)
                    .eq('id', id);

                if (error) throw error;
                track('memo_updated', {
                    has_content: Object.prototype.hasOwnProperty.call(updates, 'content'),
                    has_category: Object.prototype.hasOwnProperty.call(updates, 'category'),
                });
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: updates,
            });
            track('memo_updated');
        }
    };

    // Toggle starred
    const toggleStarred = async (id: string, isStarred: boolean) => {
        if (isDemoMode) return { demoBlocked: true };

        setMemos((prev) =>
            prev.map((memo) =>
                memo.id === id ? { ...memo, is_starred: !isStarred } : memo
            )
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update({ is_starred: !isStarred })
                    .eq('id', id);

                if (error) throw error;
                track('memo_starred', { is_starred: !isStarred });
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: { is_starred: !isStarred },
            });
            track('memo_starred', { is_starred: !isStarred });
        }
    };

    // Delete memo
    const deleteMemo = async (id: string) => {
        if (isDemoMode) return { demoBlocked: true };

        setMemos((prev) => prev.filter((memo) => memo.id !== id));

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                track('memo_deleted');
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'delete',
                rowId: id,
            });
            track('memo_deleted');
        }
    };

    // Reorder memos (local only)
    const reorderMemos = (reorderedMemos: Memo[]) => {
        setMemos(reorderedMemos);
        track('memos_reordered', { count: reorderedMemos.length });
    };

    // Subscribe to realtime changes — 온라인일 때만
    useEffect(() => {
        if (isDemoMode) {
            setMemos(DEMO_MEMOS as Memo[]);
            setLoading(false);
            return;
        }
        if (!user) return;

        fetchMemos();

        if (!isOnline) return;

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
    }, [user, isDemoMode, isOnline, syncVersion]);

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
