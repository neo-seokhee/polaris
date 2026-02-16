import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { DEMO_TODO_CATEGORIES } from '@/data/demoData';

interface TodoCategory {
    id: string;
    user_id: string;
    name: string;
    position: number;
    created_at: string;
}

export function useTodoCategories() {
    const { user, isDemoMode } = useAuth();
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
            const { data, error } = await supabase
                .from('todo_categories')
                .select('*')
                .eq('user_id', user.id)
                .order('position', { ascending: true });

            if (error) throw error;
            setCategories(data || []);
        } catch (err: any) {
            console.error('Error fetching todo categories:', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Add category
    const addCategory = async (name: string) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        // Check for duplicate name
        if (categories.some(c => c.name === name)) {
            return { error: '이미 존재하는 카테고리입니다.' };
        }

        try {
            // Get max position
            const maxPosition = categories.reduce((max, c) => Math.max(max, c.position || 0), 0);

            const { data, error } = await supabase
                .from('todo_categories')
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
    };

    // Delete category - also updates todos with this category to null
    const deleteCategory = async (categoryName: string) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        try {
            // First, update all todos with this category to null
            const { error: updateError } = await supabase
                .from('todos')
                .update({ category: null })
                .eq('user_id', user.id)
                .eq('category', categoryName);

            if (updateError) throw updateError;

            // Then delete the category
            const { error: deleteError } = await supabase
                .from('todo_categories')
                .delete()
                .eq('user_id', user.id)
                .eq('name', categoryName);

            if (deleteError) throw deleteError;

            setCategories(prev => prev.filter(c => c.name !== categoryName));
            track('todo_category_deleted');
            return { error: null, deletedCategory: categoryName };
        } catch (err: any) {
            return { error: err.message };
        }
    };

    // Reorder category (move up or down)
    const reorderCategory = async (categoryName: string, direction: 'up' | 'down') => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        const currentIndex = categories.findIndex(c => c.name === categoryName);
        if (currentIndex === -1) return { error: 'Category not found' };

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        // Check bounds
        if (targetIndex < 0 || targetIndex >= categories.length) {
            return { error: null }; // Already at boundary, no-op
        }

        const currentCategory = categories[currentIndex];
        const targetCategory = categories[targetIndex];

        try {
            // Swap positions
            const currentPosition = currentCategory.position;
            const targetPosition = targetCategory.position;

            // Update current category position
            const { error: error1 } = await supabase
                .from('todo_categories')
                .update({ position: targetPosition })
                .eq('id', currentCategory.id);

            if (error1) throw error1;

            // Update target category position
            const { error: error2 } = await supabase
                .from('todo_categories')
                .update({ position: currentPosition })
                .eq('id', targetCategory.id);

            if (error2) throw error2;

            // Optimistic update - swap in local state
            setCategories(prev => {
                const newCategories = [...prev];
                newCategories[currentIndex] = { ...currentCategory, position: targetPosition };
                newCategories[targetIndex] = { ...targetCategory, position: currentPosition };
                return newCategories.sort((a, b) => a.position - b.position);
            });
            track('todo_categories_reordered', { direction });

            return { error: null };
        } catch (err: any) {
            return { error: err.message };
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
    }, [user, isDemoMode]);

    return {
        categories,
        loading,
        addCategory,
        deleteCategory,
        reorderCategory,
        refetch: fetchCategories,
    };
}
