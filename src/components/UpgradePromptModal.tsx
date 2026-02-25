import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Sparkles, Check, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

interface UpgradePromptModalProps {
    visible: boolean;
    onClose: () => void;
    featureName?: string;
    limitMessage?: string;
}

export function UpgradePromptModal({ visible, onClose, featureName, limitMessage }: UpgradePromptModalProps) {
    const handleUpgrade = () => {
        onClose();
        router.push('/store');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <X size={20} color={Colors.textMuted} />
                    </Pressable>

                    <View style={styles.iconContainer}>
                        <Sparkles size={32} color={Colors.accent} />
                    </View>

                    <Text style={styles.title}>스토어에서 구매하기</Text>

                    <Text style={styles.description}>
                        {limitMessage || `${featureName || '이 기능'}은 스토어에서 개별 구매로 이용할 수 있어요.`}
                    </Text>

                    <View style={styles.benefitsList}>
                        <View style={styles.benefitItem}>
                            <Check size={16} color={Colors.success} />
                            <Text style={styles.benefitText}>개별 모듈 구매</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Check size={16} color={Colors.success} />
                            <Text style={styles.benefitText}>번들 패키지 할인</Text>
                        </View>
                    </View>

                    <Pressable style={styles.ctaButton} onPress={handleUpgrade}>
                        <Text style={styles.ctaButtonText}>스토어 보기</Text>
                    </Pressable>

                    <Pressable style={styles.laterButton} onPress={onClose}>
                        <Text style={styles.laterButtonText}>나중에 할게요</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing['3xl'],
    },
    container: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing['4xl'],
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: Spacing['2xl'],
        right: Spacing['2xl'],
        padding: Spacing.md,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.accentBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing['3xl'],
    },
    title: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing['2xl'],
    },
    description: {
        fontSize: FontSizes.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing['3xl'],
    },
    benefitsList: {
        width: '100%',
        gap: Spacing['2xl'],
        marginBottom: Spacing['4xl'],
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2xl'],
    },
    benefitText: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    ctaButton: {
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['4xl'],
        width: '100%',
        alignItems: 'center',
        marginBottom: Spacing['2xl'],
    },
    ctaButtonText: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    laterButton: {
        paddingVertical: Spacing.md,
    },
    laterButtonText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
    },
});
