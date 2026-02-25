import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Pressable, Alert, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, type ComponentType } from "react";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { supabase } from "@/lib/supabase";
import { Settings, MessageSquare, Info, ChevronRight, LayoutGrid, Plus, Crown } from "lucide-react-native";
import { KakaoIcon, AppleIcon } from "@/components/SocialIcons";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { StatusBanners } from "@/components/StatusBanners";
import { FeedbackModal } from "@/components/FeedbackModal";
import { SHORTCUT_SLOTS } from "@/modules/featureModules";
import { MODULE_CATALOG, MODULE_CATALOG_MAP } from "@/modules/moduleCatalog";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
}

interface ModuleTileItem {
    key: string;
    label: string;
    icon: ComponentType<{ color: string; size?: number }>;
    onPress: () => void;
    status: 'active' | 'comingSoon' | 'more';
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
    useScreenTracking('screen_profile');

    const { user, signOut, signInWithKakao, signInWithApple, isKakaoAvailable, isAppleAvailable, isDemoMode, exitDemoMode } = useAuth();
    const { shortcuts, recentModules, modules: visibleModules } = useFeatureModules();
    const { canAccessModule } = useEntitlements();
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [userPhone, setUserPhone] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            supabase
                .from('users')
                .select('phone')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    setUserPhone(data?.phone || null);
                });
        }
    }, [user?.id]);

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
            if (error && error.message !== '로그인이 취소됐어요.') {
                showAlert('카카오 로그인 실패', error.message);
            }
        } else {
            router.push('/(auth)/login');
        }
    };



    const isLoggedIn = !isDemoMode && user;
    const showComingSoon = () => showAlert('준비중', '아직 준비중인 기능입니다.');

    // Build a set of visible module IDs for filtering catalog items
    const visibleModuleIds = useMemo(
        () => new Set(visibleModules.map((m) => m.id)),
        [visibleModules]
    );

    const moduleTiles = useMemo<ModuleTileItem[]>(() => {
        const shortcutKeys = SHORTCUT_SLOTS.map((slot) => shortcuts[slot]);
        const prioritizedKeys = [...shortcutKeys, ...recentModules, ...MODULE_CATALOG.map((item) => item.key)];
        const deduped: string[] = [];

        prioritizedKeys.forEach((key) => {
            if (!MODULE_CATALOG_MAP[key]) return;
            if (deduped.includes(key)) return;
            // Filter out hidden modules (not in visibleModules)
            const catalogItem = MODULE_CATALOG_MAP[key];
            if (catalogItem.moduleId && !visibleModuleIds.has(catalogItem.moduleId)) return;
            deduped.push(key);
        });

        const topNine = deduped.slice(0, 9).map((key) => {
            const item = MODULE_CATALOG_MAP[key];
            return {
                key: item.key,
                label: item.title,
                icon: item.icon,
                onPress: item.status === 'comingSoon' || !item.moduleId
                    ? showComingSoon
                    : () => router.push(`/module/${item.moduleId}`),
                status: item.status === 'comingSoon' ? 'comingSoon' : 'active',
            } satisfies ModuleTileItem;
        });

        return [
            ...topNine,
            {
                key: 'feature-more',
                label: '더보기',
                icon: Plus,
                onPress: () => router.push('/store'),
                status: 'more',
            },
        ];
    }, [shortcuts, recentModules, visibleModuleIds]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBanners />

            {/* 비로그인 상태: 로그인 버튼들 (가운데 정렬) */}
            {!isLoggedIn && (
                <View style={styles.notLoggedInContainer}>
                    <View style={styles.notLoggedInContent}>
                        <View style={styles.brandHeader}>
                            <Image
                                source={require('../../../assets/sparkle-icon.png')}
                                style={styles.brandIcon}
                            />
                            <Text style={styles.brandName}>Polaris</Text>
                        </View>
                        <Text style={styles.notLoggedInSlogan}>당신의 목표를 향한 나침반</Text>
                        <Text style={styles.notLoggedInDescription}>
                            가입하면 데이터가 안전하게 저장돼요
                        </Text>

                        {/* 카카오로 시작하기 */}
                        {isKakaoAvailable && (
                            <TouchableOpacity
                                style={styles.kakaoButtonLarge}
                                onPress={async () => {
                                    const { error } = await signInWithKakao();
                                    if (error && error.message !== '로그인이 취소됐어요.') {
                                        showAlert('로그인 안내', '카카오 로그인 중 문제가 생겼어요. 다시 시도해주세요.');
                                    }
                                }}
                            >
                                <KakaoIcon size={18} color="#191919" />
                                <Text style={styles.kakaoButtonLargeText}>카카오로 시작하기</Text>
                            </TouchableOpacity>
                        )}

                        {/* Apple로 시작하기 (iOS만) */}
                        {isAppleAvailable && (
                            <TouchableOpacity
                                style={styles.appleButtonLarge}
                                onPress={async () => {
                                    const { error } = await signInWithApple();
                                    if (error && error.message !== '로그인이 취소됐어요.') {
                                        showAlert('로그인 안내', 'Apple 로그인 중 문제가 생겼어요. 다시 시도해주세요.');
                                    }
                                }}
                            >
                                <AppleIcon size={18} color="#FFFFFF" />
                                <Text style={styles.appleButtonLargeText}>Apple로 시작하기</Text>
                            </TouchableOpacity>
                        )}

                        {/* 이메일로 시작하기 */}
                        <TouchableOpacity
                            style={styles.emailButtonLarge}
                            onPress={() => {
                                exitDemoMode();
                                router.push('/(auth)/signup');
                            }}
                        >
                            <Text style={styles.emailButtonLargeText}>이메일로 시작하기</Text>
                        </TouchableOpacity>

                        {/* 로그인 */}
                        <TouchableOpacity
                            style={styles.loginLinkButton}
                            onPress={() => {
                                exitDemoMode();
                                router.push('/(auth)/login');
                            }}
                        >
                            <Text style={styles.loginLinkText}>이미 계정이 있으신가요? 로그인</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.footerSection}>
                        <Text style={styles.footerText}>
                            Polaris(폴라리스) | 사업자명 : 더포지인더스트리(The Forge Industries)
                        </Text>
                        <Text style={styles.footerText}>
                            사업자등록번호 : 241-25-02034 | 통신판매업신고번호 : 제 2024-서울송파-1849호
                        </Text>
                    </View>
                </View>
            )}

            {/* 로그인 상태: 기존 UI */}
            {isLoggedIn && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    {/* 사용자 섹션 */}
                    <View style={styles.brandSection}>
                        <View style={styles.brandHeader}>
                            <Image
                                source={require('../../../assets/sparkle-icon.png')}
                                style={styles.brandIcon}
                            />
                            <Text style={styles.brandName}>Polaris</Text>
                        </View>

                        {/* 스토어 카드 */}
                        <Pressable
                            style={styles.planCard}
                            onPress={() => router.push('/store')}
                        >
                            <View style={styles.planCardLeft}>
                                <Crown size={18} color={Colors.accent} />
                                <Text style={styles.planCardTitle}>스토어</Text>
                            </View>
                            <View style={styles.planCardRight}>
                                <Text style={styles.planCardSubFree}>둘러보기</Text>
                                <ChevronRight size={16} color={Colors.textMuted} />
                            </View>
                        </Pressable>
                    </View>

                    {/* 기능 모듈 섹션 */}
                    <View style={styles.menuGroup}>
                        <Text style={styles.menuGroupTitle}>나의 기능</Text>
                        <View style={styles.moduleGrid}>
                            {moduleTiles.map((tile) => {
                                const Icon = tile.icon;
                                const isComingSoon = tile.status === 'comingSoon';
                                const isMore = tile.status === 'more';
                                const iconColor = isComingSoon ? Colors.textMuted : isMore ? Colors.textSecondary : Colors.accent;
                                return (
                                    <Pressable
                                        key={tile.key}
                                        style={[styles.moduleTile, isComingSoon && styles.moduleTileComingSoon]}
                                        onPress={tile.onPress}
                                    >
                                        <View style={[styles.moduleTileIconWrap, isComingSoon && styles.moduleTileIconWrapComingSoon]}>
                                            <Icon size={20} color={iconColor} />
                                        </View>
                                        <Text
                                            style={[styles.moduleTileTitle, isComingSoon && styles.moduleTileTitleComingSoon]}
                                            numberOfLines={2}
                                        >
                                            {tile.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* 앱 섹션 */}
                    <View style={styles.menuGroup}>
                        <Text style={styles.menuGroupTitle}>앱</Text>
                        <View style={styles.menuSection}>
                            <MenuItem
                                icon={<LayoutGrid size={20} color={Colors.textMuted} />}
                                label="바로가기 설정"
                                onPress={() => router.push('/shortcut-manager')}
                            />
                            <MenuItem
                                icon={<Settings size={20} color={Colors.textMuted} />}
                                label="설정"
                                onPress={() => router.push('/settings')}
                            />
                            <MenuItem
                                icon={<MessageSquare size={20} color={Colors.textMuted} />}
                                label="의견 보내기"
                                onPress={() => setFeedbackModalVisible(true)}
                            />
                            <MenuItem
                                icon={<Info size={20} color={Colors.textMuted} />}
                                label="약관 및 개인정보 처리방침"
                                onPress={() => Linking.openURL('https://www.notion.so/neolee/Polaris-2f86e247b03580499a70fb4edff6382d')}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={() => signOut()}
                        >
                            <Text style={styles.logoutButtonText}>로그아웃</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 사업자 정보 푸터 */}
                    <View style={styles.footerSection}>
                        <Text style={styles.footerText}>
                            Polaris(폴라리스) | 사업자명 : 더포지인더스트리(The Forge Industries)
                        </Text>
                        <Text style={styles.footerText}>
                            사업자등록번호 : 241-25-02034 | 통신판매업신고번호 : 제 2024-서울송파-1849호
                        </Text>
                    </View>
                </ScrollView>
            )}

            <FeedbackModal
                visible={feedbackModalVisible}
                onClose={() => setFeedbackModalVisible(false)}
                userEmail={user?.email}
                userPhone={userPhone}
            />


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
    // brandSlogan removed - simplified brand section
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
    secondaryButton: {
        paddingVertical: Spacing.lg,
    },
    secondaryButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textDecorationLine: 'underline',
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
    menuGroup: {
        gap: Spacing.md,
    },
    menuGroupTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        fontWeight: '600',
        paddingHorizontal: Spacing.sm,
    },
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
    moduleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    moduleTile: {
        width: '22.5%',
        aspectRatio: 0.9,
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        borderColor: Colors.borderSecondary,
        paddingVertical: Spacing.xs,
        paddingHorizontal: 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    moduleTileComingSoon: {
        backgroundColor: Colors.bgCard,
        borderColor: Colors.bgMuted,
    },
    moduleTileIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Colors.bgCard,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moduleTileIconWrapComingSoon: {
        backgroundColor: Colors.bgMuted,
    },
    moduleTileTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
        fontWeight: '600',
        textAlign: 'center',
    },
    moduleTileTitleComingSoon: {
        color: Colors.textMuted,
    },
    // 디버그 섹션
    debugSection: {
        backgroundColor: '#1a1a2e',
        borderRadius: BorderRadius.xl,
        padding: Spacing['2xl'],
        borderWidth: 1,
        borderColor: '#4a4a6a',
    },
    debugTitle: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: '#8b8bab',
        marginBottom: Spacing.lg,
    },
    debugText: {
        fontSize: FontSizes.xs,
        color: '#6b6b8b',
        marginBottom: Spacing.sm,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    // 푸터 섹션
    footerSection: {
        alignItems: 'center',
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing.lg,
    },
    footerText: {
        fontSize: 10,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 16,
    },
    // 비로그인 상태 스타일
    notLoggedInContainer: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing['3xl'],
        paddingVertical: Spacing['4xl'],
    },
    notLoggedInContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: 300,
    },
    notLoggedInSlogan: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    notLoggedInDescription: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: Spacing['3xl'],
    },
    kakaoButtonLarge: {
        width: '100%',
        flexDirection: 'row',
        backgroundColor: Colors.kakaoYellow,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    kakaoButtonLargeText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.kakaoBrown,
    },
    appleButtonLarge: {
        width: '100%',
        flexDirection: 'row',
        backgroundColor: '#000000',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    appleButtonLargeText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    emailButtonLarge: {
        width: '100%',
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing['2xl'],
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderSecondary,
        marginBottom: Spacing.lg,
    },
    emailButtonLargeText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    loginLinkButton: {
        paddingVertical: Spacing.lg,
    },
    loginLinkText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textDecorationLine: 'underline',
    },
    planCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius['2xl'],
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['2xl'],
        width: '100%',
    },
    planCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    planCardTitle: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    planCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    planCardSubFree: {
        fontSize: FontSizes.sm,
        color: Colors.accent,
    },
    logoutButton: {
        alignItems: 'center',
        paddingVertical: Spacing['2xl'],
        marginTop: Spacing['2xl'],
    },
    logoutButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
});
