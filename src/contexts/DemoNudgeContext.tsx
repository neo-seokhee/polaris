import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SignupNudgeModal } from '@/components/SignupNudgeModal';
import { DemoWelcomeModal } from '@/components/DemoWelcomeModal';
import { useAuth } from './AuthContext';

interface DemoNudgeContextType {
    showNudge: (actionName?: string) => void;
    checkDemoAndNudge: (actionName?: string) => boolean;
}

const DemoNudgeContext = createContext<DemoNudgeContextType | undefined>(undefined);

export function DemoNudgeProvider({ children }: { children: React.ReactNode }) {
    const { isDemoMode, loading } = useAuth();
    const [nudgeVisible, setNudgeVisible] = useState(false);
    const [welcomeVisible, setWelcomeVisible] = useState(false);
    const [hasShownWelcome, setHasShownWelcome] = useState(false);
    const [actionName, setActionName] = useState<string>('이 기능을 사용');

    useEffect(() => {
        if (!loading && isDemoMode && !hasShownWelcome) {
            setWelcomeVisible(true);
            setHasShownWelcome(true);
        }
    }, [loading, isDemoMode, hasShownWelcome]);

    const hideWelcome = useCallback(() => {
        setWelcomeVisible(false);
    }, []);

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
            <DemoWelcomeModal
                visible={welcomeVisible}
                onClose={hideWelcome}
            />
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
