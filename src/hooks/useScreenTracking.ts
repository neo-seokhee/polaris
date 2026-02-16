import { useEffect } from 'react';
import { useAnalytics } from '@/contexts/AnalyticsContext';

export function useScreenTracking(screenName: string, properties?: Record<string, any>) {
    const { screen } = useAnalytics();

    useEffect(() => {
        screen(screenName, properties);
    }, [screenName, screen, properties]);
}
