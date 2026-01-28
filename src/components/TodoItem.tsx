import { View, Text, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { Flame, GripVertical } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes, LineHeights } from "@/constants/theme";

interface TodoItemProps {
  id: string;
  title: string;
  time?: string | null;
  isActive: boolean;
  isCompleted: boolean;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onPress: (id: string, title: string) => void;
  drag?: () => void;
  showDragHandle?: boolean;
}

export function TodoItem({
  id,
  title,
  time,
  isActive,
  isCompleted,
  onToggleComplete,
  onToggleActive,
  onPress,
  drag,
  showDragHandle = false,
}: TodoItemProps) {
  const handleToggleActive = () => {
    onToggleActive(id, isActive);
  };

  const handleToggleComplete = () => {
    onToggleComplete(id, isCompleted);
  };

  return (
    <View style={styles.container}>
      {(drag || showDragHandle) && !isCompleted && (
        <Pressable
          onLongPress={drag}
          delayLongPress={100}
          disabled={!drag}
          style={styles.dragHandle}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
        >
          <GripVertical size={16} color={Colors.textMuted} />
        </Pressable>
      )}

      <Pressable
        style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
        onPress={handleToggleComplete}
      >
        {isCompleted && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </Pressable>

      <TouchableOpacity
        style={styles.content}
        onPress={() => onPress(id, title)}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
          {title}
        </Text>
        {time && <Text style={styles.time}>{time}</Text>}
      </TouchableOpacity>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, isActive && styles.actionButtonActive]}
          onPress={handleToggleActive}
        >
          <Flame
            size={16}
            color={isActive ? Colors.accent : Colors.textMuted}
            fill={isActive ? Colors.accent : "transparent"}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  dragHandle: {
    padding: 6,
    marginLeft: -2,
    marginRight: -2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.borderPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCompleted: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: Colors.textOnAccent,
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    lineHeight: LineHeights.md,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
  time: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonActive: {
    backgroundColor: Colors.accentBg,
  },
});
