import { View, Text, StyleSheet, Pressable, Modal, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ChevronRight, Trash2, Bell } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";

interface SettingItemProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    danger?: boolean;
}

function SettingItem({ icon, label, onPress, danger }: SettingItemProps) {
    return (
        <Pressable style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingItemLeft}>
                {icon}
                <Text style={[styles.settingItemLabel, danger && styles.dangerText]}>{label}</Text>
            </View>
            <ChevronRight size={18} color={danger ? "#ef4444" : Colors.textMuted} />
        </Pressable>
    );
}

export default function SettingsScreen() {
    useScreenTracking('screen_settings');
    const { user, isDemoMode, deleteAccount } = useAuth();
    const { track } = useAnalytics();
    const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [showDebug, setShowDebug] = useState(false);

    // Debug: log auth state
    useEffect(() => {
        console.log('[Settings] Auth state - user:', user?.id, 'isDemoMode:', isDemoMode);
        // Also check supabase session directly
        supabase.auth.getSession().then(({ data }) => {
            console.log('[Settings] Supabase session:', data.session?.user?.id);
        });
    }, [user, isDemoMode]);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleDeleteAccount = async () => {
        console.log('[Settings] handleDeleteAccount called');
        console.log('[Settings] User:', user?.id);
        setDeleteLoading(true);
        console.log('[Settings] Calling deleteAccount from AuthContext...');
        const { error } = await deleteAccount();
        console.log('[Settings] deleteAccount returned, error:', error);
        setDeleteLoading(false);
        setDeleteAccountModalVisible(false);

        if (error) {
            track('account_delete_failed');
            console.log('[Settings] Showing error alert:', error.message);
            showAlert('계정 삭제 실패', error.message);
        } else {
            track('account_delete_completed');
            console.log('[Settings] Success, redirecting to login...');
            router.replace('/(auth)/login');
        }
    };

    const handleTitlePress = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (newCount >= 5) {
            setShowDebug(!showDebug);
            setClickCount(0);
        }
    };

    const testEdgeFunction = async () => {
        console.log('[Test] Starting Edge Function test...');

        try {
            // Test 1: Simple test function
            console.log('[Test] Calling test-function...');
            const { data: testData, error: testError } = await supabase.functions.invoke('test-function');

            if (testError) {
                console.log('[Test] test-function ERROR:', testError);
                showAlert('Test Function 실패', JSON.stringify(testError));
                return;
            }

            console.log('[Test] test-function SUCCESS:', testData);

            // Test 2: Delete account function (with auth)
            console.log('[Test] Calling delete-account...');
            const { data: sessionData } = await supabase.auth.getSession();

            if (!sessionData.session) {
                showAlert('테스트 결과', 'test-function 성공!\n\ndelete-account는 로그인 필요');
                return;
            }

            const { data: deleteData, error: deleteError } = await supabase.functions.invoke('delete-account', {
                headers: {
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                },
            });

            console.log('[Test] delete-account result:', deleteData, deleteError);

            if (deleteError) {
                showAlert('Delete Function 결과', `test-function: ✅\ndelete-account: ❌\n\n${JSON.stringify(deleteError)}`);
            } else {
                showAlert('모든 테스트 성공!', 'test-function: ✅\ndelete-account: ✅\n\n⚠️ 계정이 삭제되었습니다!');
            }
        } catch (e: any) {
            console.log('[Test] Exception:', e);
            showAlert('테스트 오류', e.message || 'Unknown error');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </Pressable>
                <Pressable onPress={handleTitlePress}>
                    <Text style={styles.headerTitle}>폴라리스</Text>
                </Pressable>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* 설정 목록 */}
            <View style={styles.content}>
                {/* 디버그 섹션 (비밀 모드) */}
                {showDebug && user && !isDemoMode && (
                    <View style={styles.debugSection}>
                        <Text style={styles.debugTitle}>로그인 정보 (테스트용)</Text>
                        <Text style={styles.debugText}>이메일: {user.email}</Text>
                        <Text style={styles.debugText}>
                            로그인 방식: {user.user_metadata?.kakao_id ? '카카오' : user.user_metadata?.apple_user_id ? 'Apple' : '이메일'}
                        </Text>
                        {user.user_metadata?.kakao_id && (
                            <Text style={styles.debugText}>카카오 ID: {user.user_metadata.kakao_id}</Text>
                        )}
                        <Text style={styles.debugText}>이름: {user.user_metadata?.name || '없음'}</Text>
                        <Text style={styles.debugText}>User ID: {user.id.substring(0, 8)}...</Text>

                        <Pressable
                            style={styles.testButton}
                            onPress={testEdgeFunction}
                        >
                            <Text style={styles.testButtonText}>🧪 Edge Function 테스트</Text>
                        </Pressable>
                    </View>
                )}

                {!isDemoMode && user && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>알림</Text>
                        <View style={styles.sectionContent}>
                            <SettingItem
                                icon={<Bell size={20} color={Colors.textMuted} />}
                                label="알림 설정"
                                onPress={() => {
                                    track('settings_notifications_clicked');
                                    showAlert('준비중', '알림 기능은 준비중입니다.');
                                }}
                            />
                        </View>
                    </View>
                )}

                {/* 계정 섹션 */}
                {!isDemoMode && user && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>계정</Text>
                        <View style={styles.sectionContent}>
                            <SettingItem
                                icon={<Trash2 size={20} color="#ef4444" />}
                                label="계정 삭제"
                                onPress={() => {
                                    track('account_delete_modal_opened');
                                    console.log('[Settings] 계정 삭제 메뉴 클릭됨');
                                    setDeleteAccountModalVisible(true);
                                    console.log('[Settings] 모달 표시 설정됨');
                                }}
                                danger
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* 계정 삭제 확인 모달 */}
            <Modal
                visible={deleteAccountModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteAccountModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>계정 삭제</Text>
                        <Text style={styles.modalWarning}>
                            ⚠️ 경고: 이 작업은 되돌릴 수 없습니다.
                        </Text>
                        <Text style={styles.modalDescription}>
                            계정을 삭제하면 모든 데이터(목표, 일정, 메모, 할 일)가 영구적으로 삭제됩니다.{'\n\n'}
                            정말로 계정을 삭제하시겠습니까?
                        </Text>
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={styles.modalCancelButton}
                                onPress={() => {
                                    track('account_delete_cancelled');
                                    setDeleteAccountModalVisible(false);
                                }}
                                disabled={deleteLoading}
                            >
                                <Text style={styles.modalCancelButtonText}>취소</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalDeleteButton, deleteLoading && styles.buttonDisabled]}
                                onPress={() => {
                                    track('account_delete_confirmed');
                                    console.log('[Settings] 모달 삭제 버튼 클릭됨');
                                    handleDeleteAccount();
                                }}
                                disabled={deleteLoading}
                            >
                                <Text style={styles.modalDeleteButtonText}>
                                    {deleteLoading ? '삭제 중...' : '계정 삭제'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing['2xl'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSecondary,
    },
    backButton: {
        padding: Spacing.sm,
    },
    headerTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    headerPlaceholder: {
        width: 32,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['3xl'],
    },
    section: {
        marginBottom: Spacing['3xl'],
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm,
    },
    sectionContent: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['2xl'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSecondary,
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2xl'],
    },
    settingItemLabel: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    dangerText: {
        color: '#ef4444',
    },
    // 모달 스타일
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing['3xl'],
    },
    modalContent: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing['3xl'],
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    modalWarning: {
        fontSize: FontSizes.base,
        color: '#ef4444',
        fontWeight: '600',
        marginBottom: Spacing['2xl'],
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: FontSizes.base,
        color: Colors.textSecondary,
        lineHeight: 24,
        marginBottom: Spacing['3xl'],
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing['2xl'],
        alignItems: 'center',
    },
    modalCancelButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    modalDeleteButton: {
        flex: 1,
        backgroundColor: '#ef4444',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing['2xl'],
        alignItems: 'center',
    },
    modalDeleteButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    // 디버그 섹션
    debugSection: {
        backgroundColor: '#1a1a2e',
        borderRadius: BorderRadius.xl,
        padding: Spacing['2xl'],
        borderWidth: 1,
        borderColor: '#4a4a6a',
        marginBottom: Spacing['3xl'],
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
    testButton: {
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing['2xl'],
        marginTop: Spacing.lg,
        alignItems: 'center',
    },
    testButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
