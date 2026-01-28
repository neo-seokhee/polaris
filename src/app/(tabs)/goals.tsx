import { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Target, ClipboardCheck } from "lucide-react-native";
import { GoalHeader } from "@/components/GoalHeader";
import { GoalCard } from "@/components/GoalCard";
import { YearGoalCard } from "@/components/YearGoalCard";
import { AddGoalModal } from "@/components/AddGoalModal";
import { GoalDetailModal } from "@/components/GoalDetailModal";
import { MonthlyEvaluationModal } from "@/components/MonthlyEvaluationModal";
import { DemoBanner } from "@/components/DemoBanner";
import { useGoals, Goal } from "@/hooks/useGoals";
import { useYearGoalText } from "@/hooks/useYearGoalText";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";

export default function GoalsScreen() {
    const {
        goals,
        isLoading,
        isDemoMode,
        selectedYear,
        setSelectedYear,
        addGoal,
        updateGoal,
        deleteGoal,
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

    return (
        <SafeAreaView style={styles.container}>
            <DemoBanner />
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.accent} />
                    </View>
                ) : goals.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Target size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>{selectedYear}년 목표가 없습니다</Text>
                        <Text style={styles.emptySubText}>목표를 추가하여 시작하세요</Text>
                    </View>
                ) : (
                    <View style={styles.goalsList}>
                        {goals.map((goal) => (
                            <GoalCard
                                key={goal.id}
                                title={goal.title}
                                description={goal.description}
                                type={goal.type}
                                monthlyStatus={goal.monthlyStatus}
                                percentage={goal.percentage}
                                targetValue={goal.targetValue}
                                targetUnit={goal.targetUnit}
                                monthlyProgress={goal.monthlyProgress}
                                onPress={() => handleGoalPress(goal)}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

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
                <TouchableOpacity
                    style={styles.fabSecondary}
                    onPress={() => setShowEvaluationModal(true)}
                >
                    <ClipboardCheck size={22} color={Colors.textOnDark} />
                </TouchableOpacity>

                {/* 목표 추가 버튼 */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        if (isDemoMode) {
                            checkDemoAndNudge('목표를 추가');
                            return;
                        }
                        setShowAddModal(true);
                    }}
                >
                    <Plus size={24} color={Colors.textOnDark} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

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
        paddingBottom: 150, // FAB 버튼 2개 높이 + 여유 공간
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
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
