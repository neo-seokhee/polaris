import { View, Text, StyleSheet, Modal, ScrollView, Switch, Alert, Platform, ActivityIndicator } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, RefreshCw, LogOut, Calendar } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { CalendarWithEnabled } from "@/hooks/useGoogleCalendar";

interface GoogleCalendarSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    isConnected: boolean;
    email: string | null;
    calendars: CalendarWithEnabled[];
    isSyncing: boolean;
    onConnect: () => Promise<{ error: string | null }>;
    onDisconnect: () => Promise<void>;
    onToggleCalendar: (calendarId: string) => Promise<void>;
    onSync: () => Promise<any>;
}

export function GoogleCalendarSettingsModal({
    visible,
    onClose,
    isConnected,
    email,
    calendars,
    isSyncing,
    onConnect,
    onDisconnect,
    onToggleCalendar,
    onSync,
}: GoogleCalendarSettingsModalProps) {
    const handleConnect = async () => {
        const result = await onConnect();
        if (result.error) {
            Alert.alert('연결 실패', result.error);
        }
    };

    const handleDisconnect = () => {
        const confirmDisconnect = () => {
            onDisconnect();
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Google Calendar 연결을 해제할까요?\n\n모든 캘린더 데이터가 삭제됩니다.')) {
                confirmDisconnect();
            }
        } else {
            Alert.alert(
                '연결 해제',
                'Google Calendar 연결을 해제할까요?\n\n모든 캘린더 데이터가 삭제됩니다.',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '연결 해제', style: 'destructive', onPress: confirmDisconnect },
                ]
            );
        }
    };

    const handleSync = async () => {
        await onSync();
        Alert.alert('동기화 완료', '캘린더가 동기화되었습니다.');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>캘린더 설정</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Google 계정 섹션 */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Google 계정</Text>
                            <View style={styles.accountCard}>
                                <View style={styles.accountInfo}>
                                    <Calendar size={24} color={isConnected ? Colors.accent : Colors.textMuted} />
                                    <View style={styles.accountTextContainer}>
                                        {isConnected ? (
                                            <>
                                                <Text style={styles.accountEmail}>{email}</Text>
                                                <Text style={styles.accountStatus}>연결됨</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={styles.accountNotConnected}>연결되지 않음</Text>
                                                <Text style={styles.accountHint}>Google Calendar에 연결하여 일정을 관리하세요</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                                {isConnected ? (
                                    <View style={styles.accountActions}>
                                        <TouchableOpacity
                                            style={styles.syncButton}
                                            onPress={handleSync}
                                            disabled={isSyncing}
                                        >
                                            {isSyncing ? (
                                                <ActivityIndicator size="small" color={Colors.accent} />
                                            ) : (
                                                <RefreshCw size={18} color={Colors.accent} />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.disconnectButton}
                                            onPress={handleDisconnect}
                                        >
                                            <LogOut size={18} color={Colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.connectButton}
                                        onPress={handleConnect}
                                    >
                                        <Text style={styles.connectButtonText}>연결하기</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* 캘린더 목록 섹션 */}
                        {isConnected && calendars.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>캘린더 ({calendars.length})</Text>
                                <Text style={styles.sectionHint}>표시할 캘린더를 선택하세요</Text>
                                <View style={styles.calendarList}>
                                    {calendars.map((calendar) => (
                                        <View key={calendar.id} style={styles.calendarItem}>
                                            <View style={styles.calendarInfo}>
                                                <View
                                                    style={[
                                                        styles.calendarColorDot,
                                                        { backgroundColor: calendar.backgroundColor || '#3B82F6' }
                                                    ]}
                                                />
                                                <Text style={styles.calendarName} numberOfLines={1}>
                                                    {calendar.summary}
                                                    {calendar.primary && ' (기본)'}
                                                </Text>
                                            </View>
                                            <Switch
                                                value={calendar.isEnabled}
                                                onValueChange={() => onToggleCalendar(calendar.id)}
                                                trackColor={{ false: Colors.bgMuted, true: Colors.accent + '60' }}
                                                thumbColor={calendar.isEnabled ? Colors.accent : Colors.textMuted}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {isConnected && calendars.length === 0 && (
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="large" color={Colors.accent} />
                                <Text style={styles.emptyText}>캘린더를 불러오는 중...</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: Colors.bgSecondary,
        borderTopLeftRadius: BorderRadius['3xl'],
        borderTopRightRadius: BorderRadius['3xl'],
        padding: Spacing['4xl'],
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing['2xl'],
    },
    title: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    content: {
        marginBottom: Spacing.md,
    },
    section: {
        marginBottom: Spacing['2xl'],
    },
    sectionTitle: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    sectionHint: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
    },
    accountCard: {
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        flex: 1,
    },
    accountTextContainer: {
        flex: 1,
    },
    accountEmail: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    accountStatus: {
        fontSize: FontSizes.xs,
        color: Colors.accent,
        marginTop: 2,
    },
    accountNotConnected: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    accountHint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: 2,
    },
    accountActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    syncButton: {
        padding: Spacing.md,
        backgroundColor: Colors.accent + '20',
        borderRadius: BorderRadius.md,
    },
    disconnectButton: {
        padding: Spacing.md,
        backgroundColor: Colors.error + '20',
        borderRadius: BorderRadius.md,
    },
    connectButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.md,
    },
    connectButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    calendarList: {
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    calendarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing['2xl'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderPrimary,
    },
    calendarInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        flex: 1,
    },
    calendarColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    calendarName: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing['4xl'],
        gap: Spacing.lg,
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
    },
});
