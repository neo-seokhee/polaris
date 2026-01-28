import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Plus, Sparkles } from "lucide-react-native";
import { Colors, FontSizes, Spacing } from "@/constants/theme";

export function ScheduleHeader() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const dayName = dayNames[today.getDay()];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.dateContainer}>
          <Sparkles size={20} color={Colors.accent} fill={Colors.accent} />
          <Text style={styles.dateText}>
            {year}년 {month}월 {date}일
          </Text>
          <Text style={styles.dayText}>{dayName}</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color={Colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dateText: {
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dayText: {
    fontSize: FontSizes.base,
    fontWeight: '500',
    color: Colors.accent,
  },
  addButton: {
    padding: Spacing.sm,
  },
});
