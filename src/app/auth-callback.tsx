import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { trackEvent, identifyUser } from '@/lib/analytics';

/**
 * 이 페이지는 웹에서 OAuth 인증 후 앱으로 돌아올 때 세션을 설정합니다.
 * 웹 콜백 (kakao-callback)에서 인증 완료 후 polaris://auth-callback?access_token=...&refresh_token=... 로 리다이렉트합니다.
 */
export default function AuthCallbackScreen() {
    const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const access_token = Array.isArray(params.access_token) ? params.access_token[0] : params.access_token;
                const refresh_token = Array.isArray(params.refresh_token) ? params.refresh_token[0] : params.refresh_token;

                const waitForExistingSession = async () => {
                    // 딥링크 세션 반영이 늦는 환경(특히 모바일 웹/사파리) 대응
                    for (let attempt = 0; attempt < 8; attempt += 1) {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user) {
                            return session;
                        }
                        await new Promise((resolve) => setTimeout(resolve, 250));
                    }
                    return null;
                };

                if (!access_token || !refresh_token) {
                    const existingSession = await waitForExistingSession();
                    if (!existingSession?.user) {
                        // 실제 미로그인 케이스는 조용히 로그인 화면으로 복귀
                        router.replace('/(auth)/login');
                        return;
                    }

                    setStatus('success');
                    setTimeout(() => {
                        router.replace('/(tabs)');
                    }, 300);
                    return;
                }

                console.log('[AuthCallback] Setting session with tokens from web...');

                // 웹에서 받은 토큰으로 세션 설정
                const { data, error } = await supabase.auth.setSession({
                    access_token,
                    refresh_token,
                });

                if (error) {
                    throw error;
                }

                if (data.user) {
                    console.log('[AuthCallback] Session set successfully, user:', data.user.email);
                    trackEvent('user_signed_in', { auth_method: 'kakao_web_callback' });
                    identifyUser(data.user.id, { email: data.user.email });
                }

                setStatus('success');

                // 메인 화면으로 이동
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 500);
            } catch (error: any) {
                console.error('[AuthCallback] Error:', error);
                setStatus('error');
                setErrorMessage(error.message || '로그인 처리 중 오류가 발생했습니다.');

                // 로그인 페이지로 이동
                setTimeout(() => {
                    router.replace('/(auth)/login');
                }, 2000);
            }
        };

        handleAuthCallback();
    }, [params.access_token, params.refresh_token]);

    return (
        <View style={styles.container}>
            {status === 'loading' && (
                <>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.text}>로그인 처리 중...</Text>
                </>
            )}
            {status === 'success' && (
                <>
                    <Text style={styles.successIcon}>✓</Text>
                    <Text style={styles.text}>로그인 성공!</Text>
                </>
            )}
            {status === 'error' && (
                <>
                    <Text style={styles.errorIcon}>✕</Text>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <Text style={styles.subText}>로그인 페이지로 이동합니다...</Text>
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
