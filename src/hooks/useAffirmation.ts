import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/database.types';
import { DEMO_AFFIRMATIONS } from '@/data/demoData';

export type Affirmation = Database['public']['Tables']['affirmations']['Row'];

const DEFAULT_MESSAGE = '오늘 하루도 힘내세요';

export function useAffirmation() {
    const { user, isDemoMode } = useAuth();
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
            const { data, error } = await supabase
                .from('affirmations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAffirmations(data || []);
        } catch (err) {
            console.error('Error fetching affirmations:', err);
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
    }, [affirmations, selectedText]);

    const addAffirmation = async (text: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('affirmations')
                .insert({ user_id: user.id, text })
                .select()
                .single();

            if (error) throw error;

            setAffirmations(prev => [data, ...prev]);
            // 첫 확언 추가 시 바로 선택
            if (affirmations.length === 0) {
                setSelectedText(data.text);
                initialRandomDone.current = true;
            }
        } catch (err) {
            console.error('Error adding affirmation:', err);
        }
    };

    const updateAffirmation = async (id: string, text: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('affirmations')
                .update({ text })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setAffirmations(prev =>
                prev.map(a => a.id === id ? data : a)
            );

            // 현재 선택된 확언이 수정된 경우 업데이트
            const oldAffirmation = affirmations.find(a => a.id === id);
            if (oldAffirmation && oldAffirmation.text === selectedText) {
                setSelectedText(data.text);
            }
        } catch (err) {
            console.error('Error updating affirmation:', err);
        }
    };

    const deleteAffirmation = async (id: string) => {
        if (isDemoMode) return { demoBlocked: true };
        if (!user) return;

        try {
            const { error } = await supabase
                .from('affirmations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const deletedAffirmation = affirmations.find(a => a.id === id);
            const newAffirmations = affirmations.filter(a => a.id !== id);
            setAffirmations(newAffirmations);

            // 삭제된 확언이 현재 선택된 것이면 다른 것 선택
            if (deletedAffirmation && deletedAffirmation.text === selectedText) {
                if (newAffirmations.length > 0) {
                    setSelectedText(newAffirmations[0].text);
                } else {
                    setSelectedText(DEFAULT_MESSAGE);
                }
            }
        } catch (err) {
            console.error('Error deleting affirmation:', err);
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
    }, [user, isDemoMode]);

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
