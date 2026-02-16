import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

export default function GoogleCallbackScreen() {
    const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    // state 파라미터 파싱 (JSON 형식: { mobile: true, callbackUrl: "..." })
    let stateData: { mobile?: boolean; callbackUrl?: string } = {};
    try {
        if (params.state) {
            stateData = JSON.parse(params.state);
        }
    } catch (e) {
        console.log('[GoogleCallback] Failed to parse state:', params.state);
    }

    const isMobileApp = stateData.mobile === true;
    const appCallbackUrl = stateData.callbackUrl || 'polaris://google-auth-callback';

    console.log('[GoogleCallback] State data:', stateData);
    console.log('[GoogleCallback] isMobileApp:', isMobileApp);
    console.log('[GoogleCallback] appCallbackUrl:', appCallbackUrl);

    useEffect(() => {
        const handleCallback = async () => {
            // 네이티브에서는 이 페이지에 도달하면 안 됨
            if (Platform.OS !== 'web') {
                router.replace('/(tabs)/schedule');
                return;
            }

            // 모바일 앱에서 온 경우: code를 바로 앱으로 전달
            if (isMobileApp) {
                console.log('[GoogleCallback] Mobile app detected, redirecting back to app...');
                const separator = appCallbackUrl.includes('?') ? '&' : '?';

                if (params.code) {
                    window.location.href = `${appCallbackUrl}${separator}code=${encodeURIComponent(params.code)}`;
                } else if (params.error) {
                    window.location.href = `${appCallbackUrl}${separator}error=${encodeURIComponent(params.error)}`;
                } else {
                    window.location.href = `${appCallbackUrl}${separator}error=no_code`;
                }
                return;
            }

            // 웹 브라우저 전용 플로우
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
                console.log('[GoogleCallback] Web authentication successful, redirecting...');

                setTimeout(() => {
                    router.replace('/(tabs)/schedule');
                }, 500);
            } catch (error: any) {
                console.error('[GoogleCallback] Error:', error);
                setStatus('error');
                setErrorMessage(error.message || '인증 중 오류가 발생했습니다.');

                setTimeout(() => {
                    router.replace('/(tabs)/schedule');
                }, 2000);
            }
        };

        handleCallback();
    }, [params.code, params.error, isMobileApp, appCallbackUrl]);

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
