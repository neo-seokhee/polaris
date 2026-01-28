import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TextInput, ScrollView, Platform, Alert, ActivityIndicator, TouchableOpacity as RNTouchableOpacity } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, Trash2, Edit3, Check, Minus, XIcon, Circle, Plus, Minus as MinusIcon } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { Goal, MonthStatus } from "@/hooks/useGoals";

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

interface GoalDetailModalProps {
    visible: boolean;
    onClose: () => void;
    goal: Goal | null;
    onUpdate: (params: { id: string; title?: string; description?: string; percentage?: number; monthlyStatus?: MonthStatus[]; monthlyProgress?: number[] }) => Promise<{ success: boolean; error?: string }>;
    onDelete: (goalId: string) => Promise<{ success: boolean; error?: string }>;
}

function MonthStatusButton({ status, onPress }: { status: MonthStatus; onPress: () => void }) {
    const getIcon = () => {
        switch (status) {
            case 'complete':
                return <Check size={16} color={Colors.success} />;
            case 'partial':
                return <Minus size={16} color={Colors.accent} />;
            case 'failed':
                return <XIcon size={16} color={Colors.error} />;
            case 'pending':
                return <Circle size={16} color={Colors.bgPending} />;
        }
    };

    const getBgColor = () => {
        switch (status) {
            case 'complete':
                return Colors.success + '20';
            case 'partial':
                return Colors.accent + '20';
            case 'failed':
                return Colors.error + '20';
            case 'pending':
                return Colors.bgTertiary;
        }
    };

    return (
        <TouchableOpacity style={[styles.monthButton, { backgroundColor: getBgColor() }]} onPress={onPress}>
            {getIcon()}
        </TouchableOpacity>
    );
}

