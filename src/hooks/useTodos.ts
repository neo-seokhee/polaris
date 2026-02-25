import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/contexts/EntitlementsContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { notifySlack } from '@/lib/slackNotify';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
import type { Database } from '@/lib/database.types';
import { DEMO_TODOS } from '@/data/demoData';

type Todo = Database['public']['Tables']['todos']['Row'];
type TodoInsert = Database['public']['Tables']['todos']['Insert'];
type TodoUpdate = Database['public']['Tables']['todos']['Update'];

const TABLE = 'todos';

export function useTodos() {
    const { user, isDemoMode } = useAuth();
    const { checkTodoLimit, showUpgradePrompt } = useEntitlements();
    const { isOnline, syncVersion } = useNetwork();
    const { track } = useAnalytics();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch todos
    const fetchTodos = useCallback(async () => {
        if (isDemoMode) {
            setTodos(DEMO_TODOS as Todo[]);
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
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTodos(data || []);
                writeCache(user.id, TABLE, data || []);
            } else {
                const cached = await readCache<Todo[]>(user.id, TABLE);
                setTodos(cached || []);
            }
        } catch (err: any) {
            setError(err.message);
            const cached = await readCache<Todo[]>(user.id, TABLE);
            if (cached) setTodos(cached);
        } finally {
            setLoading(false);
        }
    }, [isDemoMode, user, isOnline]);

    // Add todo
    const addTodo = async (title: string, memo?: string | null) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        // Plan limit check (active/incomplete todos only)
        const activeCount = todos.filter(t => !t.is_completed).length;
        const check = checkTodoLimit(activeCount);
        if (!check.allowed) {
            showUpgradePrompt('할일 추가', check.message);
            return { error: null, limitReached: true };
        }

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (isOnline) {
            try {
                const newTodo: TodoInsert = {
                    user_id: user.id,
                    title,
                    memo: memo || null,
                    is_active: false,
                    is_completed: false,
                };

                const { data, error } = await supabase
                    .from(TABLE)
                    .insert(newTodo)
                    .select()
                    .single();

                if (error) throw error;
                setTodos((prev) => [data, ...prev]);
                track('todo_created', { title_length: title.length });
                notifySlack('todo_created', { userId: user.id }, title);
                return { data, error: null };
            } catch (err: any) {
                setError(err.message);
                return { error: err.message };
            }
        } else {
            const optimistic = {
                id: tempId,
                user_id: user.id,
                title,
                memo: memo || null,
                is_active: false,
                is_completed: false,
                category: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as Todo;
            setTodos((prev) => [optimistic, ...prev]);
            await enqueue(user.id, {
                table: TABLE,
                type: 'insert',
                rowId: tempId,
                data: { user_id: user.id, title, memo: memo || null, is_active: false, is_completed: false },
            });
            track('todo_created', { title_length: title.length });
            return { data: optimistic, error: null };
        }
    };

    // Toggle completed
    const toggleCompleted = async (id: string, isCompleted: boolean) => {
        if (isDemoMode) return { demoBlocked: true };
        const currentTodo = todos.find((todo) => todo.id === id);
        const nextCompleted = !isCompleted;

        // Optimistic update
        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id ? { ...todo, is_completed: nextCompleted } : todo
            )
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update({ is_completed: nextCompleted })
                    .eq('id', id);

                if (error) throw error;
                track(isCompleted ? 'todo_uncompleted' : 'todo_completed');
                if (user?.id) {
                    notifySlack(
                        'todo_status_changed',
                        { userId: user.id },
                        `${currentTodo?.title || '할 일'} · ${nextCompleted ? '완료' : '미완료'}`
                    );
                }
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: { is_completed: nextCompleted },
            });
            track(isCompleted ? 'todo_uncompleted' : 'todo_completed');
        }
    };

    // Toggle active (flame icon)
    const toggleActive = async (id: string, isActive: boolean) => {
        if (isDemoMode) return { demoBlocked: true };
        const currentTodo = todos.find((todo) => todo.id === id);
        const nextActive = !isActive;

        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id ? { ...todo, is_active: nextActive } : todo
            )
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update({ is_active: nextActive })
                    .eq('id', id);

                if (error) throw error;
                track('todo_active_toggled', { is_active: nextActive });
                if (user?.id) {
                    notifySlack(
                        'todo_priority_changed',
                        { userId: user.id },
                        `${currentTodo?.title || '할 일'} · ${nextActive ? '중요 ON' : '중요 OFF'}`
                    );
                }
                return { error: null };
            } catch (err: any) {
                setError(err.message);
                return { error: err.message };
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: { is_active: nextActive },
            });
            track('todo_active_toggled', { is_active: nextActive });
            return { error: null };
        }
    };

    // Set active explicitly
    const setActive = async (id: string, active: boolean) => {
        if (isDemoMode) return { demoBlocked: true };
        const currentTodo = todos.find((todo) => todo.id === id);

        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id ? { ...todo, is_active: active } : todo
            )
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update({ is_active: active })
                    .eq('id', id);

                if (error) throw error;
                track('todo_active_set', { is_active: active });
                if (user?.id) {
                    notifySlack(
                        'todo_priority_changed',
                        { userId: user.id },
                        `${currentTodo?.title || '할 일'} · ${active ? '중요 ON' : '중요 OFF'}`
                    );
                }
                return { error: null };
            } catch (err: any) {
                setError(err.message);
                return { error: err.message };
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: { is_active: active },
            });
            track('todo_active_set', { is_active: active });
            return { error: null };
        }
    };

    // Update todo
    const updateTodo = async (id: string, title: string, memo?: string | null) => {
        if (isDemoMode) return { demoBlocked: true };
        const updateData: TodoUpdate = { title };
        if (memo !== undefined) {
            updateData.memo = memo;
        }

        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id
                    ? { ...todo, title, ...(memo !== undefined ? { memo } : {}) }
                    : todo
            )
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update(updateData)
                    .eq('id', id);

                if (error) throw error;
                track('todo_updated', { has_memo: memo !== undefined });
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: updateData as unknown as Record<string, unknown>,
            });
            track('todo_updated', { has_memo: memo !== undefined });
        }
    };

    // Update todo category
    const updateTodoCategory = async (id: string, category: string | null) => {
        if (isDemoMode) return { demoBlocked: true };

        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id ? { ...todo, category } : todo
            )
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update({ category })
                    .eq('id', id);

                if (error) throw error;
                track('todo_category_updated', { has_category: !!category });
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: { category },
            });
            track('todo_category_updated', { has_category: !!category });
        }
    };

    // Clear category from all todos (when category is deleted)
    const clearCategoryFromTodos = (categoryName: string) => {
        setTodos((prev) =>
            prev.map((todo) =>
                todo.category === categoryName ? { ...todo, category: null } : todo
            )
        );
    };

    // Delete todo
    const deleteTodo = async (id: string) => {
        if (isDemoMode) return { demoBlocked: true };

        setTodos((prev) => prev.filter((todo) => todo.id !== id));

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                track('todo_deleted');
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'delete',
                rowId: id,
            });
            track('todo_deleted');
        }
    };

    // Reorder todos (로컬에서만 정렬)
    const reorderTodos = async (reorderedItems: Todo[]) => {
        const reorderedIds = new Set(reorderedItems.map(t => t.id));
        const otherItems = todos.filter(t => !reorderedIds.has(t.id));
        setTodos([...reorderedItems, ...otherItems]);
        track('todos_reordered', { count: reorderedItems.length });
    };

    // Subscribe to realtime changes — 온라인일 때만
    useEffect(() => {
        if (isDemoMode) {
            setTodos(DEMO_TODOS as Todo[]);
            setLoading(false);
            return;
        }
        if (!user) return;

        fetchTodos();

        if (!isOnline) return;

        const channel = supabase
            .channel('public:todos')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todos',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newTodo = payload.new as Todo;
                        setTodos((prev) => {
                            if (prev.some(todo => todo.id === newTodo.id)) {
                                return prev;
                            }
                            return [newTodo, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setTodos((prev) =>
                            prev.map((todo) =>
                                todo.id === payload.new.id ? (payload.new as Todo) : todo
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setTodos((prev) => prev.filter((todo) => todo.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isDemoMode, isOnline, fetchTodos, syncVersion]);

    return {
        todos,
        loading,
        error,
        isDemoMode,
        addTodo,
        updateTodo,
        updateTodoCategory,
        clearCategoryFromTodos,
        toggleCompleted,
        toggleActive,
        setActive,
        deleteTodo,
        reorderTodos,
        refetch: fetchTodos,
    };
}
