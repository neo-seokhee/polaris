import PostHog from 'posthog-react-native';
import { notifySlack } from './slackNotify';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
    if (!POSTHOG_API_KEY || POSTHOG_API_KEY === 'phc_xxxxx') {
        return null;
    }

    if (!posthogClient) {
        posthogClient = new PostHog(POSTHOG_API_KEY, {
            host: POSTHOG_HOST,
        });
    }

    return posthogClient;
}

export function trackEvent(event: string, properties?: Record<string, any>) {
    const client = getPostHogClient();
    if (client) {
        client.capture(event, properties);
    }
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
    const client = getPostHogClient();
    if (client) {
        client.identify(userId, properties);
    }

    // 슬랙 로그 전송
    notifySlack('user_identified', {
        userId,
        email: properties?.email,
        phone: properties?.phone,
        name: properties?.name,
    });
}

export function resetAnalytics() {
    const client = getPostHogClient();
    if (client) {
        client.reset();
    }
}
