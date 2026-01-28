import React, { createContext, useContext, useState, useCallback } from 'react';
import { SignupNudgeModal } from '@/components/SignupNudgeModal';
import { useAuth } from './AuthContext';

interface DemoNudgeContextType {
    showNudge: (actionName?: string) => void;
    checkDemoAndNudge: (actionName?: string) => boolean;
}

const DemoNudgeContext = createContext<DemoNudgeContextType | undefined>(undefined);

export function DemoNudgeProvider({ children }: { children: React.ReactNode }) {
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
    // Returns true if blocked, false if allowed
    const checkDemoAndNudge = useCallback((action?: string): boolean => {
        if (isDemoMode) {
            showNudge(action);
            return true;
        }
        return false;
    }, [isDemoMode, showNudge]);

    return (
        <DemoNudgeContext.Provider value={{ showNudge, checkDemoAndNudge }}>
            {children}
            <SignupNudgeModal
                visible={nudgeVisible}
                onClose={hideNudge}
                actionName={actionName}
            />
        </DemoNudgeContext.Provider>
    );
}

export function useDemoNudge() {
    const context = useContext(DemoNudgeContext);
    if (context === undefined) {
        throw new Error('useDemoNudge must be used within a DemoNudgeProvider');
    }
    return context;
}
