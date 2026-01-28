import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/database.types';
import { DEMO_SCHEDULES } from '@/data/demoData';

type Schedule = Database['public']['Tables']['schedules']['Row'];
type ScheduleInsert = Database['public']['Tables']['schedules']['Insert'];
type SyncedEvent = Database['public']['Tables']['synced_events']['Row'];
type CalendarSubscription = Database['public']['Tables']['calendar_subscriptions']['Row'];

export interface UnifiedEvent {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    location: string | null;
    color: string;
    source: 'local' | 'synced';
    subscriptionId?: string;
    subscriptionName?: string;
}

export function useSchedules() {
    const { user, isDemoMode } = useAuth();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [syncedEvents, setSyncedEvents] = useState<SyncedEvent[]>([]);
    const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        if (isDemoMode) {
            setSchedules(DEMO_SCHEDULES as Schedule[]);
            setSyncedEvents([]);
            setSubscriptions([]);
            setLoading(false);
            return;
        }
        if (!user) return;

        try {
            setLoading(true);

            const [schedulesRes, subscriptionsRes] = await Promise.all([
                supabase
                    .from('schedules')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('start_time', { ascending: true }),
                supabase
                    .from('calendar_subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_enabled', true),
            ]);

            if (schedulesRes.error) throw schedulesRes.error;
            if (subscriptionsRes.error) throw subscriptionsRes.error;

            setSchedules(schedulesRes.data || []);
            setSubscriptions(subscriptionsRes.data || []);

            const enabledSubscriptionIds = (subscriptionsRes.data || []).map((s) => s.id);

            if (enabledSubscriptionIds.length > 0) {
                const { data: events, error: eventsError } = await supabase
                    .from('synced_events')
                    .select('*')
                    .in('subscription_id', enabledSubscriptionIds)
                    .order('start_time', { ascending: true });

                if (eventsError) throw eventsError;
                setSyncedEvents(events || []);
            } else {
                setSyncedEvents([]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, isDemoMode]);

    const getEventsForDate = useCallback((date: Date): UnifiedEvent[] => {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const localEvents: UnifiedEvent[] = schedules
            .filter((schedule) => {
                const startTime = new Date(schedule.start_time);
                return startTime >= targetDate && startTime < nextDate;
            })
            .map((schedule) => ({
                id: schedule.id,
                title: schedule.title,
                startTime: new Date(schedule.start_time),
                endTime: new Date(schedule.end_time),
                location: schedule.location,
                color: schedule.color,
                source: 'local' as const,
            }));

        const syncedEventsForDate: UnifiedEvent[] = syncedEvents
            .filter((event) => {
                const startTime = new Date(event.start_time);
                return startTime >= targetDate && startTime < nextDate;
            })
            .map((event) => {
                const subscription = subscriptions.find((s) => s.id === event.subscription_id);
                return {
                    id: event.id,
                    title: event.title,
                    startTime: new Date(event.start_time),
                    endTime: new Date(event.end_time),
                    location: event.location,
                    color: subscription?.color || '#3B82F6',
                    source: 'synced' as const,
                    subscriptionId: event.subscription_id,
                    subscriptionName: subscription?.name,
                };
            });

        const allEvents = [...localEvents, ...syncedEventsForDate];
        allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        return allEvents;
    }, [schedules, syncedEvents, subscriptions]);

    const getEventsForDateRange = useCallback((startDate: Date, endDate: Date): UnifiedEvent[] => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const localEvents: UnifiedEvent[] = schedules
            .filter((schedule) => {
                const startTime = new Date(schedule.start_time);
                return startTime >= start && startTime <= end;
            })
            .map((schedule) => ({
                id: schedule.id,
                title: schedule.title,
                startTime: new Date(schedule.start_time),
                endTime: new Date(schedule.end_time),
                location: schedule.location,
                color: schedule.color,
                source: 'local' as const,
            }));

        const syncedEventsForRange: UnifiedEvent[] = syncedEvents
            .filter((event) => {
                const startTime = new Date(event.start_time);
                return startTime >= start && startTime <= end;
            })
            .map((event) => {
                const subscription = subscriptions.find((s) => s.id === event.subscription_id);
                return {
                    id: event.id,
                    title: event.title,
                    startTime: new Date(event.start_time),
                    endTime: new Date(event.end_time),
                    location: event.location,
                    color: subscription?.color || '#3B82F6',
                    source: 'synced' as const,
                    subscriptionId: event.subscription_id,
                    subscriptionName: subscription?.name,
                };
            });

        const allEvents = [...localEvents, ...syncedEventsForRange];
        allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        return allEvents;
    }, [schedules, syncedEvents, subscriptions]);

    const addSchedule = async (title: string, startTime: Date, endTime: Date, location?: string, color?: string) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        if (!user) return { error: 'User not authenticated' };

        try {
            const newSchedule: ScheduleInsert = {
                user_id: user.id,
                title,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                location: location || null,
                color: color || '#FFD700',
            };

            const { data, error } = await supabase
                .from('schedules')
                .insert(newSchedule)
                .select()
                .single();

            if (error) throw error;

            setSchedules((prev) => [...prev, data].sort(
                (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            ));

            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    const updateSchedule = async (id: string, updates: Partial<Omit<Schedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        try {
            const { data, error } = await supabase
                .from('schedules')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setSchedules((prev) =>
                prev.map((schedule) => (schedule.id === id ? data : schedule))
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            );

            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    const deleteSchedule = async (id: string) => {
        if (isDemoMode) return { error: null, demoBlocked: true };
        try {
            const { error } = await supabase
                .from('schedules')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSchedules((prev) => prev.filter((schedule) => schedule.id !== id));
            return { error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    useEffect(() => {
        if (isDemoMode) {
            setSchedules(DEMO_SCHEDULES as Schedule[]);
            setSyncedEvents([]);
            setSubscriptions([]);
            setLoading(false);
            return;
        }
        if (!user) return;
        fetchAll();
    }, [user, isDemoMode, fetchAll]);

    return {
        schedules,
        syncedEvents,
        loading,
        error,
        isDemoMode,
        getEventsForDate,
        getEventsForDateRange,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        refetch: fetchAll,
    };
}
