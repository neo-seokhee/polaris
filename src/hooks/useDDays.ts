import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
import type { Database } from '@/lib/database.types';
import { DEMO_DDAYS } from '@/data/demoData';

type DDay = Database['public']['Tables']['ddays']['Row'];
type DDayInsert = Database['public']['Tables']['ddays']['Insert'];

const MAX_DDAYS = 3;
const TABLE = 'ddays';

export function useDDays() {
    const { user, isDemoMode } = useAuth();
    const { isOnline, syncVersion } = useNetwork();
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

            if (isOnline) {
                const { data, error } = await supabase
                    .from(TABLE)
                    .select('*')
                    .eq('user_id', user.id)
                    .order('target_date', { ascending: true })
                    .limit(MAX_DDAYS);

                if (error) throw error;
                setDDays(data || []);
                writeCache(user.id, TABLE, data || []);
            } else {
                const cached = await readCache<DDay[]>(user.id, TABLE);
                setDDays(cached || []);
            }
        } catch (err) {
            console.error('Error fetching ddays:', err);
            // fetch 실패 시 캐시 fallback
            const cached = await readCache<DDay[]>(user.id, TABLE);
            if (cached) setDDays(cached);
        } finally {
            setLoading(false);
        }
    };

    const addDDay = async (title: string, targetDate: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;
        if (ddays.length >= MAX_DDAYS) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const newDDay: DDayInsert & { id: string; created_at: string; updated_at: string } = {
            id: tempId,
            user_id: user.id,
            title,
            target_date: targetDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (isOnline) {
            try {
                const { data, error } = await supabase
                    .from(TABLE)
                    .insert({ user_id: user.id, title, target_date: targetDate })
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
        } else {
            // 오프라인: optimistic update + 큐
            setDDays((prev) => [...prev, newDDay as unknown as DDay].sort((a, b) =>
                new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
            ));
            await enqueue(user.id, {
                table: TABLE,
                type: 'insert',
                rowId: tempId,
                data: { user_id: user.id, title, target_date: targetDate },
            });
            track('dday_created');
        }
    };

    const updateDDay = async (id: string, title: string, targetDate: string) => {
        if (isDemoMode) return { demoBlocked: true };

        // Optimistic update
        setDDays((prev) =>
            prev.map((d) => (d.id === id ? { ...d, title, target_date: targetDate } : d))
                .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
        );

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .update({ title, target_date: targetDate })
                    .eq('id', id);

                if (error) throw error;
                track('dday_updated');
            } catch (err) {
                console.error('Error updating dday:', err);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: { title, target_date: targetDate },
            });
            track('dday_updated');
        }
    };

    const deleteDDay = async (id: string) => {
        if (isDemoMode) return { demoBlocked: true };

        // Optimistic update
        setDDays((prev) => prev.filter((d) => d.id !== id));

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                track('dday_deleted');
            } catch (err) {
                console.error('Error deleting dday:', err);
            }
        } else {
            await enqueue(user!.id, {
                table: TABLE,
                type: 'delete',
                rowId: id,
            });
            track('dday_deleted');
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
    }, [user, isDemoMode, syncVersion]);

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
