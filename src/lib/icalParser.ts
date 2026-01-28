import { Platform } from 'react-native';
import ICAL from 'ical.js';

export interface ParsedEvent {
    uid: string;
    title: string;
    startTime: Date;
    endTime: Date;
    location: string | null;
    description: string | null;
}

const CORS_PROXIES = [
    (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export async function fetchAndParseICS(url: string): Promise<ParsedEvent[]> {
    // webcal:// 프로토콜을 https://로 변환 (Apple Calendar 등)
    const normalizedUrl = url.replace(/^webcal:\/\//i, 'https://');
    console.log('[ICS] Fetching URL:', normalizedUrl);

    // 웹에서 실행 시 CORS 프록시 사용
    if (Platform.OS === 'web') {
        let lastError: Error | null = null;

        for (const proxyFn of CORS_PROXIES) {
            const fetchUrl = proxyFn(normalizedUrl);
            console.log('[ICS] Trying proxy:', fetchUrl);

            try {
                const response = await fetch(fetchUrl);
                console.log('[ICS] Response status:', response.status);

                if (response.ok) {
                    const icsText = await response.text();
                    console.log('[ICS] Received text length:', icsText.length);

                    if (!icsText.includes('BEGIN:VCALENDAR')) {
                        throw new Error('올바른 iCal URL이 아닙니다. Google Calendar의 경우 "설정 > 캘린더 통합 > iCal 형식의 비공개 주소"를 사용하세요.');
                    }

                    const events = parseICS(icsText);
                    console.log('[ICS] Parsed events:', events.length);
                    return events;
                }
            } catch (err) {
                console.log('[ICS] Proxy failed:', err);
                lastError = err as Error;
            }
        }

        throw lastError || new Error('모든 프록시 서버 연결 실패');
    }

    // 네이티브 앱에서는 직접 fetch
    const response = await fetch(normalizedUrl);
    console.log('[ICS] Response status:', response.status);

    if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icsText = await response.text();
    console.log('[ICS] Received text length:', icsText.length);
    console.log('[ICS] First 500 chars:', icsText.substring(0, 500));

    // ICS 형식인지 확인
    if (!icsText.includes('BEGIN:VCALENDAR')) {
        throw new Error('올바른 iCal URL이 아닙니다. Google Calendar의 경우 "설정 > 캘린더 통합 > iCal 형식의 비공개 주소"를 사용하세요.');
    }

    const events = parseICS(icsText);
    console.log('[ICS] Parsed events:', events.length);

    return events;
}

// 1년 범위 (전후 6개월)
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const HALF_YEAR_MS = ONE_YEAR_MS / 2;

export function parseICS(icsText: string): ParsedEvent[] {
    const jcalData = ICAL.parse(icsText);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const events: ParsedEvent[] = [];
    const now = new Date();
    const rangeStart = new Date(now.getTime() - HALF_YEAR_MS); // 6개월 전
    const rangeEnd = new Date(now.getTime() + HALF_YEAR_MS);   // 6개월 후

    console.log('[ICS] Date range:', rangeStart.toISOString(), 'to', rangeEnd.toISOString());

    for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);

        const uid = event.uid;
        const title = event.summary || '(제목 없음)';
        const startDate = event.startDate;
        const endDate = event.endDate;
        const location = event.location || null;
        const description = event.description || null;

        if (!uid || !startDate) {
            continue;
        }

        const startTime = startDate.toJSDate();
        const endTime = endDate ? endDate.toJSDate() : new Date(startTime.getTime() + 60 * 60 * 1000);

        if (event.isRecurring()) {
            const iterator = event.iterator();
            let maxOccurrences = 200; // 1년치 반복 이벤트 충분히 처리
            let next = iterator.next();

            while (next && maxOccurrences > 0) {
                const occurrenceStart = next.toJSDate();

                // 범위를 벗어나면 종료
                if (occurrenceStart > rangeEnd) {
                    break;
                }

                // 범위 내 이벤트만 추가
                if (occurrenceStart >= rangeStart) {
                    const duration = endTime.getTime() - startTime.getTime();
                    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

                    events.push({
                        uid: `${uid}_${occurrenceStart.toISOString()}`,
                        title,
                        startTime: occurrenceStart,
                        endTime: occurrenceEnd,
                        location,
                        description,
                    });
                }

                next = iterator.next();
                maxOccurrences--;
            }
        } else {
            // 일반 이벤트도 1년 범위 내만 포함
            if (startTime >= rangeStart && startTime <= rangeEnd) {
                events.push({
                    uid,
                    title,
                    startTime,
                    endTime,
                    location,
                    description,
                });
            }
        }
    }

    console.log('[ICS] Events within 1 year range:', events.length);
    return events;
}
