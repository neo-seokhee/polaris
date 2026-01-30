import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import {
    isKakaoConfigured,
    getKakaoAuthRequestConfig,
    getKakaoDiscovery,
    exchangeKakaoCodeForTokens,
    getKakaoUserInfo,
} from '@/lib/kakaoOAuth';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isDemoMode: boolean;
    isKakaoAvailable: boolean;
    signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signInWithKakao: () => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    enterDemoMode: () => void;
    exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(true);
    const isKakaoAvailable = isKakaoConfigured();

    const enterDemoMode = () => setIsDemoMode(true);
    const exitDemoMode = () => setIsDemoMode(false);

    // Kakao OAuth setup
    const kakaoConfig = getKakaoAuthRequestConfig();
    const kakaoDiscovery = getKakaoDiscovery();
    const [kakaoRequest, kakaoResponse, kakaoPromptAsync] = AuthSession.useAuthRequest(
        {
            clientId: kakaoConfig.clientId,
            redirectUri: kakaoConfig.redirectUri,
            scopes: kakaoConfig.scopes,
            responseType: AuthSession.ResponseType.Code,
        },
        kakaoDiscovery
    );

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
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

    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                },
            },
        });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const signInWithKakao = async (): Promise<{ error: any }> => {
        if (!isKakaoAvailable) {
            return { error: new Error('카카오 로그인이 설정되지 않았습니다.') };
        }

        try {
            // 개발용: Redirect URI를 Alert로 표시 (나중에 제거)
            if (__DEV__) {
                console.log('[Kakao Login] Redirect URI:', kakaoConfig.redirectUri);
            }

            const result = await kakaoPromptAsync();
            console.log('[Kakao Login] Auth result type:', result.type);

            if (result.type === 'cancel') {
                return { error: new Error('로그인이 취소되었습니다.') };
            }

            if (result.type !== 'success' || !result.params.code) {
                console.log('[Kakao Login] Auth failed:', result);
                return { error: new Error('카카오 인증에 실패했습니다.') };
            }

            console.log('[Kakao Login] Got authorization code, exchanging for tokens...');

            // Exchange code for tokens
            const tokens = await exchangeKakaoCodeForTokens(
                result.params.code,
                kakaoConfig.redirectUri
            );

            // Get user info from Kakao
            const kakaoUser = await getKakaoUserInfo(tokens.access_token);
            const email = kakaoUser.kakao_account?.email;
            const nickname = kakaoUser.kakao_account?.profile?.nickname;

            if (!email) {
                return { error: new Error('이메일 정보를 가져올 수 없습니다. 카카오 계정에서 이메일 제공에 동의해주세요.') };
            }

            // Sign in or sign up with Supabase using the Kakao email
            // First try to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: `kakao_${kakaoUser.id}`, // Use Kakao ID as password
            });

            if (signInError) {
                // If sign in fails, try to sign up
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password: `kakao_${kakaoUser.id}`,
                    options: {
                        data: {
                            name: nickname || email.split('@')[0],
                            kakao_id: kakaoUser.id.toString(),
                            avatar_url: kakaoUser.kakao_account?.profile?.profile_image_url,
                        },
                    },
                });

                if (signUpError) {
                    return { error: signUpError };
                }
            }

            return { error: null };
        } catch (error) {
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
                signUp,
                signIn,
                signInWithKakao,
                signOut,
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