export function GoalDetailModal({ visible, onClose, goal, onUpdate, onDelete }: GoalDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [percentage, setPercentage] = useState(0);
    const [monthlyStatus, setMonthlyStatus] = useState<MonthStatus[]>(Array(12).fill('pending'));
    const [monthlyProgress, setMonthlyProgress] = useState<number[]>(Array(12).fill(0));
    const [editingMonthIndex, setEditingMonthIndex] = useState<number | null>(null);
    const [editingMonthValue, setEditingMonthValue] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (visible && goal) {
            setTitle(goal.title);
            setDescription(goal.description || '');
            setPercentage(goal.percentage || 0);
            setMonthlyStatus(goal.monthlyStatus || Array(12).fill('pending'));
            setMonthlyProgress(goal.monthlyProgress || Array(12).fill(0));
            setIsEditing(false);
            setEditingMonthIndex(null);
        }
    }, [visible, goal]);

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    const cycleMonthStatus = (index: number) => {
        const statusOrder: MonthStatus[] = ['pending', 'complete', 'partial', 'failed'];
        const currentIndex = statusOrder.indexOf(monthlyStatus[index]);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        const newStatus = [...monthlyStatus];
        newStatus[index] = statusOrder[nextIndex];
        setMonthlyStatus(newStatus);
    };

    // 월별 진행 상황 수정
    const handleMonthProgressChange = (index: number, value: string) => {
        const numValue = Math.max(0, Number(value) || 0);
        const newProgress = [...monthlyProgress];
        newProgress[index] = numValue;
        setMonthlyProgress(newProgress);

        // 달성률 자동 계산
        if (goal?.targetValue) {
            const total = newProgress.reduce((sum, v) => sum + v, 0);
            const newPercentage = Math.min(100, Math.round((total / goal.targetValue) * 100));
            setPercentage(newPercentage);
        }
    };

    const handleUpdate = async () => {
        if (!goal) return;

        if (!title.trim()) {
            Alert.alert('오류', '목표 제목을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);

        try {
            const updates: any = {
                id: goal.id,
                title: title.trim(),
                description: description.trim() || undefined,
            };

            if (goal.type === 'percentage') {
                updates.monthlyProgress = monthlyProgress;
                updates.percentage = percentage;
            } else {
                updates.monthlyStatus = monthlyStatus;
            }

            const result = await onUpdate(updates);

            if (result.success) {
                Alert.alert('완료', '목표가 수정되었습니다.');
                setIsEditing(false);
            } else {
                Alert.alert('오류', result.error || '목표 수정에 실패했습니다.');
            }
        } catch (err: any) {
            Alert.alert('오류', err.message || '목표 수정에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!goal) return;

        const confirmDelete = async () => {
            setIsDeleting(true);
            try {
                const result = await onDelete(goal.id);
                if (result.success) {
                    Alert.alert('완료', '목표가 삭제되었습니다.');
                    handleClose();
                } else {
                    Alert.alert('오류', result.error || '목표 삭제에 실패했습니다.');
                }
            } catch (err: any) {
                Alert.alert('오류', err.message || '목표 삭제에 실패했습니다.');
            } finally {
                setIsDeleting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('이 목표를 삭제하시겠습니까?')) {
                confirmDelete();
            }
        } else {
            Alert.alert(
                '목표 삭제',
                '이 목표를 삭제하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: confirmDelete },
                ]
            );
        }
    };

    // 퍼센트 조절 핸들러
    const adjustPercentage = (amount: number) => {
        setPercentage(prev => Math.min(100, Math.max(0, prev + amount)));
    };

    if (!goal) return null;

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
                        <Text style={styles.headerTitle}>{isEditing ? '목표 편집' : '목표 상세'}</Text>
                        <View style={styles.headerActions}>
                            {!isEditing && (
                                <>
                                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
                                        <Edit3 size={20} color={Colors.accent} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleDelete} style={styles.headerButton} disabled={isDeleting}>
                                        {isDeleting ? (
                                            <ActivityIndicator size="small" color={Colors.error} />
                                        ) : (
                                            <Trash2 size={20} color={Colors.error} />
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                            <TouchableOpacity onPress={handleClose}>
                                <X size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* 목표 제목 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>목표 제목 {isEditing && '*'}</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.input}
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="목표 제목을 입력하세요"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            ) : (
                                <Text style={styles.readOnlyValue}>{title}</Text>
                            )}
                        </View>

                        {/* 설명 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>설명</Text>
                            {isEditing ? (
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="설명을 입력하세요 (선택)"
                                    placeholderTextColor={Colors.textMuted}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            ) : description ? (
                                <Text style={styles.readOnlyText}>{description}</Text>
                            ) : (
                                <Text style={styles.emptyText}>-</Text>
                            )}
                        </View>

                        {/* 진행 상황 */}
                        {goal.type === 'percentage' && (
                            <>
                                {/* 목표 지표 정보 */}
                                {goal.targetValue && goal.targetUnit && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>목표</Text>
                                        <Text style={styles.targetInfo}>
                                            {goal.targetValue} {goal.targetUnit}
                                        </Text>
                                    </View>
                                )}

                                {/* 달성률 */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>달성률</Text>
                                    <View>
                                        <View style={styles.percentageRow}>
                                            <Text style={styles.percentageValue}>{percentage}%</Text>
                                            {goal.targetValue && goal.targetUnit && (
                                                <Text style={styles.progressText}>
                                                    ({monthlyProgress.reduce((sum, v) => sum + v, 0)} / {goal.targetValue} {goal.targetUnit})
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.progressBarContainer}>
                                            <View style={[styles.progressBar, { width: `${percentage}%` }]} />
                                        </View>
                                    </View>
                                </View>

                                {/* 월별 진행 상황 */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>월별 진행 현황 {isEditing && '(탭하여 수정)'}</Text>
                                    <View style={styles.monthProgressGrid}>
                                        {MONTHS.map((month, index) => (
                                            <View key={index} style={styles.monthProgressItem}>
                                                <Text style={styles.monthLabel}>{month}</Text>
                                                {isEditing ? (
                                                    <TextInput
                                                        style={styles.monthProgressInput}
                                                        value={monthlyProgress[index].toString()}
                                                        onChangeText={(value) => handleMonthProgressChange(index, value)}
                                                        keyboardType="numeric"
                                                        selectTextOnFocus
                                                    />
                                                ) : (
                                                    <View style={[
                                                        styles.monthProgressDisplay,
                                                        monthlyProgress[index] > 0 && styles.monthProgressFilled
                                                    ]}>
                                                        <Text style={[
                                                            styles.monthProgressValue,
                                                            monthlyProgress[index] > 0 && styles.monthProgressValueFilled
                                                        ]}>
                                                            {monthlyProgress[index]}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                    {goal.targetUnit && (
                                        <Text style={styles.unitHint}>단위: {goal.targetUnit}</Text>
                                    )}
                                </View>
                            </>
                        )}

                        {goal.type === 'monthly' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>월별 달성 현황 {isEditing && '(탭하여 변경)'}</Text>
                                <View style={styles.monthGrid}>
                                    {MONTHS.map((month, index) => (
                                        <View key={index} style={styles.monthItem}>
                                            <Text style={styles.monthLabel}>{month}</Text>
                                            {isEditing ? (
                                                <MonthStatusButton
                                                    status={monthlyStatus[index]}
                                                    onPress={() => cycleMonthStatus(index)}
                                                />
                                            ) : (
                                                <MonthStatusButton
                                                    status={monthlyStatus[index]}
                                                    onPress={() => {}}
                                                />
                                            )}
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.legendContainer}>
                                    <View style={styles.legendItem}>
                                        <Check size={14} color={Colors.success} />
                                        <Text style={styles.legendText}>달성</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <Minus size={14} color={Colors.accent} />
                                        <Text style={styles.legendText}>부분</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <XIcon size={14} color={Colors.error} />
                                        <Text style={styles.legendText}>실패</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <Circle size={14} color={Colors.bgPending} />
                                        <Text style={styles.legendText}>대기</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {isEditing && (
                        <View style={styles.buttonRow}>
                            <RNTouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    if (goal) {
                                        setTitle(goal.title);
                                        setDescription(goal.description || '');
                                        setPercentage(goal.percentage || 0);
                                        setMonthlyStatus(goal.monthlyStatus || Array(12).fill('pending'));
                                        setMonthlyProgress(goal.monthlyProgress || Array(12).fill(0));
                                    }
                                    setIsEditing(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonText}>취소</Text>
                            </RNTouchableOpacity>
                            <RNTouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleUpdate}
                                disabled={isSubmitting}
                                activeOpacity={0.7}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color={Colors.textOnDark} />
                                ) : (
                                    <Text style={styles.submitButtonText}>저장</Text>
                                )}
                            </RNTouchableOpacity>
                        </View>
                    )}
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
        maxHeight: '90%',
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    headerButton: {
        padding: Spacing.sm,
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
        fontSize: 12,
        color: '#FFFFFF',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    readOnlyValue: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    readOnlyText: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
    },
    percentageControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    percentageButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentageDisplay: {
        flex: 1,
        alignItems: 'center',
    },
    percentageText: {
        fontSize: FontSizes['3xl'],
        fontWeight: '700',
        color: Colors.accent,
    },
    percentageValue: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.accent,
    },
    percentageRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    progressText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    targetInfo: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    monthProgressGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    monthProgressItem: {
        width: '23%',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    monthProgressInput: {
        width: 48,
        height: 36,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
        textAlign: 'center',
        fontSize: 12,
        color: '#FFFFFF',
    },
    monthProgressDisplay: {
        width: 48,
        height: 36,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthProgressFilled: {
        backgroundColor: Colors.accent + '20',
    },
    monthProgressValue: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    monthProgressValueFilled: {
        color: Colors.accent,
        fontWeight: '600',
    },
    unitHint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    progressBarContainer: {
        height: 8,
        width: '100%',
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.borderPrimary,
        overflow: 'hidden',
    },
    progressBar: {
        height: 8,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.accent,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    monthItem: {
        width: '23%',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    monthLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    monthButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.lg,
        marginTop: Spacing.lg,
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.borderPrimary,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    legendText: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: Colors.bgTertiary,
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    cancelButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    submitButton: {
        flex: 1,
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
    submitButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
