import { useState } from "react";
import { View, Text, StyleSheet, Modal, Alert, Platform, ScrollView, Switch } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, Plus, Trash2, RefreshCw, Calendar } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import { AddCalendarModal } from "./AddCalendarModal";
import type { Database } from "@/lib/database.types";

type CalendarSubscription = Database['public']['Tables']['calendar_subscriptions']['Row'];

interface CalendarSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    subscriptions: CalendarSubscription[];
    syncing: boolean;
    onAdd: (name: string, url: string, color: string) => Promise<{ error: string | null }>;
    onRemove: (id: string) => Promise<{ error: string | null }>;
    onUpdate: (id: string, updates: { name?: string; color?: string; is_enabled?: boolean }) => Promise<{ error: string | null }>;
    onSync: (id: string) => Promise<{ error: string | null; eventsCount?: number; cached?: boolean }>;
    onSyncAll: () => Promise<any[]>;
}

export function CalendarSubscriptionModal({
    visible,
    onClose,
    subscriptions,
    syncing,
    onAdd,
    onRemove,
    onUpdate,
    onSync,
    onSyncAll,
}: CalendarSubscriptionModalProps) {
    const [showAddModal, setShowAddModal] = useState(false);

    const handleRemove = (subscription: CalendarSubscription) => {
        const confirmRemove = () => {
            onRemove(subscription.id);
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`"${subscription.name}" 캘린더를 삭제하시겠습니까?`)) {
                confirmRemove();
            }
        } else {
            Alert.alert(
                '캘린더 삭제',
                `"${subscription.name}" 캘린더를 삭제하시겠습니까?`,
                [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: confirmRemove },
                ]
            );
        }
    };

    const handleToggleEnabled = async (subscription: CalendarSubscription) => {
        await onUpdate(subscription.id, { is_enabled: !subscription.is_enabled });
    };

    const handleSync = async (subscription: CalendarSubscription) => {
        const result = await onSync(subscription.id);
        if (result.error) {
            if (result.cached) {
                Alert.alert('동기화 실패', result.error);
            } else {
                Alert.alert('동기화 실패', result.error);
            }
        } else {
            Alert.alert('동기화 완료', `${result.eventsCount || 0}개의 일정을 동기화했습니다.`);
        }
    };

    const formatLastSynced = (dateStr: string | null) => {
        if (!dateStr) return '동기화 필요';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        return `${diffDays}일 전`;
    };

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={onClose}
            >
                <GestureHandlerRootView style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.header}>
                            <Text style={styles.title}>캘린더 구독</Text>
                            <View style={styles.headerActions}>
                                {subscriptions.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => onSyncAll()}
                                        disabled={syncing}
                                        style={styles.headerButton}
                                    >
                                        <RefreshCw
                                            size={20}
                                            color={syncing ? Colors.textMuted : Colors.accent}
                                            style={syncing ? styles.rotating : undefined}
                                        />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={onClose}>
                                    <X size={24} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            {subscriptions.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Calendar size={48} color={Colors.textMuted} />
                                    <Text style={styles.emptyText}>구독 중인 캘린더가 없습니다</Text>
                                    <Text style={styles.emptySubtext}>
                                        Google Calendar, Apple Calendar 등의{'\n'}iCal URL을 추가해보세요
                                    </Text>
                                </View>
                            )}

                            {subscriptions.map((subscription) => (
                                <View key={subscription.id} style={styles.subscriptionItem}>
                                    <View style={styles.subscriptionHeader}>
                                        <View style={[styles.colorDot, { backgroundColor: subscription.color }]} />
                                        <View style={styles.subscriptionInfo}>
                                            <Text style={styles.subscriptionName}>{subscription.name}</Text>
                                            <Text style={styles.subscriptionLastSync}>
                                                {formatLastSynced(subscription.last_synced_at)}
                                            </Text>
                                        </View>
                                        <Switch
                                            value={subscription.is_enabled}
                                            onValueChange={() => handleToggleEnabled(subscription)}
                                            trackColor={{ false: Colors.bgMuted, true: Colors.accent + '60' }}
                                            thumbColor={subscription.is_enabled ? Colors.accent : Colors.textMuted}
                                        />
                                    </View>
                                    <View style={styles.subscriptionActions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleSync(subscription)}
                                            disabled={syncing}
                                        >
                                            <RefreshCw size={16} color={Colors.textSecondary} />
                                            <Text style={styles.actionButtonText}>동기화</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.deleteButton]}
                                            onPress={() => handleRemove(subscription)}
                                        >
                                            <Trash2 size={16} color={Colors.error} />
                                            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>삭제</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowAddModal(true)}
                        >
                            <Plus size={20} color={Colors.textOnDark} />
                            <Text style={styles.addButtonText}>캘린더 추가</Text>
                        </TouchableOpacity>
                    </View>
                </GestureHandlerRootView>
            </Modal>

            <AddCalendarModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={onAdd}
            />
        </>
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    headerButton: {
        padding: Spacing.xs,
    },
    rotating: {
        opacity: 0.5,
    },
    title: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    content: {
        marginBottom: Spacing['2xl'],
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing['4xl'],
        gap: Spacing.lg,
    },
    emptyText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    subscriptionItem: {
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        marginBottom: Spacing.lg,
    },
    subscriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    subscriptionInfo: {
        flex: 1,
    },
    subscriptionName: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    subscriptionLastSync: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: 2,
    },
    subscriptionActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.lg,
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.borderPrimary,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgMuted,
    },
    actionButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    deleteButton: {
        backgroundColor: Colors.error + '20',
    },
    deleteButtonText: {
        color: Colors.error,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.accent,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
    },
    addButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
