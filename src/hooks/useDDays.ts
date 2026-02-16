import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import type { Database } from '@/lib/database.types';
import { DEMO_DDAYS } from '@/data/demoData';

type DDay = Database['public']['Tables']['ddays']['Row'];
type DDayInsert = Database['public']['Tables']['ddays']['Insert'];

const MAX_DDAYS = 3;

export function useDDays() {
    const { user, isDemoMode } = useAuth();
    const { track } = useAnalytics();
    const [ddays, setDDays] = useState<DDay[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDDays = async () => {
        if (isDemoMode) {
            setDDays(DEMO_DDAYS as DDay[]);
            setLoading(false);
            return;
        }
        if (!user) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('ddays')
                .select('*')
                .eq('user_id', user.id)
                .order('target_date', { ascending: true })
                .limit(MAX_DDAYS);

            if (error) throw error;
            setDDays(data || []);
        } catch (err) {
            console.error('Error fetching ddays:', err);
        } finally {
            setLoading(false);
        }
    };

    const addDDay = async (title: string, targetDate: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;
        if (ddays.length >= MAX_DDAYS) return;

        try {
            const newDDay: DDayInsert = {
                user_id: user.id,
                title,
                target_date: targetDate,
            };

            const { data, error } = await supabase
                .from('ddays')
                .insert(newDDay)
                .select()
                .single();

            if (error) throw error;
            setDDays((prev) => [...prev, data].sort((a, b) =>
                new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
            ));
            track('dday_created');
        } catch (err) {
            console.error('Error adding dday:', err);
        }
    };

    const updateDDay = async (id: string, title: string, targetDate: string) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const { error } = await supabase
                .from('ddays')
                .update({ title, target_date: targetDate })
                .eq('id', id);

            if (error) throw error;
            setDDays((prev) =>
                prev.map((d) => (d.id === id ? { ...d, title, target_date: targetDate } : d))
                    .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
            );
            track('dday_updated');
        } catch (err) {
            console.error('Error updating dday:', err);
        }
    };

    const deleteDDay = async (id: string) => {
        if (isDemoMode) return { demoBlocked: true };
        try {
            const { error } = await supabase
                .from('ddays')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setDDays((prev) => prev.filter((d) => d.id !== id));
            track('dday_deleted');
        } catch (err) {
            console.error('Error deleting dday:', err);
        }
    };

    const calculateDDay = (targetDate: string): number => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    useEffect(() => {
        if (isDemoMode) {
            setDDays(DEMO_DDAYS as DDay[]);
            setLoading(false);
            return;
        }
        if (user) {
            fetchDDays();
        }
    }, [user, isDemoMode]);

    return {
        ddays,
        loading,
        isDemoMode,
        canAddMore: ddays.length < MAX_DDAYS,
        addDDay,
        updateDDay,
        deleteDDay,
        calculateDDay,
        refetch: fetchDDays,
    };
}
