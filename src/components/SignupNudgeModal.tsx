import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Lock, Check, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
interface SignupNudgeModalProps {
    visible: boolean;
    onClose: () => void;
    actionName?: string;
}

export function SignupNudgeModal({ visible, onClose, actionName = '이 기능을 사용' }: SignupNudgeModalProps) {
    const handleSignup = () => {
        onClose();
        router.push('/(tabs)/profile');
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
                    {/* Close button */}
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <X size={20} color={Colors.textMuted} />
                    </Pressable>

                    {/* Lock Icon */}
                    <View style={styles.iconContainer}>
                        <Lock size={32} color={Colors.accent} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>회원가입이 필요해요</Text>

                    {/* Description */}
                    <Text style={styles.description}>
                        {actionName}하려면 회원가입 후 이용해주세요.{'\n'}
                        무료로 모든 기능을 사용할 수 있어요!
                    </Text>

                    {/* Benefits */}
                    <View style={styles.benefitsList}>
                        <View style={styles.benefitItem}>
                            <Check size={16} color={Colors.success} />
                            <Text style={styles.benefitText}>기기 간 데이터 동기화</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Check size={16} color={Colors.success} />
                            <Text style={styles.benefitText}>안전한 데이터 백업</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Check size={16} color={Colors.success} />
                            <Text style={styles.benefitText}>모든 기능 무제한 사용</Text>
                        </View>
                    </View>

                    {/* CTA Button */}
                    <Pressable style={styles.ctaButton} onPress={handleSignup}>
                        <Text style={styles.ctaButtonText}>무료로 시작하기</Text>
                    </Pressable>

                    {/* Later link */}
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
