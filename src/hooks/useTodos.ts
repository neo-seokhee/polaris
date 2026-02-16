import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { notifySlack } from '@/lib/slackNotify';
import type { Database } from '@/lib/database.types';
import { DEMO_TODOS } from '@/data/demoData';

type Todo = Database['public']['Tables']['todos']['Row'];
type TodoInsert = Database['public']['Tables']['todos']['Insert'];
type TodoUpdate = Database['public']['Tables']['todos']['Update'];

export function useTodos() {
    const { user, isDemoMode } = useAuth();
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
            const { data, error } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTodos(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isDemoMode, user]);

    // Add todo
    const addTodo = async (title: string, memo?: string | null) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        try {
            const newTodo: TodoInsert = {
                user_id: user.id,
                title,
                memo: memo || null,
                is_active: false,
                is_completed: false,
            };

            const { data, error } = await supabase
                .from('todos')
                .insert(newTodo)
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            setTodos((prev) => [data, ...prev]);
            track('todo_created', { title_length: title.length });
            notifySlack('todo_created', { userId: user.id }, title);
            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    // Toggle completed
    const toggleCompleted = async (id: string, isCompleted: boolean) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const currentTodo = todos.find((todo) => todo.id === id);
            const nextCompleted = !isCompleted;
            const { error } = await supabase
                .from('todos')
                .update({ is_completed: nextCompleted })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setTodos((prev) =>
                prev.map((todo) =>
                    todo.id === id ? { ...todo, is_completed: nextCompleted } : todo
                )
            );
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
    };

    // Toggle active (flame icon)
    const toggleActive = async (id: string, isActive: boolean) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const currentTodo = todos.find((todo) => todo.id === id);
            const nextActive = !isActive;
            const { error } = await supabase
                .from('todos')
                .update({ is_active: nextActive })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setTodos((prev) =>
                prev.map((todo) =>
                    todo.id === id ? { ...todo, is_active: nextActive } : todo
                )
            );
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
    };

    // Set active explicitly (used when we must guarantee important=true)
    const setActive = async (id: string, active: boolean) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const currentTodo = todos.find((todo) => todo.id === id);
            const { error } = await supabase
                .from('todos')
                .update({ is_active: active })
                .eq('id', id);

            if (error) throw error;

            setTodos((prev) =>
                prev.map((todo) =>
                    todo.id === id ? { ...todo, is_active: active } : todo
                )
            );
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
    };

    // Update todo
    const updateTodo = async (id: string, title: string, memo?: string | null) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const updateData: TodoUpdate = { title };
            if (memo !== undefined) {
                updateData.memo = memo;
            }

            const { error } = await supabase
                .from('todos')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setTodos((prev) =>
                prev.map((todo) =>
                    todo.id === id
                        ? { ...todo, title, ...(memo !== undefined ? { memo } : {}) }
                        : todo
                )
            );
            track('todo_updated', { has_memo: memo !== undefined });
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Update todo category
    const updateTodoCategory = async (id: string, category: string | null) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const { error } = await supabase
                .from('todos')
                .update({ category })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setTodos((prev) =>
                prev.map((todo) =>
                    todo.id === id ? { ...todo, category } : todo
                )
            );
            track('todo_category_updated', { has_category: !!category });
        } catch (err: any) {
            setError(err.message);
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
        try {
            const { error } = await supabase
                .from('todos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setTodos((prev) => prev.filter((todo) => todo.id !== id));
            track('todo_deleted');
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Reorder todos (로컬에서만 정렬, DB에 position 컬럼 추가 후 활성화 필요)
    const reorderTodos = async (reorderedItems: Todo[]) => {
        // 로컬에서만 순서 변경 (DB 저장 없음)
        const reorderedIds = new Set(reorderedItems.map(t => t.id));
        const otherItems = todos.filter(t => !reorderedIds.has(t.id));
        setTodos([...reorderedItems, ...otherItems]);
        track('todos_reordered', { count: reorderedItems.length });
    };

    // Subscribe to realtime changes
    useEffect(() => {
        if (isDemoMode) {
            setTodos(DEMO_TODOS as Todo[]);
            setLoading(false);
            return;
        }
        if (!user) return;

        fetchTodos();

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
                            // 이미 존재하는 todo인지 확인 (optimistic update로 이미 추가된 경우)
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
                        // Note: If position changed remotely, we might want to re-sort locally or fetchTodos.
                        // For now, we update the item in place. If position changed, list might look out of sync until refersh.
                        // But useTodos uses state. Ideally we should re-sort `todos` here if we want perfect sync.
                        // However, keeping it simple to avoid UI jumps during editing.
                    } else if (payload.eventType === 'DELETE') {
                        setTodos((prev) => prev.filter((todo) => todo.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isDemoMode, fetchTodos]);

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
