import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

/**
 * Google OAuth 콜백 페이지
 * - 웹 브라우저: expo-auth-session이 이 페이지에서 응답을 처리
 * - 모바일 앱: Vercel API(/api/google-callback)가 302로 앱 스킴에 리다이렉트
 *   (state에 "mobile"이 포함된 경우만 API로 라우팅됨)
 */
export default function GoogleCallbackScreen() {
    const params = useLocalSearchParams<{ code?: string; error?: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            if (Platform.OS !== 'web') {
                router.replace('/(tabs)/schedule');
                return;
            }

            try {
                if (params.error) {
                    throw new Error(`Google 인증 오류: ${params.error}`);
                }

                if (!params.code) {
                    throw new Error('인증 코드가 없습니다.');
                }

                // 웹에서는 useGoogleCalendar hook의 useAuthRequest가 처리하므로
                // 여기서는 성공 메시지만 표시하고 schedule 페이지로 리다이렉트
                setStatus('success');
                console.log('[GoogleWebCallback] Web authentication successful, redirecting...');

                setTimeout(() => {
                    router.replace('/(tabs)/schedule');
                }, 500);
            } catch (error: any) {
                console.error('[GoogleWebCallback] Error:', error);
                setStatus('error');
                setErrorMessage(error.message || '인증 중 오류가 발생했습니다.');

                setTimeout(() => {
                    router.replace('/(tabs)/schedule');
                }, 2000);
            }
        };

        handleCallback();
    }, [params.code, params.error]);

    return (
        <View style={styles.container}>
            {status === 'loading' && (
                <>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.text}>Google 캘린더 연결 중...</Text>
                </>
            )}
            {status === 'success' && (
                <>
                    <Text style={styles.successIcon}>✓</Text>
                    <Text style={styles.text}>연결 성공!</Text>
                </>
            )}
            {status === 'error' && (
                <>
                    <Text style={styles.errorIcon}>✕</Text>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <Text style={styles.subText}>일정 페이지로 이동합니다...</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing['4xl'],
    },
    text: {
        fontSize: FontSizes.lg,
        color: Colors.textPrimary,
        marginTop: Spacing['2xl'],
    },
    subText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.lg,
    },
    successIcon: {
        fontSize: 48,
        color: Colors.accent,
    },
    errorIcon: {
        fontSize: 48,
        color: '#ef4444',
    },
    errorText: {
        fontSize: FontSizes.lg,
        color: '#ef4444',
        marginTop: Spacing['2xl'],
        textAlign: 'center',
    },
});
