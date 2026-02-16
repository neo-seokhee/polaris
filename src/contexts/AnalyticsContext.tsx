import { createContext, useContext, useEffect, useCallback } from 'react';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useAuth } from '@/contexts/AuthContext';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

interface AnalyticsContextType {
    track: (event: string, properties?: Record<string, any>) => void;
    screen: (screenName: string, properties?: Record<string, any>) => void;
    identify: (userId: string, properties?: Record<string, any>) => void;
    reset: () => void;
    isEnabled: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

function AnalyticsProviderInner({ children }: { children: React.ReactNode }) {
    const posthog = usePostHog();
    const { user, isDemoMode } = useAuth();

    const isEnabled = Boolean(POSTHOG_API_KEY && POSTHOG_API_KEY !== 'phc_xxxxx');

    // Identify user when logged in
    useEffect(() => {
        if (!isEnabled || !posthog) return;

        if (user && !isDemoMode) {
            posthog.identify(user.id, {
                email: user.email || '',
                name: user.user_metadata?.name || '',
                created_at: user.created_at,
            });
        }
    }, [user, isDemoMode, posthog, isEnabled]);

    const track = useCallback((event: string, properties?: Record<string, any>) => {
        if (!isEnabled || !posthog) return;

        posthog.capture(event, {
            ...properties,
            is_demo_mode: isDemoMode,
        });
    }, [posthog, isDemoMode, isEnabled]);

    const screen = useCallback((screenName: string, properties?: Record<string, any>) => {
        if (!isEnabled || !posthog) return;

        posthog.screen(screenName, {
            ...properties,
            is_demo_mode: isDemoMode,
        });
    }, [posthog, isDemoMode, isEnabled]);

    const identify = useCallback((userId: string, properties?: Record<string, any>) => {
        if (!isEnabled || !posthog) return;

        posthog.identify(userId, properties);
    }, [posthog, isEnabled]);

    const reset = useCallback(() => {
        if (!isEnabled || !posthog) return;

        posthog.reset();
    }, [posthog, isEnabled]);

    return (
        <AnalyticsContext.Provider
            value={{
                track,
                screen,
                identify,
                reset,
                isEnabled,
            }}
        >
            {children}
        </AnalyticsContext.Provider>
    );
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    const isEnabled = Boolean(POSTHOG_API_KEY && POSTHOG_API_KEY !== 'phc_xxxxx');

    if (!isEnabled) {
        // PostHog not configured, provide noop analytics
        return (
            <AnalyticsContext.Provider
                value={{
                    track: () => {},
                    screen: () => {},
                    identify: () => {},
                    reset: () => {},
                    isEnabled: false,
                }}
            >
                {children}
            </AnalyticsContext.Provider>
        );
    }

    return (
        <PostHogProvider
            apiKey={POSTHOG_API_KEY}
            options={{
                host: POSTHOG_HOST,
            }}
        >
            <AnalyticsProviderInner>{children}</AnalyticsProviderInner>
        </PostHogProvider>
    );
}

export function useAnalytics() {
    const context = useContext(AnalyticsContext);
    if (context === undefined) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
}
