import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { fetchAndParseICS } from '@/lib/icalParser';
import { writeCache, readCache } from '@/lib/offlineCache';
import type { Database } from '@/lib/database.types';

type CalendarSubscription = Database['public']['Tables']['calendar_subscriptions']['Row'];
type CalendarSubscriptionInsert = Database['public']['Tables']['calendar_subscriptions']['Insert'];
type SyncedEvent = Database['public']['Tables']['synced_events']['Row'];
type SyncedEventInsert = Database['public']['Tables']['synced_events']['Insert'];

const CACHE_TABLE = 'calendar_subscriptions';

export function useCalendarSubscriptions() {
    const { user } = useAuth();
    const { isOnline, syncVersion } = useNetwork();
    const { track } = useAnalytics();
    const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscriptions = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);

            if (isOnline) {
                const { data, error } = await supabase
                    .from('calendar_subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setSubscriptions(data || []);
                writeCache(user.id, CACHE_TABLE, data || []);
            } else {
                const cached = await readCache<CalendarSubscription[]>(user.id, CACHE_TABLE);
                setSubscriptions(cached || []);
            }
        } catch (err: any) {
            setError(err.message);
            const cached = await readCache<CalendarSubscription[]>(user.id, CACHE_TABLE);
            if (cached) setSubscriptions(cached);
        } finally {
            setLoading(false);
        }
    }, [user, isOnline]);

    const addSubscription = async (name: string, url: string, color: string = '#3B82F6') => {
        if (!user) return { error: 'User not authenticated' };
        if (!isOnline) {
            Alert.alert('오프라인', '캘린더 구독 추가는 인터넷이 필요해요.');
            return { error: '오프라인 상태에서는 사용할 수 없습니다.' };
        }

        try {
            const newSubscription: CalendarSubscriptionInsert = {
                user_id: user.id,
                name,
                url,
                color,
                is_enabled: true,
            };

            const { data, error } = await supabase
                .from('calendar_subscriptions')
                .insert(newSubscription)
                .select()
                .single();

            if (error) throw error;

            setSubscriptions((prev) => [...prev, data]);
            track('calendar_subscription_added');

            await syncSubscription(data.id);

            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    const removeSubscription = async (id: string) => {
        if (!isOnline) {
            Alert.alert('오프라인', '캘린더 구독 삭제는 인터넷이 필요해요.');
            return { error: '오프라인 상태에서는 사용할 수 없습니다.' };
        }

        try {
            const { error } = await supabase
                .from('calendar_subscriptions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
            track('calendar_subscription_removed');
            return { error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    const updateSubscription = async (id: string, updates: { name?: string; color?: string; is_enabled?: boolean }) => {
        if (!isOnline) {
            Alert.alert('오프라인', '캘린더 설정 변경은 인터넷이 필요해요.');
            return { error: '오프라인 상태에서는 사용할 수 없습니다.' };
        }

        try {
            const { data, error } = await supabase
                .from('calendar_subscriptions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setSubscriptions((prev) =>
                prev.map((sub) => (sub.id === id ? data : sub))
            );
            track('calendar_subscription_updated', {
                has_name: Object.prototype.hasOwnProperty.call(updates, 'name'),
                has_color: Object.prototype.hasOwnProperty.call(updates, 'color'),
                has_enabled: Object.prototype.hasOwnProperty.call(updates, 'is_enabled'),
            });

            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { error: err.message };
        }
    };

    const syncSubscription = async (subscriptionId: string) => {
        if (!isOnline) {
            Alert.alert('오프라인', 'ICS 피드 동기화는 인터넷이 필요해요.');
            return { error: '오프라인 상태에서는 사용할 수 없습니다.' };
        }

        const subscription = subscriptions.find((s) => s.id === subscriptionId) ||
            (await supabase.from('calendar_subscriptions').select('*').eq('id', subscriptionId).single()).data;

        if (!subscription) {
            console.error('[Sync] Subscription not found:', subscriptionId);
            return { error: 'Subscription not found' };
        }

        try {
            setSyncing(true);
            console.log('[Sync] Starting sync for:', subscription.name, subscription.url);

            let events;
            try {
                events = await fetchAndParseICS(subscription.url);
                console.log('[Sync] Parsed events count:', events.length);
            } catch (fetchError: any) {
                console.error('[Sync] Fetch failed:', fetchError.message);
                const { count } = await supabase
                    .from('synced_events')
                    .select('*', { count: 'exact', head: true })
                    .eq('subscription_id', subscriptionId);

                if (count && count > 0) {
                    return {
                        error: `동기화 실패 (캐시된 ${count}개 일정 사용 중): ${fetchError.message}`,
                        eventsCount: count,
                        cached: true,
                    };
                }
                throw fetchError;
            }

            const seenUids = new Set<string>();
            const uniqueEvents = events.filter((event) => {
                if (seenUids.has(event.uid)) return false;
                seenUids.add(event.uid);
                return true;
            });

            const syncedEvents: SyncedEventInsert[] = uniqueEvents.map((event) => ({
                subscription_id: subscriptionId,
                uid: event.uid,
                title: event.title,
                start_time: event.startTime.toISOString(),
                end_time: event.endTime.toISOString(),
                location: event.location,
                description: event.description,
            }));

            if (syncedEvents.length > 0) {
                const { error: deleteError } = await supabase
                    .from('synced_events')
                    .delete()
                    .eq('subscription_id', subscriptionId);

                if (deleteError) {
                    console.error('[Sync] Delete error:', deleteError);
                }

                const { error: insertError } = await supabase
                    .from('synced_events')
                    .insert(syncedEvents);

                if (insertError) {
                    console.error('[Sync] Insert error:', insertError);
                    throw insertError;
                }
            } else {
                await supabase
                    .from('synced_events')
                    .delete()
                    .eq('subscription_id', subscriptionId);
            }

            await supabase
                .from('calendar_subscriptions')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('id', subscriptionId);

            setSubscriptions((prev) =>
                prev.map((sub) =>
                    sub.id === subscriptionId
                        ? { ...sub, last_synced_at: new Date().toISOString() }
                        : sub
                )
            );

            track('calendar_subscription_synced', { events_count: events.length });
            return { error: null, eventsCount: events.length };
        } catch (err: any) {
            console.error('[Sync] Error:', err);
            setError(err.message);
            track('calendar_subscription_sync_failed');
            return { error: err.message };
        } finally {
            setSyncing(false);
        }
    };

    const syncAllSubscriptions = async () => {
        if (!isOnline) {
            Alert.alert('오프라인', '동기화는 인터넷이 필요해요.');
            return [];
        }

        const enabledSubscriptions = subscriptions.filter((s) => s.is_enabled);
        const results = [];

        for (const subscription of enabledSubscriptions) {
            const result = await syncSubscription(subscription.id);
            results.push({ id: subscription.id, ...result });
        }

        return results;
    };

    useEffect(() => {
        if (!user) return;
        fetchSubscriptions();
    }, [user, fetchSubscriptions, syncVersion]);

    return {
        subscriptions,
        loading,
        syncing,
        error,
        addSubscription,
        removeSubscription,
        updateSubscription,
        syncSubscription,
        syncAllSubscriptions,
        refetch: fetchSubscriptions,
    };
}
