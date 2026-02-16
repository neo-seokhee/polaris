import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAnalytics } from '@/contexts/AnalyticsContext';

const CATEGORIES_KEY = 'memo_categories';

export interface Category {
    id: string;
    label: string;
    color: string;
}

const DEFAULT_CATEGORIES: Category[] = [
    { id: '1', label: '메모', color: '#FFD700' },
    { id: '2', label: '아이디어', color: '#3B82F6' },
    { id: '3', label: '회의', color: '#22C55E' },
    { id: '4', label: '독서', color: '#A855F7' },
    { id: '5', label: '일정', color: '#F97316' },
];

export function useCategories() {
    const { track } = useAnalytics();
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [loading, setLoading] = useState(true);

    // Load categories from AsyncStorage
    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const stored = await AsyncStorage.getItem(CATEGORIES_KEY);
            if (stored) {
                setCategories(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveCategories = async (newCategories: Category[]) => {
        try {
            await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCategories));
            setCategories(newCategories);
        } catch (error) {
            console.error('Failed to save categories:', error);
        }
    };

    const addCategory = async (label: string, color: string) => {
        const newCategory: Category = {
            id: Date.now().toString(),
            label,
            color,
        };
        const newCategories = [...categories, newCategory];
        await saveCategories(newCategories);
        track('memo_category_created');
        return newCategory;
    };

    const updateCategory = async (id: string, label: string, color: string) => {
        const newCategories = categories.map(cat =>
            cat.id === id ? { ...cat, label, color } : cat
        );
        await saveCategories(newCategories);
        track('memo_category_updated');
    };

    const deleteCategory = async (id: string) => {
        const newCategories = categories.filter(cat => cat.id !== id);
        await saveCategories(newCategories);
        track('memo_category_deleted');
    };

    const reorderCategories = async (newCategories: Category[]) => {
        await saveCategories(newCategories);
        track('memo_categories_reordered', { count: newCategories.length });
    };

    return {
        categories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
    };
}
