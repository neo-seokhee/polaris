import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, ScrollView, TextInput, Alert, ActivityIndicator, TouchableOpacity as RNTouchableOpacity } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, ChevronLeft, ChevronRight, Check, Minus, XIcon, Circle } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { Goal, MonthStatus } from "@/hooks/useGoals";

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

interface MonthlyEvaluationModalProps {
    visible: boolean;
    onClose: () => void;
    goals: Goal[];
    year: number;
    onUpdateGoal: (params: { id: string; monthlyStatus?: MonthStatus[]; monthlyProgress?: number[]; percentage?: number }) => Promise<{ success: boolean; error?: string }>;
}

interface StatusOptionProps {
    status: MonthStatus;
    selected: boolean;
    onPress: () => void;
}

function StatusOption({ status, selected, onPress }: StatusOptionProps) {
    const getIcon = () => {
        switch (status) {
            case 'complete':
                return <Circle size={16} color={selected ? Colors.success : Colors.textMuted} />;
            case 'partial':
                return <Minus size={16} color={selected ? Colors.accent : Colors.textMuted} />;
            case 'failed':
                return <XIcon size={16} color={selected ? Colors.error : Colors.textMuted} />;
            default:
                return null;
        }
    };

    const getBgColor = () => {
        if (!selected) return Colors.bgTertiary;
        switch (status) {
            case 'complete':
                return Colors.success + '20';
            case 'partial':
                return Colors.accent + '20';
            case 'failed':
                return Colors.error + '20';
            default:
                return Colors.bgTertiary;
        }
    };

    const getBorderColor = () => {
        if (!selected) return 'transparent';
        switch (status) {
            case 'complete':
                return Colors.success;
            case 'partial':
                return Colors.accent;
            case 'failed':
                return Colors.error;
            default:
                return 'transparent';
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.statusOption,
                { backgroundColor: getBgColor(), borderColor: getBorderColor() }
            ]}
            onPress={onPress}
        >
            {getIcon()}
        </TouchableOpacity>
    );
}

