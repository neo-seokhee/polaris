import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform, ScrollView, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getKakaoAuthRequestConfig } from "@/lib/kakaoOAuth";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import { KakaoIcon, AppleIcon } from "@/components/SocialIcons";
import { ChevronDown, ChevronUp } from "lucide-react-native";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [kakaoLoading, setKakaoLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [showEmailLogin, setShowEmailLogin] = useState(false);
    const { signIn, signInWithKakao, signInWithApple, isKakaoAvailable, isAppleAvailable, enterDemoMode } = useAuth();

    // Redirect URI 미리 계산
    const kakaoRedirectUri = getKakaoAuthRequestConfig().redirectUri;

    const handleDemoMode = () => {
        enterDemoMode();
        router.replace("/(tabs)");
    };

    const handleKakaoLogin = async () => {
        setKakaoLoading(true);
        const { error } = await signInWithKakao();
        setKakaoLoading(false);

        if (error) {
            if (error.message !== '로그인이 취소됐어요.') {
                Alert.alert("로그인 안내", "카카오 로그인 중 문제가 생겼어요. 다시 시도해주세요.");
            }
        } else {
            router.replace("/(tabs)");
        }
    };

    const handleAppleLogin = async () => {
        setAppleLoading(true);
        const { error } = await signInWithApple();
        setAppleLoading(false);

        if (error) {
            if (error.message !== '로그인이 취소됐어요.') {
                Alert.alert("로그인 안내", "Apple 로그인 중 문제가 생겼어요. 다시 시도해주세요.");
            }
        } else {
            router.replace("/(tabs)");
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("입력 확인", "이메일과 비밀번호를 모두 입력해주세요.");
            return;
        }

        setLoading(true);
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            Alert.alert("로그인 안내", "이메일 또는 비밀번호를 확인해주세요.");
        } else {
            router.replace("/(tabs)");
        }
    };

    const hasSocialLogin = isKakaoAvailable || (Platform.OS === 'ios' && isAppleAvailable);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* 브랜드 헤더 - Value First */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Polaris</Text>
                        <Text style={styles.subtitle}>당신의 목표를 향한 나침반</Text>
                    </View>

                    <View style={styles.form}>
                        {/* 소셜 로그인 우선 배치 - Easy to Answer */}
                        {isKakaoAvailable && (
                            <Pressable
                                style={[styles.kakaoButton, kakaoLoading && styles.buttonDisabled]}
                                onPress={handleKakaoLogin}
                                disabled={kakaoLoading}
                            >
                                <View style={styles.socialButtonContent}>
                                    <KakaoIcon size={18} color="#191919" />
                                    <Text style={styles.kakaoButtonText}>
                                        {kakaoLoading ? "로그인 중..." : "카카오로 시작하기"}
                                    </Text>
                                </View>
                            </Pressable>
                        )}

                        {Platform.OS === 'ios' && isAppleAvailable && (
                            <Pressable
                                style={[styles.appleButton, appleLoading && styles.buttonDisabled]}
                                onPress={handleAppleLogin}
                                disabled={appleLoading}
                            >
                                <View style={styles.socialButtonContent}>
                                    <AppleIcon size={18} color="#FFFFFF" />
                                    <Text style={styles.appleButtonText}>
                                        {appleLoading ? "로그인 중..." : "Apple로 시작하기"}
                                    </Text>
                                </View>
                            </Pressable>
                        )}

                        {/* 구분선 */}
                        {hasSocialLogin && (
                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>또는</Text>
                                <View style={styles.dividerLine} />
                            </View>
                        )}

                        {/* 이메일 로그인 - 접이식 */}
                        <Pressable
                            style={styles.emailToggle}
                            onPress={() => setShowEmailLogin(!showEmailLogin)}
                        >
                            <Text style={styles.emailToggleText}>이메일로 로그인</Text>
                            {showEmailLogin
                                ? <ChevronUp size={16} color={Colors.textMuted} />
                                : <ChevronDown size={16} color={Colors.textMuted} />
                            }
                        </Pressable>

                        {showEmailLogin && (
                            <View style={styles.emailSection}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="이메일"
                                    placeholderTextColor={Colors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="비밀번호"
                                    placeholderTextColor={Colors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                                <Pressable
                                    style={[styles.button, loading && styles.buttonDisabled]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                >
                                    <Text style={styles.buttonText}>
                                        {loading ? "로그인 중..." : "로그인"}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {/* 회원가입 링크 */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>처음이신가요? </Text>
                            <Link href="/(auth)/signup" asChild>
                                <Pressable hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.link}>회원가입</Text>
                                </Pressable>
                            </Link>
                        </View>

                        {/* 둘러보기 - 더 눈에 띄게 */}
                        <Pressable style={styles.demoButton} onPress={handleDemoMode}>
                            <Text style={styles.demoButtonText}>먼저 둘러볼게요</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing['4xl'],
        paddingVertical: Spacing['4xl'],
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing['4xl'] * 2,
    },
    title: {
        fontSize: 48,
        fontWeight: '700',
        color: Colors.accent,
        marginBottom: Spacing.lg,
    },
    subtitle: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        letterSpacing: 0.3,
    },
    form: {
        gap: Spacing['2xl'],
    },
    // 소셜 버튼 - 큰 터치 타겟
    kakaoButton: {
        backgroundColor: '#FEE500',
        borderRadius: BorderRadius['2xl'],
        paddingVertical: Spacing['2xl'] + 2,
        alignItems: 'center',
    },
    socialButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    kakaoButtonText: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: '#191919',
    },
    appleButton: {
        backgroundColor: '#000000',
        borderRadius: BorderRadius['2xl'],
        paddingVertical: Spacing['2xl'] + 2,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
    },
    appleButtonText: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    // 구분선
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2xl'],
        paddingVertical: Spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.borderPrimary,
    },
    dividerText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    // 이메일 토글
    emailToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
    },
    emailToggleText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
    },
    emailSection: {
        gap: Spacing['2xl'],
    },
    input: {
        backgroundColor: Colors.bgSecondary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        borderRadius: BorderRadius['2xl'],
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing['2xl'],
        fontSize: FontSizes.lg,
        color: Colors.textPrimary,
    },
    button: {
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius['2xl'],
        paddingVertical: Spacing['2xl'] + 2,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    footerText: {
        fontSize: FontSizes.base,
        color: Colors.textSecondary,
    },
    link: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.accent,
    },
    demoButton: {
        alignItems: 'center',
        paddingVertical: Spacing['2xl'],
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        borderColor: Colors.borderSecondary,
    },
    demoButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
});
