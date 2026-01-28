import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Check, Minus, X, Circle } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

export type MonthStatus = "complete" | "partial" | "failed" | "pending";

interface GoalCardProps {
  title: string;
  description: string | null;
  type: "monthly" | "percentage";
  monthlyStatus?: MonthStatus[];
  percentage?: number | null;
  targetValue?: number | null;
  targetUnit?: string | null;
  monthlyProgress?: number[];
  onPress?: () => void;
}

function MonthIcon({ status }: { status: MonthStatus }) {
  switch (status) {
    case "complete":
      return <Check size={18} color={Colors.success} />;
    case "partial":
      return <Minus size={18} color={Colors.accent} />;
    case "failed":
      return <X size={18} color={Colors.error} />;
    case "pending":
      return <Circle size={18} color={Colors.bgPending} />;
  }
}

function getProgress(
  type: 'monthly' | 'percentage',
  monthlyStatus?: MonthStatus[],
  percentage?: number | null,
  targetValue?: number | null,
  targetUnit?: string | null,
  monthlyProgress?: number[]
): string {
  if (type === 'percentage') {
    if (targetValue && targetUnit && monthlyProgress) {
      const current = monthlyProgress.reduce((sum, v) => sum + v, 0);
      return `${current}/${targetValue}${targetUnit} (${percentage || 0}%)`;
    }
    return `${percentage || 0}%`;
  }
  if (monthlyStatus) {
    const completed = monthlyStatus.filter(s => s === 'complete').length;
    return `${completed}/12`;
  }
  return '0/12';
}

function isCompleted(type: 'monthly' | 'percentage', monthlyStatus?: MonthStatus[], percentage?: number | null): boolean {
  if (type === 'percentage') {
    return percentage === 100;
  }
  if (monthlyStatus) {
    return monthlyStatus.every(s => s === 'complete');
  }
  return false;
}

export function GoalCard({
  title,
  description,
  type,
  monthlyStatus,
  percentage,
  targetValue,
  targetUnit,
  monthlyProgress,
  onPress,
}: GoalCardProps) {
  const completed = isCompleted(type, monthlyStatus, percentage);
  const progress = getProgress(type, monthlyStatus, percentage, targetValue, targetUnit, monthlyProgress);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        completed ? styles.cardCompleted : styles.cardDefault,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {completed ? (
          <View style={styles.completedBadge}>
            <Check size={12} color={Colors.textOnDark} />
            <Text style={styles.completedText}>완료</Text>
          </View>
        ) : (
          <Text style={styles.progress}>{progress}</Text>
        )}
      </View>

      {description ? (
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      ) : null}

      {type === "percentage" && (
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, { width: `${percentage || 0}%` }]}
          />
        </View>
      )}

      {type === "monthly" && monthlyStatus && (
        <View style={styles.monthIconsContainer}>
          {monthlyStatus.map((status, index) => (
            <MonthIcon key={index} status={status} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  cardDefault: {
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgSecondary,
  },
  cardCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.bgSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.md,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textOnDark,
  },
  progress: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textMuted,
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
  monthIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 6,
  },
});
