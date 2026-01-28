import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Pressable, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, Bell, MessageSquare, Info, ChevronRight, Sparkles } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { DemoBanner } from "@/components/DemoBanner";

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
}

function MenuItem({ icon, label, onPress }: MenuItemProps) {
    return (
        <Pressable style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuItemLeft}>
                {icon}
                <Text style={styles.menuItemLabel}>{label}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
    );
}

export default function ProfileScreen() {
    const { user, signOut, signInWithKakao, isKakaoAvailable, isDemoMode, exitDemoMode } = useAuth();

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleAuthAction = async () => {
        if (isDemoMode) {
            exitDemoMode();
            router.push('/(auth)/signup');
        } else if (user) {
            signOut();
        } else if (isKakaoAvailable) {
            const { error } = await signInWithKakao();
            if (error && error.message !== '로그인이 취소되었습니다.') {
                showAlert('카카오 로그인 실패', error.message);
            }
        } else {
            router.push('/(auth)/login');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <DemoBanner />
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* 앱 브랜딩 섹션 */}
                <View style={styles.brandSection}>
                    <View style={styles.brandHeader}>
                        <Image
                            source={require('../../../assets/sparkle-icon.png')}
                            style={styles.brandIcon}
                        />
                        <Text style={styles.brandName}>Polaris</Text>
                    </View>
                    {isDemoMode ? (
                        <>
                            <View style={styles.demoModeIndicator}>
                                <Sparkles size={14} color={Colors.accent} />
                                <Text style={styles.demoModeText}>체험 모드</Text>
                            </View>
                            <Text style={styles.brandSlogan}>회원가입하면 데이터가 저장돼요</Text>
                        </>
                    ) : (
                        <Text style={styles.brandSlogan}>당신의 목표를 향한 나침반</Text>
                    )}
                    <TouchableOpacity
                        style={[
                            styles.kakaoButton,
                            isDemoMode && styles.signupButton,
                            (!isDemoMode && !user && !isKakaoAvailable) && styles.loginButton,
                        ]}
                        onPress={handleAuthAction}
                    >
                        {!isDemoMode && user === null && isKakaoAvailable && <View style={styles.kakaoIcon} />}
                        <Text style={[
                            styles.kakaoButtonText,
                            (!isDemoMode && !user && !isKakaoAvailable) && styles.loginButtonText,
                        ]}>
                            {isDemoMode
                                ? '무료로 시작하기'
                                : user
                                    ? '로그아웃'
                                    : isKakaoAvailable
                                        ? '카카오로 회원가입 / 로그인'
                                        : '로그인'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 메뉴 섹션 */}
                <View style={styles.menuSection}>
                    <MenuItem
                        icon={<Settings size={20} color={Colors.textMuted} />}
                        label="설정"
                        onPress={() => showAlert('준비중', '설정 기능은 준비중입니다.')}
                    />
                    <MenuItem
                        icon={<Bell size={20} color={Colors.textMuted} />}
                        label="알림"
                        onPress={() => showAlert('준비중', '알림 기능은 준비중입니다.')}
                    />
                    <MenuItem
                        icon={<MessageSquare size={20} color={Colors.textMuted} />}
                        label="의견 보내기"
                        onPress={() => showAlert('준비중', '의견 보내기 기능은 준비중입니다.')}
                    />
                    <MenuItem
                        icon={<Info size={20} color={Colors.textMuted} />}
                        label="이용약관 및 개인정보처리방침"
                        onPress={() => showAlert('준비중', '이용약관 페이지는 준비중입니다.')}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['4xl'],
        gap: Spacing['3xl'],
    },
    // 브랜딩 섹션
    brandSection: {
        alignItems: 'center',
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        paddingVertical: Spacing['4xl'],
        paddingHorizontal: Spacing['3xl'],
        gap: Spacing.lg,
    },
    brandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    brandIcon: {
        width: 28,
        height: 28,
    },
    brandName: {
        fontSize: FontSizes['4xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    brandSlogan: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
    },
    kakaoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.kakaoYellow,
        borderRadius: BorderRadius['4xl'],
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['4xl'],
        marginTop: Spacing.lg,
        gap: Spacing.md,
        width: '100%',
    },
    kakaoIcon: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.kakaoBrown,
    },
    kakaoButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    signupButton: {
        backgroundColor: Colors.accent,
    },
    loginButton: {
        backgroundColor: Colors.accent,
    },
    loginButtonText: {
        color: Colors.textOnDark,
    },
    demoModeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.accentBg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.full,
    },
    demoModeText: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.accent,
    },
    // 메뉴 섹션
    menuSection: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['2xl'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSecondary,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2xl'],
    },
    menuItemLabel: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
});
