import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { notifySlack } from '@/lib/slackNotify';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
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

const CACHE_SCHEDULES = 'schedules';
const CACHE_SYNCED_EVENTS = 'synced_events_schedule';
const CACHE_SUBSCRIPTIONS = 'calendar_subscriptions_schedule';

export function useSchedules() {
    const { user, isDemoMode } = useAuth();
    const { isOnline, syncVersion } = useNetwork();
    const { track } = useAnalytics();
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

            if (isOnline) {
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
                writeCache(user.id, CACHE_SCHEDULES, schedulesRes.data || []);
                writeCache(user.id, CACHE_SUBSCRIPTIONS, subscriptionsRes.data || []);

                const enabledSubscriptionIds = (subscriptionsRes.data || []).map((s) => s.id);

                if (enabledSubscriptionIds.length > 0) {
                    const { data: events, error: eventsError } = await supabase
                        .from('synced_events')
                        .select('*')
                        .in('subscription_id', enabledSubscriptionIds)
                        .order('start_time', { ascending: true });

                    if (eventsError) throw eventsError;
                    setSyncedEvents(events || []);
                    writeCache(user.id, CACHE_SYNCED_EVENTS, events || []);
                } else {
                    setSyncedEvents([]);
                }
            } else {
                const [cachedSchedules, cachedEvents, cachedSubs] = await Promise.all([
                    readCache<Schedule[]>(user.id, CACHE_SCHEDULES),
                    readCache<SyncedEvent[]>(user.id, CACHE_SYNCED_EVENTS),
                    readCache<CalendarSubscription[]>(user.id, CACHE_SUBSCRIPTIONS),
                ]);
                setSchedules(cachedSchedules || []);
                setSyncedEvents(cachedEvents || []);
                setSubscriptions(cachedSubs || []);
            }
        } catch (err: any) {
            setError(err.message);
            // fallback to cache
            const [cachedSchedules, cachedEvents, cachedSubs] = await Promise.all([
                readCache<Schedule[]>(user.id, CACHE_SCHEDULES),
                readCache<SyncedEvent[]>(user.id, CACHE_SYNCED_EVENTS),
                readCache<CalendarSubscription[]>(user.id, CACHE_SUBSCRIPTIONS),
            ]);
            if (cachedSchedules) setSchedules(cachedSchedules);
            if (cachedEvents) setSyncedEvents(cachedEvents);
            if (cachedSubs) setSubscriptions(cachedSubs);
        } finally {
            setLoading(false);
        }
    }, [user, isDemoMode, isOnline]);

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

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (isOnline) {
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
                track('schedule_created');
                notifySlack('schedule_created', { userId: user.id }, title);
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
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                location: location || null,
                color: color || '#FFD700',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as Schedule;
            setSchedules((prev) => [...prev, optimistic].sort(
                (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            ));
            await enqueue(user.id, {
                table: 'schedules',
                type: 'insert',
                rowId: tempId,
                data: {
                    user_id: user.id,
                    title,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    location: location || null,
                    color: color || '#FFD700',
                },
            });
            track('schedule_created');
            return { data: optimistic, error: null };
        }
    };

    const updateSchedule = async (id: string, updates: Partial<Omit<Schedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
        if (isDemoMode) return { error: null, demoBlocked: true };

        // Optimistic
        setSchedules((prev) =>
            prev.map((schedule) => (schedule.id === id ? { ...schedule, ...updates } : schedule))
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        );

        if (isOnline) {
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
                track('schedule_updated');
                return { data, error: null };
            } catch (err: any) {
                setError(err.message);
                return { error: err.message };
            }
        } else {
            await enqueue(user!.id, {
                table: 'schedules',
                type: 'update',
                rowId: id,
                data: updates as unknown as Record<string, unknown>,
            });
            track('schedule_updated');
            return { error: null };
        }
    };

    const deleteSchedule = async (id: string) => {
        if (isDemoMode) return { error: null, demoBlocked: true };

        setSchedules((prev) => prev.filter((schedule) => schedule.id !== id));

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                track('schedule_deleted');
                return { error: null };
            } catch (err: any) {
                setError(err.message);
                return { error: err.message };
            }
        } else {
            await enqueue(user!.id, {
                table: 'schedules',
                type: 'delete',
                rowId: id,
            });
            track('schedule_deleted');
            return { error: null };
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
    }, [user, isDemoMode, fetchAll, syncVersion]);

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
