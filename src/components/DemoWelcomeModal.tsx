import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Sparkles, Check, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface DemoWelcomeModalProps {
    visible: boolean;
    onClose: () => void;
}

export function DemoWelcomeModal({ visible, onClose }: DemoWelcomeModalProps) {
    const { exitDemoMode } = useAuth();

    const handleSignup = () => {
        onClose();
        router.push('/(tabs)/profile');
    };

    const handleLogin = () => {
        onClose();
        exitDemoMode();
        router.push('/(auth)/login');
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

                    <Text style={styles.title}>체험 모드로 둘러보기</Text>

                    <Text style={styles.description}>
                        회원가입 없이 앱을 체험해볼 수 있어요.{'\n'}
                        단, 체험 모드에서는 데이터가 저장되지 않아요.
                    </Text>

                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <Check size={16} color={Colors.success} />
                            <Text style={styles.featureText}>모든 화면 둘러보기</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Check size={16} color={Colors.success} />
                            <Text style={styles.featureText}>기능 미리 체험하기</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Check size={16} color={Colors.textMuted} style={styles.strikethrough} />
                            <Text style={[styles.featureText, styles.mutedText]}>데이터 저장 (회원가입 필요)</Text>
                        </View>
                    </View>

                    <Pressable style={styles.ctaButton} onPress={handleSignup}>
                        <Text style={styles.ctaButtonText}>회원가입하고 시작하기</Text>
                    </Pressable>

                    <View style={styles.bottomButtonsContainer}>
                        <Pressable style={styles.secondaryButton} onPress={onClose}>
                            <Text style={styles.secondaryButtonText}>둘러보기</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryButton} onPress={handleLogin}>
                            <Text style={styles.secondaryButtonText}>로그인</Text>
                        </Pressable>
                    </View>
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
    featuresList: {
        width: '100%',
        gap: Spacing['2xl'],
        marginBottom: Spacing['4xl'],
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2xl'],
    },
    featureText: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    mutedText: {
        color: Colors.textMuted,
    },
    strikethrough: {
        opacity: 0.5,
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
    bottomButtonsContainer: {
        flexDirection: 'row',
        gap: Spacing['2xl'],
        width: '100%',
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: FontSizes.base,
        color: Colors.textSecondary,
    },
});
