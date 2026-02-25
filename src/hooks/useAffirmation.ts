import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { writeCache, readCache } from '@/lib/offlineCache';
import { enqueue } from '@/lib/syncQueue';
import type { Database } from '@/lib/database.types';
import { DEMO_AFFIRMATIONS } from '@/data/demoData';

export type Affirmation = Database['public']['Tables']['affirmations']['Row'];

const DEFAULT_MESSAGE = '오늘 하루도 힘내세요';
const TABLE = 'affirmations';

export function useAffirmation() {
    const { user, isDemoMode } = useAuth();
    const { isOnline, syncVersion } = useNetwork();
    const { track } = useAnalytics();
    const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
    const [selectedText, setSelectedText] = useState<string>(DEFAULT_MESSAGE);
    const [loading, setLoading] = useState(true);
    const initialRandomDone = useRef(false);

    const fetchAffirmations = async () => {
        if (isDemoMode) {
            setAffirmations(DEMO_AFFIRMATIONS as Affirmation[]);
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
                setAffirmations(data || []);
                writeCache(user.id, TABLE, data || []);
            } else {
                const cached = await readCache<Affirmation[]>(user.id, TABLE);
                setAffirmations(cached || []);
            }
        } catch (err) {
            console.error('Error fetching affirmations:', err);
            const cached = await readCache<Affirmation[]>(user.id, TABLE);
            if (cached) setAffirmations(cached);
        } finally {
            setLoading(false);
        }
    };

    // 세션 시작 시 랜덤 선택 (한 번만)
    useEffect(() => {
        if (affirmations.length > 0 && !initialRandomDone.current) {
            const randomIndex = Math.floor(Math.random() * affirmations.length);
            setSelectedText(affirmations[randomIndex].text);
            initialRandomDone.current = true;
        } else if (affirmations.length === 0) {
            setSelectedText(DEFAULT_MESSAGE);
        }
    }, [affirmations]);

    // 수동 새로고침 (다른 랜덤 확언 선택)
    const shuffleAffirmation = useCallback(() => {
        if (affirmations.length <= 1) return;

        const currentIndex = affirmations.findIndex(a => a.text === selectedText);
        let newIndex: number;
        do {
            newIndex = Math.floor(Math.random() * affirmations.length);
        } while (newIndex === currentIndex && affirmations.length > 1);

        setSelectedText(affirmations[newIndex].text);
        track('affirmation_shuffled');
    }, [affirmations, selectedText]);

    const addAffirmation = async (text: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (isOnline) {
            try {
                const { data, error } = await supabase
                    .from(TABLE)
                    .insert({ user_id: user.id, text })
                    .select()
                    .single();

                if (error) throw error;

                setAffirmations(prev => [data, ...prev]);
                if (affirmations.length === 0) {
                    setSelectedText(data.text);
                    initialRandomDone.current = true;
                }
                track('affirmation_created');
            } catch (err) {
                console.error('Error adding affirmation:', err);
            }
        } else {
            const optimistic = {
                id: tempId,
                user_id: user.id,
                text,
                created_at: new Date().toISOString(),
            } as Affirmation;
            setAffirmations(prev => [optimistic, ...prev]);
            if (affirmations.length === 0) {
                setSelectedText(text);
                initialRandomDone.current = true;
            }
            await enqueue(user.id, {
                table: TABLE,
                type: 'insert',
                rowId: tempId,
                data: { user_id: user.id, text },
            });
            track('affirmation_created');
        }
    };

    const updateAffirmation = async (id: string, text: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;

        const oldAffirmation = affirmations.find(a => a.id === id);

        // Optimistic update
        setAffirmations(prev => prev.map(a => a.id === id ? { ...a, text } : a));
        if (oldAffirmation && oldAffirmation.text === selectedText) {
            setSelectedText(text);
        }

        if (isOnline) {
            try {
                const { data, error } = await supabase
                    .from(TABLE)
                    .update({ text })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                setAffirmations(prev => prev.map(a => a.id === id ? data : a));
                if (oldAffirmation && oldAffirmation.text === selectedText) {
                    setSelectedText(data.text);
                }
                track('affirmation_updated');
            } catch (err) {
                console.error('Error updating affirmation:', err);
            }
        } else {
            await enqueue(user.id, {
                table: TABLE,
                type: 'update',
                rowId: id,
                data: { text },
            });
            track('affirmation_updated');
        }
    };

    const deleteAffirmation = async (id: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;

        const deletedAffirmation = affirmations.find(a => a.id === id);
        const newAffirmations = affirmations.filter(a => a.id !== id);
        setAffirmations(newAffirmations);

        if (deletedAffirmation && deletedAffirmation.text === selectedText) {
            if (newAffirmations.length > 0) {
                setSelectedText(newAffirmations[0].text);
            } else {
                setSelectedText(DEFAULT_MESSAGE);
            }
        }

        if (isOnline) {
            try {
                const { error } = await supabase
                    .from(TABLE)
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                track('affirmation_deleted');
            } catch (err) {
                console.error('Error deleting affirmation:', err);
            }
        } else {
            await enqueue(user.id, {
                table: TABLE,
                type: 'delete',
                rowId: id,
            });
            track('affirmation_deleted');
        }
    };

    useEffect(() => {
        if (isDemoMode) {
            setAffirmations(DEMO_AFFIRMATIONS as Affirmation[]);
            setLoading(false);
            return;
        }
        if (user) {
            fetchAffirmations();
        }
    }, [user, isDemoMode, syncVersion]);

    return {
        text: selectedText,
        affirmations,
        hasCustomAffirmation: affirmations.length > 0,
        loading,
        isDemoMode,
        addAffirmation,
        updateAffirmation,
        deleteAffirmation,
        shuffleAffirmation,
        refetch: fetchAffirmations,
    };
}
