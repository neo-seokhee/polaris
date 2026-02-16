import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Linking } from 'react-native';
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

export default function KakaoCallbackScreen() {
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
        // 이전 버전 호환: state가 단순 문자열 'mobile'인 경우
        if (params.state === 'mobile') {
            stateData = { mobile: true };
        }
        console.log('[KakaoCallback] Failed to parse state, using fallback:', params.state);
    }

    const isMobileApp = stateData.mobile === true;
    const appCallbackUrl = stateData.callbackUrl || 'polaris://auth-callback';

    console.log('[KakaoCallback] State data:', stateData);
    console.log('[KakaoCallback] isMobileApp:', isMobileApp);
    console.log('[KakaoCallback] appCallbackUrl:', appCallbackUrl);

    // 앱으로 돌아가는 함수
    const returnToApp = async (success: boolean = false, isMobile: boolean = false) => {
        if (Platform.OS === 'web') {
            // 모바일 앱에서 웹으로 온 경우, 앱으로 리다이렉트
            if (isMobile) {
                console.log('[KakaoCallback] Mobile app callback, redirecting to app...');
                const { data: { session } } = await supabase.auth.getSession();

                // 앱 콜백 URL에 파라미터 추가
                const separator = appCallbackUrl.includes('?') ? '&' : '?';

                if (session && success) {
                    const appUrl = `${appCallbackUrl}${separator}access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`;
                    console.log('[KakaoCallback] Redirecting to app with tokens:', appUrl);
                    window.location.href = appUrl;
                } else {
                    // 세션이 없거나 실패한 경우에도 앱으로 돌아감
                    console.log('[KakaoCallback] No session or failed, redirecting to app without tokens');
                    window.location.href = `${appCallbackUrl}${separator}error=login_failed`;
                }
                return;
            }

            // 일반 웹 브라우저에서는 router로 이동
            if (success) {
                console.log('[KakaoCallback] Web login success, navigating to tabs...');
                router.replace('/(tabs)');
            } else {
                console.log('[KakaoCallback] Web login failed, navigating to login...');
                router.replace('/(auth)/login');
            }
        } else {
            // 앱 내에서는 router 사용
            router.replace('/(tabs)');
        }
    };

    useEffect(() => {
        const handleCallback = async () => {
            // On native, AuthSession handles the callback, so we don't need to process it here.
            // We just redirect to the tabs if we somehow land here.
            if (Platform.OS !== 'web') {
                router.replace('/(tabs)');
                return;
            }

            // 모바일 앱에서 온 경우: code를 바로 앱으로 전달하고 앱에서 토큰 교환 처리
            // SPA에서 여러 API 호출을 하면 ASWebAuthenticationSession 내에서 느리고 불안정함
            if (isMobileApp) {
                console.log('[KakaoCallback] Mobile app detected, redirecting back to app immediately...');
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

            // 웹 브라우저 전용 플로우: 토큰 교환 및 Supabase 로그인 처리
            try {
                // Check for error in callback
                if (params.error) {
                    throw new Error(`카카오 인증 오류: ${params.error}`);
                }

                const code = params.code;
                if (!code) {
                    throw new Error('인증 코드가 없습니다.');
                }

                console.log('[KakaoCallback] Got authorization code, exchanging for tokens...');

                // Get the redirect URI used for this request
                const kakaoConfig = getKakaoAuthRequestConfig();

                // Exchange code for tokens
                const tokens = await exchangeKakaoCodeForTokens(code, kakaoConfig.redirectUri);
                console.log('[KakaoCallback] Got tokens, fetching user info...');

                // Get user info from Kakao
                const kakaoUser = await getKakaoUserInfo(tokens.access_token);
                const email = kakaoUser.kakao_account?.email;
                const nickname = kakaoUser.kakao_account?.profile?.nickname;
                const phone = formatKakaoPhoneNumber(kakaoUser.kakao_account?.phone_number);
                console.log('[KakaoCallback] Phone from Kakao:', kakaoUser.kakao_account?.phone_number, '→', phone);

                if (!email) {
                    throw new Error('이메일 정보를 가져올 수 없습니다. 카카오 계정에서 이메일 제공에 동의해주세요.');
                }

                console.log('[KakaoCallback] Got user info, signing in to Supabase...');

                // Try to sign in first
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: `kakao_${kakaoUser.id}`,
                });

                if (signInError) {
                    // If sign in fails, sign up
                    console.log('[KakaoCallback] Sign in failed, attempting sign up...');
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

                    // If signup succeeded but no session (email confirmation required), sign in
                    if (signUpData.user && !signUpData.session) {
                        console.log('[KakaoCallback] Signup succeeded but no session, attempting sign in...');
                        const { error: postSignUpError } = await supabase.auth.signInWithPassword({
                            email,
                            password: `kakao_${kakaoUser.id}`,
                        });
                        if (postSignUpError) {
                            console.log('[KakaoCallback] Post-signup sign in failed:', postSignUpError.message);
                            throw postSignUpError;
                        }
                    }

                    if (signUpData.user) {
                        // public.users 테이블에 phone 저장
                        if (phone) {
                            const savePhone = async (retries = 3) => {
                                for (let i = 0; i < retries; i++) {
                                    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                                    const { error: updateError } = await supabase
                                        .from('users')
                                        .update({ phone })
                                        .eq('id', signUpData.user!.id);
                                    if (!updateError) {
                                        console.log('[KakaoCallback] Phone saved successfully');
                                        return;
                                    }
                                    console.log(`[KakaoCallback] Phone save attempt ${i + 1} failed:`, updateError.message);
                                }
                            };
                            await savePhone();
                        }

                        trackEvent('user_signed_up', { auth_method: 'kakao' });
                        identifyUser(signUpData.user.id, { email, name: nickname });
                    }
                } else {
                    // 기존 사용자도 전화번호가 없으면 업데이트
                    if (phone) {
                        const { data: { user: currentUser } } = await supabase.auth.getUser();
                        if (currentUser) {
                            const { error: phoneErr } = await supabase
                                .from('users')
                                .update({ phone })
                                .eq('id', currentUser.id);
                            if (phoneErr) console.log('[KakaoCallback] Phone update failed:', phoneErr.message);
                            else console.log('[KakaoCallback] Phone updated for existing user');
                        }
                    }

                    trackEvent('user_signed_in', { auth_method: 'kakao' });
                }

                setStatus('success');
                console.log('[KakaoCallback] Authentication successful, redirecting...');

                // 로그인 성공 후 메인으로 이동 (웹 전용)
                setTimeout(() => {
                    returnToApp(true, false);
                }, 500);
            } catch (error: any) {
                console.error('[KakaoCallback] Error:', error);
                setStatus('error');
                setErrorMessage(error.message || '로그인 중 오류가 발생했습니다.');

                // 에러 시 로그인 페이지로 이동 (웹 전용)
                setTimeout(() => {
                    returnToApp(false, false);
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
