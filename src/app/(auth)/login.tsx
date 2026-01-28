import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getKakaoAuthRequestConfig } from "@/lib/kakaoOAuth";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [kakaoLoading, setKakaoLoading] = useState(false);
    const { signIn, signInWithKakao, isKakaoAvailable, enterDemoMode } = useAuth();

    const handleDemoMode = () => {
        enterDemoMode();
        router.replace("/(tabs)");
    };

    const handleKakaoLogin = async () => {
        setKakaoLoading(true);
        const { error } = await signInWithKakao();
        setKakaoLoading(false);

        if (error) {
            if (error.message !== '로그인이 취소되었습니다.') {
                Alert.alert("카카오 로그인 실패", error.message);
            }
        } else {
            router.replace("/(tabs)");
        }
    };

    // DEV: Redirect URI 확인용 (길게 누르면 표시)
    const showRedirectUri = () => {
        const config = getKakaoAuthRequestConfig();
        Alert.alert(
            "Kakao Redirect URI",
            config.redirectUri,
            [{ text: "확인" }]
        );
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("오류", "이메일과 비밀번호를 입력해주세요.");
            return;
        }

        setLoading(true);
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            Alert.alert("로그인 실패", error.message);
        } else {
            router.replace("/(tabs)");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Polaris</Text>
                    <Text style={styles.subtitle}>나아감으로써 힘을 얻는다</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이메일</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="이메일을 입력하세요"
                            placeholderTextColor={Colors.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>비밀번호</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="비밀번호를 입력하세요"
                            placeholderTextColor={Colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                    </View>

                    <Pressable
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? "로그인 중..." : "로그인"}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.kakaoButton,
                            (!isKakaoAvailable || kakaoLoading) && styles.kakaoButtonDisabled,
                        ]}
                        onPress={handleKakaoLogin}
                        onLongPress={showRedirectUri}
                        disabled={!isKakaoAvailable || kakaoLoading}
                    >
                        <Text style={styles.kakaoButtonText}>
                            {kakaoLoading ? "로그인 중..." : isKakaoAvailable ? "카카오로 로그인" : "카카오 로그인 (준비중)"}
                        </Text>
                    </Pressable>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>계정이 없으신가요? </Text>
                        <Link href="/(auth)/signup" asChild>
                            <Pressable>
                                <Text style={styles.link}>회원가입</Text>
                            </Pressable>
                        </Link>
                    </View>

                    <Pressable style={styles.demoLink} onPress={handleDemoMode}>
                        <Text style={styles.demoLinkText}>먼저 둘러볼게요</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    content: {
        flex: 1,
        padding: Spacing['4xl'],
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing['4xl'] * 2,
    },
    title: {
        fontSize: 48,
        fontWeight: '700',
        color: Colors.accent,
        marginBottom: Spacing.md,
    },
    subtitle: {
        fontSize: FontSizes.base,
        color: Colors.textSecondary,
    },
    form: {
        gap: Spacing['3xl'],
    },
    inputGroup: {
        gap: Spacing.md,
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    input: {
        backgroundColor: Colors.bgSecondary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    button: {
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    kakaoButton: {
        backgroundColor: '#FEE500',
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        alignItems: 'center',
    },
    kakaoButtonDisabled: {
        backgroundColor: Colors.bgTertiary,
        opacity: 0.5,
    },
    kakaoButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: '#191919',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing['2xl'],
    },
    footerText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    link: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.accent,
    },
    demoLink: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    demoLinkText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textDecorationLine: 'underline',
    },
});
