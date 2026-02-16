import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Platform } from 'react-native';

// OAuth 완료 후 브라우저 세션 정리
WebBrowser.maybeCompleteAuthSession();

// Google OAuth 설정
// 실제 사용 시 Google Cloud Console에서 OAuth Client ID를 생성해야 합니다
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '';

// Google OAuth endpoints
const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Calendar API scope
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
];

export interface GoogleTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

export interface GoogleCalendar {
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
}

export interface GoogleEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    colorId?: string;
}

export interface CreateEventParams {
    title: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    description?: string;
    calendarId?: string;
}

export interface UpdateEventParams extends CreateEventParams {
    eventId: string;
}

// Redirect URI 생성
export function getRedirectUri(): string {
    let uri: string;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // 웹: 현재 origin에서 /google-callback 경로 사용
        uri = `${window.location.origin}/google-callback`;
    } else {
        // 모바일 (iOS/Android): 웹 URL 사용
        // Google OAuth는 custom scheme을 지원하지 않으므로 웹 URL로 리다이렉트
        uri = 'https://gopolaris.app/google-callback';
    }

    console.log('[Google OAuth] Redirect URI:', uri);
    return uri;
}

// Auth Request 생성을 위한 설정 반환
export function getAuthRequestConfig() {
    const redirectUri = getRedirectUri();

    return {
        clientId: GOOGLE_CLIENT_ID,
        scopes: SCOPES,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: {
            access_type: 'offline',
            prompt: 'consent',
        },
    };
}

// Discovery document 반환
export function getDiscovery() {
    return discovery;
}

// Authorization code를 토큰으로 교환
export async function exchangeCodeForTokens(
    code: string,
    codeVerifier: string
): Promise<GoogleTokens> {
    const redirectUri = getRedirectUri();

    const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        }).toString(),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
}

// Refresh token으로 새 access token 획득
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }).toString(),
    });

    if (!response.ok) {
        throw new Error('Failed to refresh access token');
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // 새 refresh token이 없으면 기존 것 유지
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
}

// 사용자 이메일 가져오기
export async function getUserEmail(accessToken: string): Promise<string | null> {
    try {
        const response = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.email || null;
    } catch {
        return null;
    }
}

// 캘린더 목록 가져오기
export async function getCalendarList(accessToken: string): Promise<GoogleCalendar[]> {
    const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to get calendar list');
    }

    const data = await response.json();
    return data.items || [];
}

// 일정 생성
export async function createEvent(
    accessToken: string,
    params: CreateEventParams
): Promise<GoogleEvent> {
    const calendarId = params.calendarId || 'primary';
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event: GoogleEvent = {
        summary: params.title,
        description: params.description,
        location: params.location,
        start: {
            dateTime: params.startTime.toISOString(),
            timeZone,
        },
        end: {
            dateTime: params.endTime.toISOString(),
            timeZone,
        },
    };

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to create event');
    }

    return response.json();
}

// 일정 수정
export async function updateEvent(
    accessToken: string,
    params: UpdateEventParams
): Promise<GoogleEvent> {
    const calendarId = params.calendarId || 'primary';
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event: GoogleEvent = {
        summary: params.title,
        description: params.description,
        location: params.location,
        start: {
            dateTime: params.startTime.toISOString(),
            timeZone,
        },
        end: {
            dateTime: params.endTime.toISOString(),
            timeZone,
        },
    };

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(params.eventId)}`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update event');
    }

    return response.json();
}

// 일정 삭제
export async function deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
): Promise<void> {
    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to delete event');
    }
}

// 특정 캘린더의 이벤트 가져오기
export async function getCalendarEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date
): Promise<GoogleEvent[]> {
    const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
    });

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to get calendar events');
    }

    const data = await response.json();
    return data.items || [];
}

// 여러 캘린더의 이벤트를 한번에 가져오기
export async function getAllCalendarEvents(
    accessToken: string,
    calendarIds: string[],
    timeMin: Date,
    timeMax: Date
): Promise<{ calendarId: string; events: GoogleEvent[] }[]> {
    const results = await Promise.all(
        calendarIds.map(async (calendarId) => {
            try {
                const events = await getCalendarEvents(accessToken, calendarId, timeMin, timeMax);
                return { calendarId, events };
            } catch {
                return { calendarId, events: [] };
            }
        })
    );
    return results;
}

// 토큰 만료 여부 확인
export function isTokenExpired(expiresAt: Date | string): boolean {
    const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    // 5분 전에 만료된 것으로 간주 (버퍼)
    return expiry.getTime() - 5 * 60 * 1000 < Date.now();
}

// Google Calendar API가 설정되었는지 확인
export function isGoogleCalendarConfigured(): boolean {
    return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}
