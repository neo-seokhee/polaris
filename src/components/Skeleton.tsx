import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = BorderRadius.lg, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: Colors.bgTertiary, opacity },
        style,
      ]}
    />
  );
}

export function TodoSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header area */}
      <View style={styles.row}>
        <SkeletonBox width={120} height={20} />
        <SkeletonBox width={60} height={20} />
      </View>
      {/* Todo items */}
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.todoItem}>
          <SkeletonBox width={20} height={20} borderRadius={BorderRadius.sm} />
          <SkeletonBox width={`${70 - i * 8}%` as any} height={16} style={styles.flex} />
        </View>
      ))}
    </View>
  );
}

export function GoalSkeleton() {
  return (
    <View style={styles.container}>
      {/* Goal cards */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.goalCard}>
          <SkeletonBox width="60%" height={18} />
          <SkeletonBox width="40%" height={14} style={{ marginTop: Spacing.md }} />
          <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginTop: Spacing['2xl'] }} />
        </View>
      ))}
    </View>
  );
}

export function MemoSkeleton() {
  return (
    <View style={styles.container}>
      {/* Memo cards */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.memoCard}>
          <SkeletonBox width="70%" height={16} />
          <SkeletonBox width="100%" height={12} style={{ marginTop: Spacing.md }} />
          <SkeletonBox width="50%" height={12} style={{ marginTop: Spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

export function ScheduleSkeleton() {
  return (
    <View style={styles.container}>
      {/* Time blocks */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.scheduleItem}>
          <SkeletonBox width={40} height={14} />
          <View style={styles.scheduleContent}>
            <SkeletonBox width="70%" height={16} />
            <SkeletonBox width="40%" height={12} style={{ marginTop: Spacing.sm }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ModuleSkeleton() {
  return (
    <View style={[styles.container, styles.center]}>
      <SkeletonBox width={48} height={48} borderRadius={24} />
      <SkeletonBox width={120} height={16} style={{ marginTop: Spacing['2xl'] }} />
      <SkeletonBox width={200} height={12} style={{ marginTop: Spacing.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing['3xl'],
    gap: Spacing['2xl'],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'] * 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  goalCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['3xl'],
  },
  memoCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['3xl'],
  },
  scheduleItem: {
    flexDirection: 'row',
    gap: Spacing['2xl'],
    alignItems: 'flex-start',
  },
  scheduleContent: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['3xl'],
  },
});
