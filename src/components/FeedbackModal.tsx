import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
    userEmail?: string | null;
    userPhone?: string | null;
}

const SLACK_WEBHOOK_URL = process.env.EXPO_PUBLIC_SLACK_WEBHOOK_URL || '';

export function FeedbackModal({ visible, onClose, userEmail, userPhone }: FeedbackModalProps) {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            showAlert('알림', '의견을 입력해주세요.');
            return;
        }

        if (!SLACK_WEBHOOK_URL) {
            showAlert('오류', 'Slack Webhook이 설정되지 않았습니다.');
            return;
        }

        setIsSubmitting(true);
        console.log('[Feedback] Sending with phone:', userPhone, 'email:', userEmail);

        try {
            const response = await fetch(SLACK_WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: `📬 *새로운 피드백이 도착했습니다!*`,
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: '📬 새로운 피드백',
                                emoji: true,
                            },
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: `*사용자:*\n${userEmail || '비회원'}`,
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*연락처:*\n${userPhone || '미등록'}`,
                                },
                            ],
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: `*시간:*\n${new Date().toLocaleString('ko-KR')}`,
                                },
                            ],
                        },
                        {
                            type: 'divider',
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*의견:*\n${feedback}`,
                            },
                        },
                    ],
                }),
            });

            // no-cors 모드에서는 response.ok를 확인할 수 없으므로 성공으로 처리
            showAlert('감사합니다!', '소중한 의견이 전달되었습니다. 🙏');
            setFeedback('');
            onClose();
        } catch (error) {
            showAlert('오류', '의견 전송에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFeedback('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>의견 보내기</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.description}>
                        Polaris를 사용하시면서 불편하셨던 점이나{'\n'}
                        개선 아이디어가 있으시면 알려주세요!
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="의견을 입력해주세요..."
                        placeholderTextColor={Colors.textMuted}
                        value={feedback}
                        onChangeText={setFeedback}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={Colors.textOnDark} />
                        ) : (
                            <Text style={styles.submitButtonText}>보내기</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
        width: '100%',
        maxWidth: 400,
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing['3xl'],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing['2xl'],
    },
    title: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    closeButton: {
        padding: Spacing.sm,
    },
    description: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        lineHeight: 20,
        marginBottom: Spacing['2xl'],
    },
    input: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.xl,
        padding: Spacing['2xl'],
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        minHeight: 120,
        marginBottom: Spacing['2xl'],
    },
    submitButton: {
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing['2xl'],
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
