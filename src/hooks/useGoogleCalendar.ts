import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
    exchangeCodeForTokens,
    refreshAccessToken,
    getUserEmail,
    getCalendarList,
    getCalendarEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    isTokenExpired,
    isGoogleCalendarConfigured,
    getAuthRequestConfig,
    getDiscovery,
    GoogleCalendar,
    GoogleEvent,
    CreateEventParams,
    UpdateEventParams,
} from '@/lib/googleCalendar';
import type { Database } from '@/lib/database.types';

type GoogleToken = Database['public']['Tables']['google_tokens']['Row'];
type SyncedEvent = Database['public']['Tables']['synced_events']['Row'];

export interface CalendarWithEnabled extends GoogleCalendar {
    isEnabled: boolean;
}

export interface UnifiedEvent {
    id: string;
    calendarId: string;
    calendarName: string;
    title: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    description?: string;
    color: string;
}

const ENABLED_CALENDARS_KEY = 'google_enabled_calendars';
const CALENDARS_CACHE_KEY = 'google_calendars_cache';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5분

// 크로스 플랫폼 스토리지 유틸리티
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return AsyncStorage.getItem(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await AsyncStorage.setItem(key, value);
    },
    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await AsyncStorage.removeItem(key);
    },
};

export function useGoogleCalendar() {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [calendars, setCalendars] = useState<CalendarWithEnabled[]>([]);
    const [events, setEvents] = useState<UnifiedEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

    const [tokenData, setTokenData] = useState<GoogleToken | null>(null);

    // Auth request 설정
    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        getAuthRequestConfig(),
        getDiscovery()
    );

    // 활성화된 캘린더 ID 로드
    const loadEnabledCalendars = useCallback(async (): Promise<string[]> => {
        try {
            const stored = await storage.getItem(ENABLED_CALENDARS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }, []);

    // 활성화된 캘린더 ID 저장
    const saveEnabledCalendars = useCallback(async (calendarIds: string[]) => {
        try {
            await storage.setItem(ENABLED_CALENDARS_KEY, JSON.stringify(calendarIds));
        } catch (err) {
            // Failed to save enabled calendars - silent fail
        }
    }, []);

    // 캘린더 목록 캐시 로드
    const loadCalendarsCache = useCallback(async (): Promise<CalendarWithEnabled[]> => {
        try {
            const stored = await storage.getItem(CALENDARS_CACHE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }, []);

    // 캘린더 목록 캐시 저장
    const saveCalendarsCache = useCallback(async (cals: CalendarWithEnabled[]) => {
        try {
            await storage.setItem(CALENDARS_CACHE_KEY, JSON.stringify(cals));
        } catch (err) {
            // Failed to save calendars cache - silent fail
        }
    }, []);

    // DB에서 캐시된 이벤트 로드
    const loadCachedEvents = useCallback(async (): Promise<UnifiedEvent[]> => {
        if (!user) return [];

        try {
            const { data, error } = await supabase
                .from('synced_events')
                .select('*')
                .eq('user_id', user.id)
                .order('start_time', { ascending: true });

            if (error) throw error;

            const cachedCalendars = await loadCalendarsCache();

            return (data || []).map(event => {
                const calendar = cachedCalendars.find(c => c.id === event.calendar_id);
                return {
                    id: event.uid,
                    calendarId: event.calendar_id,
                    calendarName: calendar?.summary || '',
                    title: event.title,
                    startTime: new Date(event.start_time),
                    endTime: new Date(event.end_time),
                    location: event.location || undefined,
                    description: event.description || undefined,
                    color: calendar?.backgroundColor || '#3B82F6',
                };
            });
        } catch (err) {
            // Load cached events error - silent fail
            return [];
        }
    }, [user, loadCalendarsCache]);

    // DB에 이벤트 캐시 저장
    const saveCachedEvents = useCallback(async (eventsToSave: UnifiedEvent[]) => {
        if (!user) return;

        try {
            // 기존 이벤트 삭제 (현재 사용자의 이벤트만)
            await supabase
                .from('synced_events')
                .delete()
                .eq('user_id', user.id);

            if (eventsToSave.length === 0) return;

            // 새 이벤트 저장
            const eventsData = eventsToSave.map(event => ({
                user_id: user.id,
                calendar_id: event.calendarId,
                uid: event.id,
                title: event.title,
                start_time: event.startTime.toISOString(),
                end_time: event.endTime.toISOString(),
                location: event.location || null,
                description: event.description || null,
            }));

            const { error } = await supabase
                .from('synced_events')
                .insert(eventsData);

            if (error) {
                // Save cached events error - silent fail
            }
        } catch (err) {
            // Save cached events error - silent fail
        }
    }, [user]);

    // 저장된 토큰 로드
    const loadTokens = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('google_tokens')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                setIsConnected(false);
                return;
            }

            if (data) {
                setTokenData(data);
                setEmail(data.email);
                setIsConnected(true);

                // 캐시된 캘린더 로드
                const cachedCalendars = await loadCalendarsCache();
                if (cachedCalendars.length > 0) {
                    setCalendars(cachedCalendars);
                }

                // 캐시된 이벤트 로드
                const cachedEvents = await loadCachedEvents();
                if (cachedEvents.length > 0) {
                    setEvents(cachedEvents);
                }

                // 토큰이 만료되었으면 갱신
                if (isTokenExpired(data.expires_at)) {
                    await refreshTokens(data.refresh_token);
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, loadCalendarsCache, loadCachedEvents]);

    // 토큰 갱신
    const refreshTokens = async (refreshToken: string): Promise<string | null> => {
        if (!user) return null;

        try {
            const tokens = await refreshAccessToken(refreshToken);

            const { data, error } = await supabase
                .from('google_tokens')
                .update({
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    expires_at: tokens.expiresAt.toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            setTokenData(data);
            return tokens.accessToken;
        } catch (err: any) {
            setIsConnected(false);
            setTokenData(null);
            throw err;
        }
    };

    // 유효한 access token 가져오기
    const getValidAccessToken = async (): Promise<string | null> => {
        if (!tokenData) return null;

        if (isTokenExpired(tokenData.expires_at)) {
            return await refreshTokens(tokenData.refresh_token);
        }

        return tokenData.access_token;
    };

    // OAuth 응답 처리
    useEffect(() => {
        if (!response || !user) return;

        const handleAuthResponse = async () => {
            if (response.type === 'success' && response.params.code) {
                try {
                    setIsLoading(true);

                    if (!request?.codeVerifier) {
                        throw new Error('Code verifier not found');
                    }

                    const tokens = await exchangeCodeForTokens(
                        response.params.code,
                        request.codeVerifier
                    );

                    const userEmail = await getUserEmail(tokens.accessToken);

                    const { data, error } = await supabase
                        .from('google_tokens')
                        .upsert({
                            user_id: user.id,
                            access_token: tokens.accessToken,
                            refresh_token: tokens.refreshToken,
                            expires_at: tokens.expiresAt.toISOString(),
                            email: userEmail || null,
                            updated_at: new Date().toISOString(),
                        }, {
                            onConflict: 'user_id',
                        })
                        .select()
                        .single();

                    if (error) throw error;

                    setTokenData(data);
                    setEmail(userEmail);
                    setIsConnected(true);

                    // 연결 후 캘린더 목록 및 이벤트 가져오기
                    await fetchCalendarsAndEvents(tokens.accessToken);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            } else if (response.type === 'error') {
                setError(response.error?.message || 'Authentication failed');
            }
        };

        handleAuthResponse();
    }, [response, user, request]);

    // 초기 토큰 로드
    useEffect(() => {
        if (user) {
            loadTokens();
        } else {
            setIsConnected(false);
            setTokenData(null);
            setEmail(null);
            setCalendars([]);
            setEvents([]);
            setIsLoading(false);
        }
    }, [user, loadTokens]);

    // 캘린더 목록과 이벤트 가져오기
    const fetchCalendarsAndEvents = async (accessToken?: string) => {
        try {
            const token = accessToken || await getValidAccessToken();
            if (!token) {
                throw new Error('Not connected to Google Calendar');
            }

            setIsSyncing(true);

            // 캘린더 목록 가져오기
            const calendarList = await getCalendarList(token);
            const enabledIds = await loadEnabledCalendars();

            // 처음 연결 시 모든 캘린더 활성화
            const calendarsWithEnabled: CalendarWithEnabled[] = calendarList.map(cal => ({
                ...cal,
                isEnabled: enabledIds.length === 0 ? true : enabledIds.includes(cal.id),
            }));

            setCalendars(calendarsWithEnabled);
            await saveCalendarsCache(calendarsWithEnabled);

            // 활성화된 캘린더 저장 (처음 연결 시)
            if (enabledIds.length === 0) {
                await saveEnabledCalendars(calendarList.map(c => c.id));
            }

            // 이벤트 가져오기 (1년: 6개월 전 ~ 6개월 후)
            const now = new Date();
            const timeMin = new Date(now);
            timeMin.setMonth(timeMin.getMonth() - 6);
            const timeMax = new Date(now);
            timeMax.setMonth(timeMax.getMonth() + 6);

            const enabledCalendars = calendarsWithEnabled.filter(c => c.isEnabled);
            const allEvents: UnifiedEvent[] = [];

            for (const calendar of enabledCalendars) {
                try {
                    const calendarEvents = await getCalendarEvents(token, calendar.id, timeMin, timeMax);

                    const unifiedEvents = calendarEvents
                        .filter(event => event.start?.dateTime && event.end?.dateTime)
                        .map(event => ({
                            id: event.id || `${calendar.id}-${Date.now()}-${Math.random()}`,
                            calendarId: calendar.id,
                            calendarName: calendar.summary,
                            title: event.summary || '(제목 없음)',
                            startTime: new Date(event.start.dateTime),
                            endTime: new Date(event.end.dateTime),
                            location: event.location,
                            description: event.description,
                            color: calendar.backgroundColor || '#3B82F6',
                        }));

                    allEvents.push(...unifiedEvents);
                } catch (err) {
                    // Failed to fetch events - continue with other calendars
                }
            }

            // 시작 시간순 정렬
            allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
            setEvents(allEvents);
            setLastSyncedAt(new Date());

            // DB에 캐시
            await saveCachedEvents(allEvents);

            return { calendars: calendarsWithEnabled, events: allEvents };
        } catch (err: any) {
            setError(err.message);
            return { calendars: [], events: [] };
        } finally {
            setIsSyncing(false);
        }
    };

    // Google 계정 연결
    const connect = async (): Promise<{ error: string | null }> => {
        if (!isGoogleCalendarConfigured()) {
            const errorMsg = 'Google Calendar API가 설정되지 않았습니다.\n\n.env 파일에 다음 환경 변수를 설정하세요:\n- EXPO_PUBLIC_GOOGLE_CLIENT_ID\n- EXPO_PUBLIC_GOOGLE_CLIENT_SECRET';
            setError(errorMsg);
            return { error: errorMsg };
        }

        try {
            setError(null);

            if (Platform.OS === 'web') {
                // 웹: 기존 AuthSession 방식 사용
                const result = await promptAsync();
                if (result.type === 'cancel' || result.type === 'dismiss') {
                    return { error: '사용자가 인증을 취소했습니다.' };
                }
                return { error: null };
            }

            // 모바일: WebBrowser.openAuthSessionAsync 사용 (카카오 로그인과 동일한 패턴)
            const config = getAuthRequestConfig();
            const appCallbackUrl = ExpoLinking.createURL('google-auth-callback');

            // PKCE code verifier 생성
            const codeVerifier = await generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);

            // code_verifier를 AsyncStorage에 임시 저장 (콜백에서 사용)
            await storage.setItem('google_code_verifier', codeVerifier);

            // state 파라미터에 앱 콜백 URL 포함
            const stateData = JSON.stringify({ mobile: true, callbackUrl: appCallbackUrl });

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${encodeURIComponent(config.clientId)}` +
                `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
                `&response_type=code` +
                `&scope=${encodeURIComponent(config.scopes.join(' '))}` +
                `&access_type=offline` +
                `&prompt=consent` +
                `&code_challenge=${encodeURIComponent(codeChallenge)}` +
                `&code_challenge_method=S256` +
                `&state=${encodeURIComponent(stateData)}`;

            console.log('[Google OAuth] Opening auth URL:', authUrl);
            console.log('[Google OAuth] App callback URL:', appCallbackUrl);

            const result = await WebBrowser.openAuthSessionAsync(authUrl, appCallbackUrl);

            if (result.type !== 'success' || !result.url) {
                if (result.type === 'cancel') {
                    return { error: '사용자가 인증을 취소했습니다.' };
                }
                return { error: 'Google 인증에 실패했습니다.' };
            }

            console.log('[Google OAuth] Got result URL:', result.url);
            const url = new URL(result.url);

            // 에러 체크
            const errorParam = url.searchParams.get('error');
            if (errorParam) {
                return { error: `Google 인증 오류: ${errorParam}` };
            }

            // code 추출
            const code = url.searchParams.get('code');
            if (!code) {
                return { error: '인증 코드를 받지 못했습니다.' };
            }

            // 저장된 code_verifier 가져오기
            const storedCodeVerifier = await storage.getItem('google_code_verifier');
            if (!storedCodeVerifier) {
                return { error: 'Code verifier를 찾을 수 없습니다.' };
            }

            // 토큰 교환
            setIsLoading(true);
            const tokens = await exchangeCodeForTokens(code, storedCodeVerifier);
            const userEmail = await getUserEmail(tokens.accessToken);

            // DB에 토큰 저장
            const { data, error: dbError } = await supabase
                .from('google_tokens')
                .upsert({
                    user_id: user!.id,
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    expires_at: tokens.expiresAt.toISOString(),
                    email: userEmail || null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setTokenData(data);
            setEmail(userEmail);
            setIsConnected(true);
            setIsLoading(false);

            // 연결 후 캘린더 목록 및 이벤트 가져오기
            await fetchCalendarsAndEvents(tokens.accessToken);

            // 임시 저장된 code_verifier 삭제
            await storage.removeItem('google_code_verifier');

            return { error: null };
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return { error: err.message };
        }
    };

    // PKCE code verifier 생성 (43-128자 랜덤 문자열)
    const generateCodeVerifier = async (): Promise<string> => {
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        return btoa(String.fromCharCode(...randomBytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    // PKCE code challenge 생성 (code_verifier의 SHA256 해시)
    const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
        const digest = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            codeVerifier,
            { encoding: Crypto.CryptoEncoding.BASE64 }
        );
        return digest
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    // Google 계정 연결 해제
    const disconnect = async () => {
        if (!user) return;

        try {
            setIsLoading(true);

            // DB에서 토큰 삭제
            await supabase
                .from('google_tokens')
                .delete()
                .eq('user_id', user.id);

            // 캐시된 이벤트 삭제
            await supabase
                .from('synced_events')
                .delete()
                .eq('user_id', user.id);

            setIsConnected(false);
            setTokenData(null);
            setEmail(null);
            setCalendars([]);
            setEvents([]);
            await storage.removeItem(ENABLED_CALENDARS_KEY);
            await storage.removeItem(CALENDARS_CACHE_KEY);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // 캘린더 활성화/비활성화 토글
    const toggleCalendar = async (calendarId: string) => {
        const updatedCalendars = calendars.map(cal =>
            cal.id === calendarId ? { ...cal, isEnabled: !cal.isEnabled } : cal
        );
        setCalendars(updatedCalendars);
        await saveCalendarsCache(updatedCalendars);

        const enabledIds = updatedCalendars.filter(c => c.isEnabled).map(c => c.id);
        await saveEnabledCalendars(enabledIds);

        // 이벤트 다시 가져오기
        await fetchCalendarsAndEvents();
    };

    // 캘린더 목록만 가져오기 (기존 호환성)
    const fetchCalendars = async () => {
        const result = await fetchCalendarsAndEvents();
        return result.calendars;
    };

    // 동기화 (새로고침)
    const sync = async () => {
        return await fetchCalendarsAndEvents();
    };

    // 특정 날짜의 이벤트 가져오기
    const getEventsForDate = useCallback((date: Date): UnifiedEvent[] => {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        return events.filter(event => {
            const eventStart = new Date(event.startTime);
            return eventStart >= targetDate && eventStart < nextDate;
        });
    }, [events]);

    // 날짜 범위의 이벤트 가져오기
    const getEventsForDateRange = useCallback((startDate: Date, endDate: Date): UnifiedEvent[] => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return events.filter(event => {
            const eventStart = new Date(event.startTime);
            return eventStart >= start && eventStart <= end;
        });
    }, [events]);

    // 일정 생성
    const addEvent = async (params: CreateEventParams): Promise<{ success: boolean; error?: string }> => {
        try {
            const accessToken = await getValidAccessToken();
            if (!accessToken) {
                return { success: false, error: 'Google Calendar에 연결되지 않았습니다.' };
            }

            const createdEvent = await createEvent(accessToken, params);

            // 새 이벤트를 로컬 상태에 바로 추가 (전체 동기화 대신)
            const calendar = calendars.find(c => c.id === (params.calendarId || 'primary'));
            if (createdEvent && createdEvent.id) {
                const newEvent: UnifiedEvent = {
                    id: createdEvent.id,
                    calendarId: params.calendarId || 'primary',
                    calendarName: calendar?.summary || '',
                    title: params.title,
                    startTime: params.startTime,
                    endTime: params.endTime,
                    location: params.location,
                    description: params.description,
                    color: calendar?.backgroundColor || '#3B82F6',
                };

                setEvents(prev => {
                    const updated = [...prev, newEvent].sort(
                        (a, b) => a.startTime.getTime() - b.startTime.getTime()
                    );
                    return updated;
                });
            }

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    // 일정 수정
    const editEvent = async (params: UpdateEventParams): Promise<{ success: boolean; error?: string }> => {
        try {
            const accessToken = await getValidAccessToken();
            if (!accessToken) {
                return { success: false, error: 'Google Calendar에 연결되지 않았습니다.' };
            }

            await updateEvent(accessToken, params);

            // 로컬 상태 업데이트
            const calendar = calendars.find(c => c.id === (params.calendarId || 'primary'));
            setEvents(prev => {
                const updated = prev.map(event => {
                    if (event.id === params.eventId && event.calendarId === (params.calendarId || 'primary')) {
                        return {
                            ...event,
                            title: params.title,
                            startTime: params.startTime,
                            endTime: params.endTime,
                            location: params.location,
                            description: params.description,
                        };
                    }
                    return event;
                }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                return updated;
            });

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    // 일정 삭제
    const removeEvent = async (eventId: string, calendarId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const accessToken = await getValidAccessToken();
            if (!accessToken) {
                return { success: false, error: 'Google Calendar에 연결되지 않았습니다.' };
            }

            await deleteEvent(accessToken, calendarId, eventId);

            // 로컬 상태에서 삭제
            setEvents(prev => prev.filter(event => !(event.id === eventId && event.calendarId === calendarId)));

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    return {
        isConfigured: isGoogleCalendarConfigured(),
        isConnected,
        isLoading,
        isSyncing,
        email,
        calendars,
        events,
        error,
        lastSyncedAt,
        connect,
        disconnect,
        fetchCalendars,
        fetchCalendarsAndEvents,
        toggleCalendar,
        sync,
        getEventsForDate,
        getEventsForDateRange,
        addEvent,
        editEvent,
        removeEvent,
    };
}
