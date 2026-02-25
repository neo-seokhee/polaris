import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/contexts/AuthContext';

export function OfflineBanner() {
    const { isDemoMode } = useAuth();
    const { isOnline, isSyncing, syncError, pendingCount, triggerSync } = useNetwork();

    // 데모 모드이거나 온라인이고 동기화 중이 아니고 에러도 없으면 숨김
    if (isDemoMode) return null;
    if (isOnline && !isSyncing && !syncError) return null;

    if (isSyncing) {
        return (
            <View style={[styles.container, styles.syncingBg]}>
                <View style={styles.content}>
                    <ActivityIndicator size="small" color={Colors.textOnDark} />
                    <Text style={styles.text}>
                        동기화 중... ({pendingCount}건)
                    </Text>
                </View>
            </View>
        );
    }

    if (syncError && isOnline) {
        return (
            <Pressable style={[styles.container, styles.errorBg]} onPress={triggerSync}>
                <View style={styles.content}>
                    <AlertTriangle size={14} color={Colors.textPrimary} />
                    <Text style={styles.text}>
                        동기화 실패 ({pendingCount}건) · 탭하여 재시도
                    </Text>
                </View>
            </Pressable>
        );
    }

    // 오프라인
    return (
        <View style={[styles.container, styles.offlineBg]}>
            <View style={styles.content}>
                <WifiOff size={14} color={Colors.textPrimary} />
                <Text style={styles.text}>
                    오프라인 모드{pendingCount > 0 ? ` · 대기 중 ${pendingCount}건` : ''}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing['2xl'],
    },
    offlineBg: {
        backgroundColor: Colors.bgMuted,
    },
    syncingBg: {
        backgroundColor: Colors.info,
    },
    errorBg: {
        backgroundColor: Colors.error,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
    },
    text: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
});
