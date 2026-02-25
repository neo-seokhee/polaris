import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
import { DEMO_TODO_CATEGORIES } from '@/data/demoData';

interface TodoCategory {
    id: string;
    user_id: string;
    name: string;
    position: number;
    created_at: string;
}

const TABLE = 'todo_categories';

export function useTodoCategories() {
    const { user, isDemoMode } = useAuth();
    const { isOnline, syncVersion } = useNetwork();
    const { track } = useAnalytics();
    const [categories, setCategories] = useState<TodoCategory[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch categories
    const fetchCategories = async () => {
        if (isDemoMode) {
            const demoWithPosition = DEMO_TODO_CATEGORIES.map((c, i) => ({ ...c, position: i + 1 }));
            setCategories(demoWithPosition as TodoCategory[]);
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
                    .order('position', { ascending: true });

                if (error) throw error;
                setCategories(data || []);
                writeCache(user.id, TABLE, data || []);
            } else {
                const cached = await readCache<TodoCategory[]>(user.id, TABLE);
                setCategories(cached || []);
            }
        } catch (err: any) {
            console.error('Error fetching todo categories:', err.message);
            const cached = await readCache<TodoCategory[]>(user.id, TABLE);
            if (cached) setCategories(cached);
        } finally {
            setLoading(false);
        }
    };

    // Add category
    const addCategory = async (name: string) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        if (categories.some(c => c.name === name)) {
            return { error: '이미 존재하는 카테고리입니다.' };
        }

        const maxPosition = categories.reduce((max, c) => Math.max(max, c.position || 0), 0);
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (isOnline) {
            try {
                const { data, error } = await supabase
                    .from(TABLE)
                    .insert({ user_id: user.id, name, position: maxPosition + 1 })
                    .select()
                    .single();

                if (error) throw error;
                setCategories(prev => [...prev, data]);
                track('todo_category_created');
                return { data, error: null };
            } catch (err: any) {
                return { error: err.message };
            }
        } else {
            const optimistic: TodoCategory = {
                id: tempId,
                user_id: user.id,
                name,
                position: maxPosition + 1,
                created_at: new Date().toISOString(),
            };
            setCategories(prev => [...prev, optimistic]);
            await enqueue(user.id, {
                table: TABLE,
                type: 'insert',
                rowId: tempId,
                data: { user_id: user.id, name, position: maxPosition + 1 },
            });
            track('todo_category_created');
            return { data: optimistic, error: null };
        }
    };

    // Delete category - also updates todos with this category to null
    const deleteCategory = async (categoryName: string) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        const categoryToDelete = categories.find(c => c.name === categoryName);

        // Optimistic
        setCategories(prev => prev.filter(c => c.name !== categoryName));

        if (isOnline) {
            try {
                const { error: updateError } = await supabase
                    .from('todos')
                    .update({ category: null })
                    .eq('user_id', user.id)
                    .eq('category', categoryName);

                if (updateError) throw updateError;

                const { error: deleteError } = await supabase
                    .from(TABLE)
                    .delete()
                    .eq('user_id', user.id)
                    .eq('name', categoryName);

                if (deleteError) throw deleteError;
                track('todo_category_deleted');
                return { error: null, deletedCategory: categoryName };
            } catch (err: any) {
                return { error: err.message };
            }
        } else {
            // 오프라인: todos 테이블의 category null 업데이트도 큐에 추가
            // Note: 오프라인에서는 해당 카테고리의 모든 todo를 개별 큐잉할 수 없으므로
            // 카테고리 삭제만 큐에 추가하고, 동기화 시 서버에서 처리
            if (categoryToDelete) {
                await enqueue(user.id, {
                    table: TABLE,
                    type: 'delete',
                    rowId: categoryToDelete.id,
                    filters: { user_id: user.id },
                });
            }
            track('todo_category_deleted');
            return { error: null, deletedCategory: categoryName };
        }
    };

    // Reorder category
    const reorderCategory = async (categoryName: string, direction: 'up' | 'down') => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        const currentIndex = categories.findIndex(c => c.name === categoryName);
        if (currentIndex === -1) return { error: 'Category not found' };

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= categories.length) {
            return { error: null };
        }

        const currentCategory = categories[currentIndex];
        const targetCategory = categories[targetIndex];
        const currentPosition = currentCategory.position;
        const targetPosition = targetCategory.position;

        // Optimistic swap
        setCategories(prev => {
            const newCategories = [...prev];
            newCategories[currentIndex] = { ...currentCategory, position: targetPosition };
            newCategories[targetIndex] = { ...targetCategory, position: currentPosition };
            return newCategories.sort((a, b) => a.position - b.position);
        });

        if (isOnline) {
            try {
                const { error: error1 } = await supabase
                    .from(TABLE)
                    .update({ position: targetPosition })
                    .eq('id', currentCategory.id);
                if (error1) throw error1;

                const { error: error2 } = await supabase
                    .from(TABLE)
                    .update({ position: currentPosition })
                    .eq('id', targetCategory.id);
                if (error2) throw error2;

                track('todo_categories_reordered', { direction });
                return { error: null };
            } catch (err: any) {
                return { error: err.message };
            }
        } else {
            await enqueue(user.id, {
                table: TABLE,
                type: 'update',
                rowId: currentCategory.id,
                data: { position: targetPosition },
            });
            await enqueue(user.id, {
                table: TABLE,
                type: 'update',
                rowId: targetCategory.id,
                data: { position: currentPosition },
            });
            track('todo_categories_reordered', { direction });
            return { error: null };
        }
    };

    useEffect(() => {
        if (isDemoMode) {
            const demoWithPosition = DEMO_TODO_CATEGORIES.map((c, i) => ({ ...c, position: i + 1 }));
            setCategories(demoWithPosition as TodoCategory[]);
            setLoading(false);
            return;
        }
        if (!user) return;

        fetchCategories();

        if (!isOnline) return;

        const channel = supabase
            .channel('public:todo_categories')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todo_categories',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newCategory = payload.new as TodoCategory;
                        setCategories(prev => {
                            if (prev.some(c => c.id === newCategory.id)) {
                                return prev;
                            }
                            return [...prev, newCategory].sort((a, b) => a.position - b.position);
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setCategories(prev =>
                            prev.map(c => c.id === payload.new.id ? payload.new as TodoCategory : c)
                                .sort((a, b) => a.position - b.position)
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setCategories(prev => prev.filter(c => c.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isDemoMode, isOnline, syncVersion]);

    return {
        categories,
        loading,
        addCategory,
        deleteCategory,
        reorderCategory,
        refetch: fetchCategories,
    };
}
