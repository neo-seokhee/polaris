import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Kakao OAuth endpoints
const KAKAO_AUTH_ENDPOINT = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_ENDPOINT = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_INFO_ENDPOINT = 'https://kapi.kakao.com/v2/user/me';

// Environment variables
const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_CLIENT_ID || '';
const KAKAO_CLIENT_SECRET = process.env.EXPO_PUBLIC_KAKAO_CLIENT_SECRET || '';

WebBrowser.maybeCompleteAuthSession();

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
        profile?: {
            nickname?: string;
            profile_image_url?: string;
        };
    };
}

export function isKakaoConfigured(): boolean {
    return !!KAKAO_CLIENT_ID;
}

export function getKakaoAuthRequestConfig() {
    // Expo Go에서는 proxy 사용, standalone에서는 native scheme 사용
    const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'polaris',
        path: 'kakao-callback',
        preferLocalhost: false,
        // @ts-ignore - useProxy is deprecated but still works for Expo Go
        useProxy: true,
    });

    return {
        clientId: KAKAO_CLIENT_ID,
        redirectUri,
        scopes: ['profile_nickname', 'account_email'],
    };
}

export function getKakaoDiscovery(): AuthSession.DiscoveryDocument {
    return {
        authorizationEndpoint: KAKAO_AUTH_ENDPOINT,
        tokenEndpoint: KAKAO_TOKEN_ENDPOINT,
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
