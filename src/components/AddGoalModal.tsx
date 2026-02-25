import { useState } from "react";
import { View, Text, StyleSheet, Modal, TextInput, Platform, Alert, ActivityIndicator, TouchableOpacity, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { X, Calendar, TrendingUp } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

interface AddGoalModalProps {
    visible: boolean;
    onClose: () => void;
    year: number;
    onAdd: (params: { title: string; description?: string; type: 'monthly' | 'percentage'; year: number; targetValue?: number; targetUnit?: string }) => Promise<{ success: boolean; error?: string }>;
}

export function AddGoalModal({ visible, onClose, year, onAdd }: AddGoalModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'monthly' | 'percentage'>('monthly');
    const [targetValue, setTargetValue] = useState('');
    const [targetUnit, setTargetUnit] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setType('monthly');
        setTargetValue('');
        setTargetUnit('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('오류', '목표 제목을 입력해주세요.');
            return;
        }

        if (type === 'percentage' && !targetValue.trim()) {
            Alert.alert('오류', '목표 수치를 입력해주세요.');
            return;
        }

        if (type === 'percentage' && !targetUnit.trim()) {
            Alert.alert('오류', '목표 단위를 입력해주세요.');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await onAdd({
                title: title.trim(),
                description: description.trim() || undefined,
                type,
                year,
                targetValue: type === 'percentage' ? Number(targetValue) : undefined,
                targetUnit: type === 'percentage' ? targetUnit.trim() : undefined,
            });

            if (result.success) {
                Alert.alert('완료', '목표가 추가되었습니다.');
                handleClose();
            } else {
                Alert.alert('오류', result.error || '목표 추가에 실패했습니다.');
            }
        } catch (err: any) {
            Alert.alert('오류', err.message || '목표 추가에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{year}년 목표 추가</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {/* 목표 타입 선택 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>목표 타입</Text>
                            <View style={styles.typeSelector}>
                                <Pressable
                                    style={[
                                        styles.typeOption,
                                        type === 'monthly' && styles.typeOptionSelected,
                                    ]}
                                    onPress={() => setType('monthly')}
                                >
                                    <Calendar size={20} color={type === 'monthly' ? Colors.accent : Colors.textMuted} />
                                    <Text style={[
                                        styles.typeOptionText,
                                        type === 'monthly' && styles.typeOptionTextSelected,
                                    ]}>월별 달성</Text>
                                    <Text style={styles.typeOptionDesc}>매월 달성 여부 체크</Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.typeOption,
                                        type === 'percentage' && styles.typeOptionSelected,
                                    ]}
                                    onPress={() => setType('percentage')}
                                >
                                    <TrendingUp size={20} color={type === 'percentage' ? Colors.accent : Colors.textMuted} />
                                    <Text style={[
                                        styles.typeOptionText,
                                        type === 'percentage' && styles.typeOptionTextSelected,
                                    ]}>달성률</Text>
                                    <Text style={styles.typeOptionDesc}>0~100% 진행률 관리</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* 달성률 목표일 때 목표 지표 입력 */}
                        {type === 'percentage' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>목표 지표 *</Text>
                                <View style={styles.targetRow}>
                                    <TextInput
                                        style={[styles.input, styles.targetValueInput]}
                                        value={targetValue}
                                        onChangeText={setTargetValue}
                                        placeholder="30"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                    />
                                    <TextInput
                                        style={[styles.input, styles.targetUnitInput]}
                                        value={targetUnit}
                                        onChangeText={setTargetUnit}
                                        placeholder="권"
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                </View>
                                <Text style={styles.helperText}>예: 30 권, 100 km, 1000 만원</Text>
                            </View>
                        )}

                        {/* 목표 제목 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>목표 제목 *</Text>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder={type === 'percentage' ? "예: 책 읽기" : "예: 매일 운동하기"}
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        {/* 설명 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>설명 (선택)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="목표에 대한 설명을 입력하세요"
                                placeholderTextColor={Colors.textMuted}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.submitButton,
                            isSubmitting && styles.submitButtonDisabled,
                            pressed && !isSubmitting && styles.buttonPressed,
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={Colors.textOnDark} />
                        ) : (
                            <Text style={styles.submitButtonText}>목표 추가</Text>
                        )}
                    </Pressable>
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
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing['2xl'],
    },
    headerTitle: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    content: {
        marginBottom: Spacing['2xl'],
    },
    inputGroup: {
        marginBottom: Spacing['2xl'],
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        fontSize: 14,
        color: '#FFFFFF',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    typeOption: {
        flex: 1,
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        paddingVertical: Spacing['3xl'],
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
        minHeight: 100,
    },
    typeOptionSelected: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent + '10',
    },
    typeOptionText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    typeOptionTextSelected: {
        color: Colors.accent,
    },
    typeOptionDesc: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    targetRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    targetValueInput: {
        flex: 2,
    },
    targetUnitInput: {
        flex: 1,
    },
    helperText: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    submitButton: {
        backgroundColor: Colors.accent,
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    submitButtonDisabled: {
        backgroundColor: Colors.bgMuted,
    },
    buttonPressed: {
        opacity: 0.8,
    },
    submitButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
