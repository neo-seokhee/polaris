import { Platform } from 'react-native';

// Kakao OAuth endpoints
const KAKAO_TOKEN_ENDPOINT = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_INFO_ENDPOINT = 'https://kapi.kakao.com/v2/user/me';

// Environment variables
const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_CLIENT_ID || '';
const KAKAO_CLIENT_SECRET = process.env.EXPO_PUBLIC_KAKAO_CLIENT_SECRET || '';

export interface KakaoTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_token_expires_in: number;
    token_type: string;
}

export interface KakaoUser {
    id: number;
    kakao_account?: {
        email?: string;
        phone_number?: string;
        profile?: {
            nickname?: string;
            profile_image_url?: string;
        };
    };
}

/**
 * 카카오 전화번호 포맷을 한국 국내 형식으로 변환
 * 예: "+82 10-1234-5678" → "010-1234-5678"
 */
export function formatKakaoPhoneNumber(kakaoPhone?: string): string | undefined {
    if (!kakaoPhone) return undefined;
    // "+82 10-1234-5678" → "010-1234-5678"
    const cleaned = kakaoPhone.replace(/^\+82\s?/, '0').trim();
    return cleaned || undefined;
}

export function isKakaoConfigured(): boolean {
    return !!KAKAO_CLIENT_ID;
}

export function getKakaoAuthRequestConfig() {
    // 모든 플랫폼에서 웹 URL 사용 (카카오 콘솔에 등록 가능)
    // iOS에서는 Safari로 인증 후, 웹 페이지에서 토큰 교환 완료 후 앱으로 deep link
    let redirectUri: string;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // 웹: 현재 origin에서 /kakao-callback 경로 사용 (localhost 개발 지원)
        redirectUri = `${window.location.origin}/kakao-callback`;
    } else {
        // 모바일 (iOS/Android): 웹 URL 사용
        // 카카오 콘솔에 custom scheme 등록 불가하므로 웹 URL로 리다이렉트
        // 웹 페이지에서 토큰 교환 후 polaris://auth-callback으로 앱 복귀
        redirectUri = 'https://gopolaris.app/kakao-callback';
    }

    console.log('[Kakao] Redirect URI:', redirectUri);

    return {
        clientId: KAKAO_CLIENT_ID,
        redirectUri,
        scopes: ['profile_nickname', 'account_email', 'phone_number'],
    };
}

export async function exchangeKakaoCodeForTokens(
    code: string,
    redirectUri: string
): Promise<KakaoTokens> {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: redirectUri,
        code,
    });

    // Add client secret if available (optional for Kakao)
    if (KAKAO_CLIENT_SECRET) {
        params.append('client_secret', KAKAO_CLIENT_SECRET);
    }

    const response = await fetch(KAKAO_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Failed to exchange code for tokens');
    }

    return response.json();
}

export async function refreshKakaoToken(refreshToken: string): Promise<KakaoTokens> {
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: KAKAO_CLIENT_ID,
        refresh_token: refreshToken,
    });

    if (KAKAO_CLIENT_SECRET) {
        params.append('client_secret', KAKAO_CLIENT_SECRET);
    }

    const response = await fetch(KAKAO_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Failed to refresh token');
    }

    return response.json();
}

export async function getKakaoUserInfo(accessToken: string): Promise<KakaoUser> {
    const response = await fetch(KAKAO_USER_INFO_ENDPOINT, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Failed to get user info');
    }

    return response.json();
}

export function isKakaoTokenExpired(expiresAt: string): boolean {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    // Consider expired if less than 5 minutes remaining
    return currentTime >= expirationTime - 5 * 60 * 1000;
}
