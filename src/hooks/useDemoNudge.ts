import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useDemoNudge() {
    const { isDemoMode } = useAuth();
    const [nudgeVisible, setNudgeVisible] = useState(false);
    const [actionName, setActionName] = useState<string>('이 기능을 사용');

    const showNudge = useCallback((action?: string) => {
        if (action) {
            setActionName(action);
        }
        setNudgeVisible(true);
    }, []);

    const hideNudge = useCallback(() => {
        setNudgeVisible(false);
    }, []);

    // Check if action should be blocked and show nudge if needed
    const checkDemoAndNudge = useCallback((action?: string): boolean => {
        if (isDemoMode) {
            showNudge(action);
            return true; // Action blocked
        }
        return false; // Action allowed
    }, [isDemoMode, showNudge]);

    return {
        isDemoMode,
        nudgeVisible,
        actionName,
        showNudge,
        hideNudge,
        checkDemoAndNudge,
    };
}