export function MonthlyEvaluationModal({ visible, onClose, goals, year, onUpdateGoal }: MonthlyEvaluationModalProps) {
    const currentMonth = new Date().getMonth();
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [evaluations, setEvaluations] = useState<Map<string, { status?: MonthStatus; progress?: number }>>(new Map());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 모달 열릴 때 현재 값으로 초기화
    useEffect(() => {
        if (visible) {
            const initialEvaluations = new Map<string, { status?: MonthStatus; progress?: number }>();
            goals.forEach(goal => {
                if (goal.type === 'monthly') {
                    initialEvaluations.set(goal.id, { status: goal.monthlyStatus[selectedMonth] });
                } else {
                    initialEvaluations.set(goal.id, { progress: goal.monthlyProgress[selectedMonth] });
                }
            });
            setEvaluations(initialEvaluations);
        }
    }, [visible, goals, selectedMonth]);

    const handleMonthChange = (delta: number) => {
        const newMonth = selectedMonth + delta;
        if (newMonth >= 0 && newMonth <= 11) {
            setSelectedMonth(newMonth);
        }
    };

    const setStatus = (goalId: string, status: MonthStatus) => {
        setEvaluations(prev => {
            const newMap = new Map(prev);
            newMap.set(goalId, { ...newMap.get(goalId), status });
            return newMap;
        });
    };

    const updateProgress = (goalId: string, value: string) => {
        const numValue = Math.max(0, Number(value) || 0);
        setEvaluations(prev => {
            const newMap = new Map(prev);
            newMap.set(goalId, { ...newMap.get(goalId), progress: numValue });
            return newMap;
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const promises = goals.map(async (goal) => {
                const evaluation = evaluations.get(goal.id);
                if (!evaluation) return { success: true };

                if (goal.type === 'monthly' && evaluation.status !== undefined) {
                    const newStatus = [...goal.monthlyStatus];
                    newStatus[selectedMonth] = evaluation.status;
                    return onUpdateGoal({ id: goal.id, monthlyStatus: newStatus });
                } else if (goal.type === 'percentage' && evaluation.progress !== undefined) {
                    const newProgress = [...goal.monthlyProgress];
                    newProgress[selectedMonth] = evaluation.progress;

                    // 달성률 자동 계산
                    const total = newProgress.reduce((sum, v) => sum + v, 0);
                    const newPercentage = goal.targetValue
                        ? Math.min(100, Math.round((total / goal.targetValue) * 100))
                        : 0;

                    return onUpdateGoal({ id: goal.id, monthlyProgress: newProgress, percentage: newPercentage });
                }
                return { success: true };
            });

            const results = await Promise.all(promises);
            const failed = results.filter(r => !r.success);

            if (failed.length > 0) {
                Alert.alert('오류', '일부 목표 업데이트에 실패했습니다.');
            } else {
                Alert.alert('완료', `${MONTHS[selectedMonth]} 평가가 저장되었습니다.`);
                onClose();
            }
        } catch (err: any) {
            Alert.alert('오류', err.message || '평가 저장에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const monthlyGoals = goals.filter(g => g.type === 'monthly');
    const percentageGoals = goals.filter(g => g.type === 'percentage');

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
                        <Text style={styles.headerTitle}>월간 평가</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* 월 선택 */}
                    <View style={styles.monthSelector}>
                        <TouchableOpacity
                            onPress={() => handleMonthChange(-1)}
                            disabled={selectedMonth === 0}
                            style={styles.monthArrow}
                        >
                            <ChevronLeft size={24} color={selectedMonth === 0 ? Colors.textMuted : Colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.monthText}>{year}년 {MONTHS[selectedMonth]}</Text>
                        <TouchableOpacity
                            onPress={() => handleMonthChange(1)}
                            disabled={selectedMonth === 11}
                            style={styles.monthArrow}
                        >
                            <ChevronRight size={24} color={selectedMonth === 11 ? Colors.textMuted : Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {goals.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>평가할 목표가 없습니다</Text>
                            </View>
                        ) : (
                            <>
                                {/* 월별 달성 목표 */}
                                {monthlyGoals.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>월별 달성 목표</Text>
                                        <View style={styles.statusLegend}>
                                            <View style={styles.legendItem}>
                                                <Circle size={12} color={Colors.success} />
                                                <Text style={styles.legendText}>달성</Text>
                                            </View>
                                            <View style={styles.legendItem}>
                                                <Minus size={12} color={Colors.accent} />
                                                <Text style={styles.legendText}>부분</Text>
                                            </View>
                                            <View style={styles.legendItem}>
                                                <XIcon size={12} color={Colors.error} />
                                                <Text style={styles.legendText}>실패</Text>
                                            </View>
                                        </View>
                                        {monthlyGoals.map(goal => {
                                            const currentStatus = evaluations.get(goal.id)?.status || 'pending';
                                            return (
                                                <View key={goal.id} style={styles.goalRow}>
                                                    <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                                                    <View style={styles.statusOptions}>
                                                        <StatusOption
                                                            status="complete"
                                                            selected={currentStatus === 'complete'}
                                                            onPress={() => setStatus(goal.id, 'complete')}
                                                        />
                                                        <StatusOption
                                                            status="partial"
                                                            selected={currentStatus === 'partial'}
                                                            onPress={() => setStatus(goal.id, 'partial')}
                                                        />
                                                        <StatusOption
                                                            status="failed"
                                                            selected={currentStatus === 'failed'}
                                                            onPress={() => setStatus(goal.id, 'failed')}
                                                        />
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* 달성률 목표 */}
                                {percentageGoals.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>달성률 목표</Text>
                                        {percentageGoals.map(goal => (
                                            <View key={goal.id} style={styles.goalRow}>
                                                <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                                                <View style={styles.progressInputRow}>
                                                    <TextInput
                                                        style={styles.progressInput}
                                                        value={(evaluations.get(goal.id)?.progress ?? 0).toString()}
                                                        onChangeText={(value) => updateProgress(goal.id, value)}
                                                        keyboardType="numeric"
                                                        selectTextOnFocus
                                                    />
                                                    {goal.targetUnit && (
                                                        <Text style={styles.goalUnit}>{goal.targetUnit}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {goals.length > 0 && (
                        <RNTouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            activeOpacity={0.7}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={Colors.textOnDark} />
                            ) : (
                                <Text style={styles.submitButtonText}>평가 저장</Text>
                            )}
                        </RNTouchableOpacity>
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
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing['2xl'],
        gap: Spacing.lg,
    },
    monthArrow: {
        padding: Spacing.sm,
    },
    monthText: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
        minWidth: 120,
        textAlign: 'center',
    },
    content: {
        marginBottom: Spacing['2xl'],
    },
    emptyContainer: {
        paddingVertical: Spacing['4xl'],
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
    },
    section: {
        marginBottom: Spacing['2xl'],
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
    },
    statusLegend: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.lg,
        marginBottom: Spacing.md,
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
    statusOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statusOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderPrimary,
    },
    goalTitle: {
        flex: 1,
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    progressInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    goalUnit: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        minWidth: 30,
    },
    progressInput: {
        width: 60,
        height: 36,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
        textAlign: 'center',
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
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
    submitButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
