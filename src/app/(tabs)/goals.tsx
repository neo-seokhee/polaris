import { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Target, ClipboardCheck } from "lucide-react-native";
import { GoalHeader } from "@/components/GoalHeader";
import { GoalCard } from "@/components/GoalCard";
import { YearGoalCard } from "@/components/YearGoalCard";
import { AddGoalModal } from "@/components/AddGoalModal";
import { GoalDetailModal } from "@/components/GoalDetailModal";
import { MonthlyEvaluationModal } from "@/components/MonthlyEvaluationModal";
import { DemoBanner } from "@/components/DemoBanner";
import { DraggableList } from "@/components/DraggableList";
import { useGoals, Goal } from "@/hooks/useGoals";
import { useYearGoalText } from "@/hooks/useYearGoalText";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";

export function GoalsScreen() {
    useScreenTracking('screen_goals');

    const {
        goals,
        isLoading,
        isDemoMode,
        selectedYear,
        setSelectedYear,
        addGoal,
        updateGoal,
        deleteGoal,
        reorderGoals,
    } = useGoals();

    const {
        content: yearGoalContent,
        isLoading: isYearGoalLoading,
        saveYearGoalText,
    } = useYearGoalText(selectedYear);

    const { checkDemoAndNudge } = useDemoNudge();

    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

    const handleGoalPress = (goal: Goal) => {
        setSelectedGoal(goal);
        setShowDetailModal(true);
    };

    const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
        reorderGoals(fromIndex, toIndex);
    }, [reorderGoals]);

    const renderGoalItem = useCallback((goal: Goal, index: number, isDragging: boolean) => (
        <View style={styles.goalItemWrapper}>
            <GoalCard
                title={goal.title}
                description={goal.description}
                type={goal.type}
                monthlyStatus={goal.monthlyStatus}
                percentage={goal.percentage}
                targetValue={goal.targetValue}
                targetUnit={goal.targetUnit}
                monthlyProgress={goal.monthlyProgress}
                onPress={() => handleGoalPress(goal)}
                isDragging={isDragging}
            />
        </View>
    ), []);

    const keyExtractor = useCallback((goal: Goal) => goal.id, []);

    const ListHeader = (
        <View style={styles.listHeader}>
            <GoalHeader
                year={selectedYear}
                onYearChange={setSelectedYear}
            />
            <YearGoalCard
                year={selectedYear}
                content={yearGoalContent}
                isLoading={isYearGoalLoading}
                onSave={saveYearGoalText}
            />
        </View>
    );

    const ListEmpty = (
        <View style={styles.emptyContainer}>
            <Target size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{selectedYear}년 목표가 없습니다</Text>
            <Text style={styles.emptySubText}>목표를 추가하여 시작하세요</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <DemoBanner />
            {isLoading ? (
                <View style={[styles.scrollView, styles.loadingContainer]}>
                    {ListHeader}
                    <ActivityIndicator size="large" color={Colors.accent} />
                </View>
            ) : (
                <DraggableList
                    data={goals}
                    renderItem={renderGoalItem}
                    keyExtractor={keyExtractor}
                    onReorder={handleReorder}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={ListEmpty}
                    contentContainerStyle={styles.content}
                />
            )}

            <AddGoalModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                year={selectedYear}
                onAdd={addGoal}
            />

            <GoalDetailModal
                visible={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedGoal(null);
                }}
                goal={selectedGoal}
                onUpdate={updateGoal}
                onDelete={deleteGoal}
            />

            <MonthlyEvaluationModal
                visible={showEvaluationModal}
                onClose={() => setShowEvaluationModal(false)}
                goals={goals}
                year={selectedYear}
                onUpdateGoal={updateGoal}
            />

            {/* FAB 버튼들 */}
            <View style={styles.fabContainer}>
                {/* 월간 평가 버튼 */}
                <Pressable
                    style={styles.fabSecondary}
                    onPress={() => setShowEvaluationModal(true)}
                >
                    <ClipboardCheck size={22} color={Colors.textOnDark} />
                </Pressable>

                {/* 목표 추가 버튼 */}
                <Pressable
                    style={styles.fab}
                    onPress={() => {
                        if (isDemoMode) {
                            checkDemoAndNudge('목표를 추가');
                            return;
                        }
                        setShowAddModal(true);
                    }}
                >
                    <Plus size={24} color={Colors.textOnDark} strokeWidth={2.5} />
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

export default GoalsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['3xl'],
    },
    content: {
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['3xl'],
        paddingBottom: 150, // FAB 버튼 2개 높이 + 여유 공간
    },
    listHeader: {
        marginBottom: Spacing['2xl'],
    },
    goalItemWrapper: {
        marginBottom: Spacing.md,
    },
    goalsList: {
        gap: Spacing.md,
        paddingVertical: Spacing['2xl'],
    },
    loadingContainer: {
        paddingVertical: Spacing['4xl'],
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: Spacing['4xl'],
        alignItems: 'center',
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
        marginTop: Spacing.md,
    },
    emptySubText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    fabContainer: {
        position: 'absolute',
        right: Spacing['3xl'],
        bottom: Spacing['3xl'],
        alignItems: 'center',
        gap: Spacing.lg,
    },
    fabSecondary: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.textSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
        elevation: 8,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
        elevation: 8,
    },
});
