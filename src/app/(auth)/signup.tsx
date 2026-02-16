import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        onConfirm?.();
    } else {
        if (onConfirm) {
            Alert.alert(title, message, [{ text: "확인", onPress: onConfirm }]);
        } else {
            Alert.alert(title, message);
        }
    }
};

export default function SignupScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();

    const formatPhoneNumber = (text: string) => {
        // Remove all non-digit characters
        const cleaned = text.replace(/\D/g, '');

        // Format as 010-1234-5678
        if (cleaned.length <= 3) {
            return cleaned;
        } else if (cleaned.length <= 7) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
        } else {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
        }
    };

    const handlePhoneChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        setPhone(formatted);
    };

    const isValidPhoneNumber = (phone: string) => {
        // Check format: 010-1234-5678
        const phoneRegex = /^010-\d{4}-\d{4}$/;
        return phoneRegex.test(phone);
    };

    const handleSignup = async () => {
        const missingFields: string[] = [];
        if (!name.trim()) missingFields.push("이름");
        if (!email.trim()) missingFields.push("이메일");
        if (!phone.trim()) missingFields.push("휴대전화번호");
        if (!password) missingFields.push("비밀번호");
        if (!confirmPassword) missingFields.push("비밀번호 확인");

        if (missingFields.length > 0) {
            showAlert("오류", `다음 항목을 입력해주세요:\n${missingFields.join(", ")}`);
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            showAlert("오류", "휴대전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
            return;
        }

        if (password !== confirmPassword) {
            showAlert("오류", "비밀번호가 일치하지 않습니다.");
            return;
        }

        if (password.length < 6) {
            showAlert("오류", "비밀번호는 최소 6자 이상이어야 합니다.");
            return;
        }

        setLoading(true);
        const { error } = await signUp(email, password, name, phone);
        setLoading(false);

        if (error) {
            showAlert("회원가입 실패", error.message);
        } else {
            showAlert(
                "회원가입 성공",
                "이메일을 확인하여 계정을 인증해주세요.",
                () => router.replace("/(auth)/login")
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>이메일로 회원가입</Text>
                    <Text style={styles.subtitle}>Polaris와 함께 시작하세요</Text>
                </View>

                <View style={styles.form}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.push('/(tabs)/profile')}
                    >
                        <Text style={styles.backButtonText}>← 돌아가기</Text>
                    </Pressable>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>이름</Text>
                            <Text style={styles.required}>*</Text>
                        </View>
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
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>이메일</Text>
                            <Text style={styles.required}>*</Text>
                        </View>
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
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>휴대전화번호</Text>
                            <Text style={styles.required}>*</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="010-1234-5678"
                            placeholderTextColor={Colors.textMuted}
                            value={phone}
                            onChangeText={handlePhoneChange}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                            maxLength={13}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>비밀번호</Text>
                            <Text style={styles.required}>*</Text>
                        </View>
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
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>비밀번호 확인</Text>
                            <Text style={styles.required}>*</Text>
                        </View>
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
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    required: {
        color: '#ef4444',
        fontSize: FontSizes.sm,
        fontWeight: '600',
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
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: Spacing.lg,
    },
    backButtonText: {
        fontSize: FontSizes.base,
        color: Colors.accent,
        fontWeight: '600',
    },
});
