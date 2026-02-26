import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
    exchangeKakaoCodeForTokens,
    getKakaoUserInfo,
    getKakaoAuthRequestConfig,
    formatKakaoPhoneNumber,
} from '@/lib/kakaoOAuth';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { trackEvent, identifyUser } from '@/lib/analytics';

/**
 * 웹 브라우저 전용 카카오 로그인 콜백 페이지
 * 모바일 앱 콜백은 Vercel API 라우트(/api/kakao-callback)에서 302 리다이렉트로 처리됨
 */
export default function KakaoWebCallbackScreen() {
    const params = useLocalSearchParams<{ code?: string; error?: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            // 네이티브 앱에서는 이 페이지에 도달하면 안 됨
            if (Platform.OS !== 'web') {
                router.replace('/(tabs)');
                return;
            }

            try {
                if (params.error) {
                    throw new Error(`카카오 인증 오류: ${params.error}`);
                }

                const code = params.code;
                if (!code) {
                    throw new Error('인증 코드가 없습니다.');
                }

                console.log('[KakaoWebCallback] Got authorization code, exchanging for tokens...');

                // redirect_uri는 원래 인증 요청에서 사용한 것과 동일해야 함
                const kakaoConfig = getKakaoAuthRequestConfig();

                const tokens = await exchangeKakaoCodeForTokens(code, kakaoConfig.redirectUri);
                console.log('[KakaoWebCallback] Got tokens, fetching user info...');

                const kakaoUser = await getKakaoUserInfo(tokens.access_token);
                const email = kakaoUser.kakao_account?.email;
                const nickname = kakaoUser.kakao_account?.profile?.nickname;
                const phone = formatKakaoPhoneNumber(kakaoUser.kakao_account?.phone_number);

                if (!email) {
                    throw new Error('이메일 정보를 가져올 수 없습니다. 카카오 계정에서 이메일 제공에 동의해주세요.');
                }

                console.log('[KakaoWebCallback] Got user info, signing in to Supabase...');

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: `kakao_${kakaoUser.id}`,
                });

                if (signInError) {
                    console.log('[KakaoWebCallback] Sign in failed, attempting sign up...');
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password: `kakao_${kakaoUser.id}`,
                        options: {
                            data: {
                                name: nickname || email.split('@')[0],
                                kakao_id: kakaoUser.id.toString(),
                                avatar_url: kakaoUser.kakao_account?.profile?.profile_image_url,
                                phone,
                            },
                        },
                    });

                    if (signUpError) {
                        throw signUpError;
                    }

                    if (signUpData.user && !signUpData.session) {
                        const { error: postSignUpError } = await supabase.auth.signInWithPassword({
                            email,
                            password: `kakao_${kakaoUser.id}`,
                        });
                        if (postSignUpError) throw postSignUpError;
                    }

                    if (signUpData.user) {
                        if (phone) {
                            const savePhone = async (retries = 3) => {
                                for (let i = 0; i < retries; i++) {
                                    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                                    const { error: updateError } = await supabase
                                        .from('users')
                                        .update({ phone })
                                        .eq('id', signUpData.user!.id);
                                    if (!updateError) return;
                                }
                            };
                            await savePhone();
                        }

                        trackEvent('user_signed_up', { auth_method: 'kakao' });
                        identifyUser(signUpData.user.id, { email, name: nickname });
                    }
                } else {
                    if (phone) {
                        const { data: { user: currentUser } } = await supabase.auth.getUser();
                        if (currentUser) {
                            await supabase
                                .from('users')
                                .update({ phone })
                                .eq('id', currentUser.id);
                        }
                    }

                    trackEvent('user_signed_in', { auth_method: 'kakao' });
                }

                setStatus('success');
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 500);
            } catch (error: any) {
                console.error('[KakaoWebCallback] Error:', error);
                setStatus('error');
                setErrorMessage(error.message || '로그인 중 오류가 발생했습니다.');

                setTimeout(() => {
                    router.replace('/(auth)/login');
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
                    <Text style={styles.text}>카카오 로그인 처리 중...</Text>
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
