import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform, ScrollView, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import { ArrowLeft } from "lucide-react-native";

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
        const cleaned = text.replace(/\D/g, '');
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
        const phoneRegex = /^010-\d{4}-\d{4}$/;
        return phoneRegex.test(phone);
    };

    const handleSignup = async () => {
        const missingFields: string[] = [];
        if (!name.trim()) missingFields.push("이름");
        if (!email.trim()) missingFields.push("이메일");
        if (!phone.trim()) missingFields.push("전화번호");
        if (!password) missingFields.push("비밀번호");
        if (!confirmPassword) missingFields.push("비밀번호 확인");

        if (missingFields.length > 0) {
            showAlert("입력 확인", `${missingFields.join(", ")}을(를) 입력해주세요.`);
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            showAlert("전화번호 확인", "올바른 전화번호 형식으로 입력해주세요.\n예: 010-1234-5678");
            return;
        }

        if (password !== confirmPassword) {
            showAlert("비밀번호 확인", "비밀번호가 서로 달라요. 다시 확인해주세요.");
            return;
        }

        if (password.length < 6) {
            showAlert("비밀번호 확인", "비밀번호는 6자 이상으로 설정해주세요.");
            return;
        }

        setLoading(true);
        const { error } = await signUp(email, password, name, phone);
        setLoading(false);

        if (error) {
            showAlert("가입 안내", error.message);
        } else {
            showAlert(
                "가입 완료",
                "이메일로 인증 링크를 보냈어요.\n메일을 확인해주세요.",
                () => router.replace("/(auth)/login")
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* 헤더 - 뒤로가기 */}
                <View style={styles.topBar}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.back()}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* One Thing per One Page - 헤더 메시지 */}
                    <View style={styles.header}>
                        <Text style={styles.title}>반가워요!</Text>
                        <Text style={styles.subtitle}>간단한 정보만 입력하면 바로 시작할 수 있어요</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>이름</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="홍길동"
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
                                placeholder="example@email.com"
                                placeholderTextColor={Colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>전화번호</Text>
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
                            <Text style={styles.label}>비밀번호</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="6자 이상 입력해주세요"
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
                                placeholder="비밀번호를 한번 더 입력해주세요"
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
                                {loading ? "가입 중..." : "시작하기"}
                            </Text>
                        </Pressable>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
                            <Link href="/(auth)/login" asChild>
                                <Pressable hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.link}>로그인</Text>
                                </Pressable>
                            </Link>
                        </View>
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
    topBar: {
        paddingHorizontal: Spacing['3xl'],
        paddingVertical: Spacing.lg,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing['4xl'],
        paddingBottom: Spacing['4xl'],
    },
    header: {
        marginBottom: Spacing['4xl'],
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.lg,
    },
    subtitle: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    form: {
        gap: Spacing['3xl'],
    },
    inputGroup: {
        gap: Spacing.md,
    },
    label: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
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
        marginTop: Spacing.md,
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
});
