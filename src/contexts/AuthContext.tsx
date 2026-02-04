import { createContext, useContext, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import {
    isKakaoConfigured,
    getKakaoAuthRequestConfig,
    exchangeKakaoCodeForTokens,
    getKakaoUserInfo,
} from '@/lib/kakaoOAuth';
import {
    signInWithApple as appleSignIn,
    isAppleAuthAvailable,
} from '@/lib/appleAuth';
import { trackEvent, identifyUser, resetAnalytics } from '@/lib/analytics';
import { notifySlack } from '@/lib/slackNotify';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isDemoMode: boolean;
    isKakaoAvailable: boolean;
    isAppleAvailable: boolean;
    signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signInWithKakao: () => Promise<{ error: any }>;
    signInWithApple: () => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<{ error: any }>;
    enterDemoMode: () => void;
    exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(true);
    const [isAppleAvailable, setIsAppleAvailable] = useState(false);
    const isKakaoAvailable = isKakaoConfigured();

    // Check Apple Sign-In availability
    useEffect(() => {
        isAppleAuthAvailable().then(setIsAppleAvailable);
    }, []);

    const enterDemoMode = () => {
        setIsDemoMode(true);
        trackEvent('demo_mode_entered');
    };
    const exitDemoMode = () => {
        setIsDemoMode(false);
        trackEvent('demo_mode_exited');
    };

    // Kakao OAuth config
    const kakaoConfig = getKakaoAuthRequestConfig();

    // Deep link listener for general auth callbacks
    // Note: 카카오 로그인은 이제 WebBrowser.openAuthSessionAsync를 사용하므로
    // 이 리스너는 다른 인증 방식이나 외부 링크 처리용으로 유지
    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            console.log('[DeepLink] Received URL:', event.url);
            try {
                const url = new URL(event.url);
                // polaris://auth-callback?access_token=...&refresh_token=...
                if (url.host === 'auth-callback' || url.pathname === '/auth-callback') {
                    const accessToken = url.searchParams.get('access_token');
                    const refreshToken = url.searchParams.get('refresh_token');

                    console.log('[DeepLink] Auth callback detected, tokens present:', !!accessToken, !!refreshToken);

                    if (accessToken && refreshToken) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (error) {
                            console.log('[DeepLink] Session restore error:', error.message);
                        } else if (data.user) {
                            console.log('[DeepLink] Session restored for user:', data.user.id);
                            trackEvent('user_signed_in', { auth_method: 'deep_link' });
                            identifyUser(data.user.id, { email: data.user.email });
                        }
                    }
                }
            } catch (error) {
                console.log('[DeepLink] Error parsing URL:', error);
            }
        };

        // 앱이 이미 열려있을 때 deep link 수신
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // 앱이 deep link로 열렸을 때 (cold start)
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            // 로그인된 사용자가 있으면 데모 모드 해제
            if (session?.user) {
                setIsDemoMode(false);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            // Exit demo mode when user logs in
            if (session?.user) {
                setIsDemoMode(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, name: string, phone?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    phone,
                },
            },
        });
        if (!error && data.user) {
            console.log('[SignUp] User created:', data.user.id, 'phone:', phone);

            // public.users 테이블에 phone 저장 (트리거가 row 생성 후 update)
            const savePhone = async (retries = 3) => {
                for (let i = 0; i < retries; i++) {
                    // 트리거가 row를 생성할 시간을 줌
                    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));

                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ phone })
                        .eq('id', data.user!.id);

                    if (!updateError) {
                        console.log('[SignUp] Phone saved successfully');
                        return;
                    }
                    console.log(`[SignUp] Phone save attempt ${i + 1} failed:`, updateError.message);
                }
            };

            // 백그라운드에서 phone 저장 (회원가입 완료는 기다리지 않음)
            savePhone();

            trackEvent('user_signed_up', { auth_method: 'email' });
            identifyUser(data.user.id, { email, name, phone });
            notifySlack('user_signed_up', { email, phone, name });
        }
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (!error && data.user) {
            trackEvent('user_signed_in', { auth_method: 'email' });
            identifyUser(data.user.id, { email });
        }
        return { error };
    };

    const signOut = async () => {
        trackEvent('user_signed_out');
        resetAnalytics();
        try {
            // scope: 'local'은 서버에 요청하지 않고 로컬 세션만 정리
            await supabase.auth.signOut({ scope: 'local' });
        } catch (error) {
            // 에러가 발생해도 로컬 상태는 정리
            console.log('[SignOut] Error during sign out:', error);
        }
        // 로컬 상태 직접 정리
        setSession(null);
        setUser(null);
        setIsDemoMode(true);
    };

    const deleteAccount = async (): Promise<{ error: any }> => {
        if (!user) {
            return { error: new Error('로그인이 필요합니다.') };
        }

        try {
            const userId = user.id;

            // 1. 사용자 관련 데이터 삭제 (todos, goals, memos, schedules)
            // cascade 삭제가 설정되어 있지 않은 경우 수동으로 삭제
            const deletePromises = [
                supabase.from('todos').delete().eq('user_id', userId),
                supabase.from('goals').delete().eq('user_id', userId),
                supabase.from('memos').delete().eq('user_id', userId),
                supabase.from('schedules').delete().eq('user_id', userId),
            ];

            const results = await Promise.all(deletePromises);
            const deleteErrors = results.filter(r => r.error);
            if (deleteErrors.length > 0) {
                console.log('[DeleteAccount] Some data deletion failed:', deleteErrors);
                // 데이터 삭제 실패해도 계속 진행 (사용자 삭제가 더 중요)
            }

            // 2. users 테이블에서 삭제
            const { error: userDeleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (userDeleteError) {
                console.log('[DeleteAccount] User table delete error:', userDeleteError);
            }

            // 3. Supabase auth 사용자 삭제 (RPC 함수 사용)
            // 참고: Supabase는 클라이언트에서 직접 auth.admin.deleteUser를 호출할 수 없음
            // Edge Function 또는 RPC 함수가 필요하지만, 여기서는 로그아웃 처리만 진행
            // 실제 auth 사용자 삭제는 서버에서 처리해야 함

            trackEvent('account_deleted');
            notifySlack('account_deleted', { userId, email: user.email });

            // 4. 세션 정리 및 로그아웃
            resetAnalytics();
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
            setUser(null);
            setIsDemoMode(true);

            return { error: null };
        } catch (error) {
            console.log('[DeleteAccount] Error:', error);
            return { error };
        }
    };

    const signInWithAppleAuth = async (): Promise<{ error: any }> => {
        if (!isAppleAvailable) {
            return { error: new Error('Apple 로그인을 사용할 수 없습니다.') };
        }

        try {
            console.log('[Apple Auth] Starting Apple Sign In...');
            const credential = await appleSignIn();
            console.log('[Apple Auth] Got credential, identityToken:', !!credential.identityToken);

            if (!credential.identityToken) {
                return { error: new Error('Apple 인증에 실패했습니다.') };
            }

            // Apple ID Token으로 Supabase 인증
            console.log('[Apple Auth] Attempting Supabase signInWithIdToken...');
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: credential.identityToken,
                nonce: credential.nonce, // Pass the raw nonce
            });

            if (error) {
                console.log('[Apple Auth] signInWithIdToken failed:', error.message);
                console.log('[Apple Auth] Full error:', JSON.stringify(error));

                // ID Token 인증 실패 시, 이메일/패스워드 방식으로 폴백
                const email = credential.email;
                console.log('[Apple Auth] Fallback: email available:', !!email);

                if (!email) {
                    return { error: new Error(`Apple 로그인 실패: ${error.message}`) };
                }

                const name = credential.fullName
                    ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
                    : email.split('@')[0];

                // 기존 계정 로그인 시도
                console.log('[Apple Auth] Trying password login...');
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: `apple_${credential.user}`,
                });

                if (signInError) {
                    console.log('[Apple Auth] Password login failed, attempting signup...');
                    // 신규 가입
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password: `apple_${credential.user}`,
                        options: {
                            data: {
                                name: name || email.split('@')[0],
                                apple_user_id: credential.user,
                            },
                        },
                    });

                    if (signUpError) {
                        console.log('[Apple Auth] Signup failed:', signUpError.message);
                        return { error: signUpError };
                    }

                    if (signUpData.user) {
                        console.log('[Apple Auth] Signup successful');
                        trackEvent('user_signed_up', { auth_method: 'apple' });
                        identifyUser(signUpData.user.id, { email, name });
                        notifySlack('user_signed_up', { email, name, auth_method: 'apple' });
                    }
                } else {
                    console.log('[Apple Auth] Password login successful');
                    trackEvent('user_signed_in', { auth_method: 'apple' });
                }
            } else if (data.user) {
                console.log('[Apple Auth] signInWithIdToken successful');
                const isNewUser = data.user.created_at === data.user.last_sign_in_at;
                if (isNewUser) {
                    // Check if name is available from Apple credential
                    const name = credential.fullName
                        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
                        : undefined;

                    trackEvent('user_signed_up', { auth_method: 'apple' });
                    identifyUser(data.user.id, { email: data.user.email, name });
                    notifySlack('user_signed_up', { email: data.user.email, name, auth_method: 'apple' });
                } else {
                    trackEvent('user_signed_in', { auth_method: 'apple' });
                    identifyUser(data.user.id, { email: data.user.email });
                }
            }

            return { error: null };
        } catch (error: any) {
            console.log('[Apple Auth] Exception caught:', error.code, error.message);
            // Handle specific Apple error codes
            if (error.code === 'ERR_REQUEST_CANCELED') {
                return { error: new Error('로그인이 취소되었습니다.') };
            }
            if (error.code === 'ERR_APPLE_AUTHENTICATION_REQUEST_FAILED') {
                console.log('[Apple Auth] Request failed details:', JSON.stringify(error));
                return { error: new Error('Apple 로그인 요청이 실패했습니다. 설정을 확인해주세요.') };
            }

            return { error };
        }
    };

    const signInWithKakao = async (): Promise<{ error: any }> => {
        if (!isKakaoAvailable) {
            return { error: new Error('카카오 로그인이 설정되지 않았습니다.') };
        }

        try {
            console.log('[Kakao Login] Starting Kakao login...');
            console.log('[Kakao Login] Redirect URI:', kakaoConfig.redirectUri);

            // 카카오 인증 URL 구성
            const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoConfig.clientId}&redirect_uri=${encodeURIComponent(kakaoConfig.redirectUri)}&response_type=code&scope=${kakaoConfig.scopes.join(',')}`;

            if (Platform.OS === 'web') {
                // 웹: 페이지 리다이렉트 방식
                window.location.href = authUrl;
                return { error: null };
            }

            // iOS/Android: 인앱 브라우저(ASWebAuthenticationSession)로 카카오 인증
            // 흐름: 카카오 인증 → gopolaris.app/kakao-callback (웹에서 토큰 교환)
            //      → polaris://auth-callback (토큰과 함께 앱으로 복귀)
            // openAuthSessionAsync는 polaris:// 스킴을 감지하면 브라우저 닫고 URL 반환
            console.log('[Kakao Login] Opening in-app browser for auth...');
            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                'polaris://auth-callback'  // 웹 페이지가 최종적으로 리다이렉트하는 URL
            );

            if (result.type !== 'success' || !result.url) {
                if (result.type === 'cancel') {
                    return { error: new Error('로그인이 취소되었습니다.') };
                }
                return { error: new Error('카카오 인증에 실패했습니다.') };
            }

            console.log('[Kakao Login] Got result URL:', result.url);
            const url = new URL(result.url);

            // Case 1: 웹 페이지에서 이미 로그인 완료 후 토큰과 함께 앱으로 리다이렉트된 경우
            // URL: polaris://auth-callback?access_token=...&refresh_token=...
            const accessToken = url.searchParams.get('access_token');
            const refreshToken = url.searchParams.get('refresh_token');
            if (accessToken && refreshToken) {
                console.log('[Kakao Login] Got tokens from web callback, setting session...');
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.log('[Kakao Login] Session restore error:', error.message);
                    return { error };
                }

                if (data.user) {
                    console.log('[Kakao Login] Session restored for user:', data.user.id);
                    trackEvent('user_signed_in', { auth_method: 'kakao' });
                    identifyUser(data.user.id, { email: data.user.email });
                }
                return { error: null };
            }

            // Case 2: 카카오에서 바로 앱으로 리다이렉트된 경우 (code 포함)
            // URL: https://gopolaris.app/kakao-callback?code=...
            const code = url.searchParams.get('code');
            if (!code) {
                // 웹 콜백에서 에러가 발생했거나 토큰/코드가 없는 경우
                const errorMsg = url.searchParams.get('error_description')
                    || url.searchParams.get('error')
                    || '카카오 로그인 처리 중 오류가 발생했습니다.';
                console.log('[Kakao Login] No code or tokens found in URL:', result.url);
                return { error: new Error(errorMsg) };
            }

            console.log('[Kakao Login] Got auth code, exchanging for tokens...');

            // 앱에서 직접 토큰 교환
            const tokens = await exchangeKakaoCodeForTokens(code, kakaoConfig.redirectUri);
            console.log('[Kakao Login] Got tokens, fetching user info...');

            const kakaoUser = await getKakaoUserInfo(tokens.access_token);
            console.log('[Kakao Login] Got user info, kakao_id:', kakaoUser.id);

            const email = kakaoUser.kakao_account?.email;
            if (!email) {
                return { error: new Error('이메일 정보를 가져올 수 없습니다. 카카오 계정에 이메일이 등록되어 있는지 확인해주세요.') };
            }

            // Supabase 로그인 시도
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: `kakao_${kakaoUser.id}`,
            });

            if (signInError) {
                console.log('[Kakao Login] Sign in failed, attempting sign up...');
                // 신규 회원가입
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password: `kakao_${kakaoUser.id}`,
                    options: {
                        data: {
                            name: kakaoUser.kakao_account?.profile?.nickname || email.split('@')[0],
                            kakao_id: kakaoUser.id.toString(),
                        },
                    },
                });

                if (signUpError) {
                    console.log('[Kakao Login] Sign up error:', signUpError.message);
                    return { error: signUpError };
                }

                if (signUpData.user) {
                    console.log('[Kakao Login] Sign up successful');
                    trackEvent('user_signed_up', { auth_method: 'kakao' });
                    identifyUser(signUpData.user.id, { email, name: kakaoUser.kakao_account?.profile?.nickname });
                    notifySlack('user_signed_up', { email, name: kakaoUser.kakao_account?.profile?.nickname, auth_method: 'kakao' });
                }
            } else {
                console.log('[Kakao Login] Sign in successful');
                trackEvent('user_signed_in', { auth_method: 'kakao' });
            }

            return { error: null };
        } catch (error) {
            console.log('[Kakao Login] Error:', error);
            return { error };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                loading,
                isDemoMode,
                isKakaoAvailable,
                isAppleAvailable,
                signUp,
                signIn,
                signInWithKakao,
                signInWithApple: signInWithAppleAuth,
                signOut,
                deleteAccount,
                enterDemoMode,
                exitDemoMode,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
