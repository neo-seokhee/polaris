import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

export default function SignupScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [kakaoLoading, setKakaoLoading] = useState(false);
    const { signUp, signInWithKakao, isKakaoAvailable } = useAuth();

    const handleKakaoSignup = async () => {
        setKakaoLoading(true);
        const { error } = await signInWithKakao();
        setKakaoLoading(false);

        if (error) {
            if (error.message !== '로그인이 취소되었습니다.') {
                Alert.alert("카카오 회원가입 실패", error.message);
            }
        } else {
            router.replace("/(tabs)");
        }
    };

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert("오류", "모든 필드를 입력해주세요.");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("오류", "비밀번호가 일치하지 않습니다.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("오류", "비밀번호는 최소 6자 이상이어야 합니다.");
            return;
        }

        setLoading(true);
        const { error } = await signUp(email, password, name);
        setLoading(false);

        if (error) {
            Alert.alert("회원가입 실패", error.message);
        } else {
            Alert.alert(
                "회원가입 성공",
                "이메일을 확인하여 계정을 인증해주세요.",
                [{ text: "확인", onPress: () => router.replace("/(auth)/login") }]
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>회원가입</Text>
                    <Text style={styles.subtitle}>Polaris와 함께 시작하세요</Text>
                </View>

                <View style={styles.form}>
                    <Pressable
                        style={[
                            styles.kakaoButton,
                            (!isKakaoAvailable || kakaoLoading) && styles.kakaoButtonDisabled,
                        ]}
                        onPress={handleKakaoSignup}
                        disabled={!isKakaoAvailable || kakaoLoading}
                    >
                        <Text style={styles.kakaoButtonText}>
                            {kakaoLoading ? "가입 중..." : isKakaoAvailable ? "카카오로 시작하기" : "카카오 회원가입 (준비중)"}
                        </Text>
                    </Pressable>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>또는</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="이름을 입력하세요"
                            placeholderTextColor={Colors.textMuted}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

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
                            placeholder="비밀번호를 입력하세요 (최소 6자)"
                            placeholderTextColor={Colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>비밀번호 확인</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="비밀번호를 다시 입력하세요"
                            placeholderTextColor={Colors.textMuted}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                    </View>

                    <Pressable
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? "가입 중..." : "회원가입"}
                        </Text>
                    </Pressable>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
                        <Link href="/(auth)/login" asChild>
                            <Pressable>
                                <Text style={styles.link}>로그인</Text>
                            </Pressable>
                        </Link>
                    </View>
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
        marginBottom: Spacing['4xl'],
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    subtitle: {
        fontSize: FontSizes.base,
        color: Colors.textSecondary,
    },
    form: {
        gap: Spacing['2xl'],
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
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
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
});
