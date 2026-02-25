import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Colors, FontSizes, Spacing } from "@/constants/theme";

interface GoalHeaderProps {
  year: number;
  onYearChange: (year: number) => void;
}

export function GoalHeader({ year, onYearChange }: GoalHeaderProps) {
  const currentYear = new Date().getFullYear();
  const canGoNext = year < currentYear + 5;
  const canGoPrev = year > currentYear - 10;

  return (
    <View style={styles.container}>
      <View style={styles.yearSelector}>
        <Image source={require('../../assets/sparkle-icon.png')} style={styles.icon} />
        <TouchableOpacity
          onPress={() => canGoPrev && onYearChange(year - 1)}
          disabled={!canGoPrev}
          style={styles.arrowButton}
        >
          <ChevronLeft size={24} color={canGoPrev ? Colors.textPrimary : Colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.yearText}>{year}년</Text>
        <TouchableOpacity
          onPress={() => canGoNext && onYearChange(year + 1)}
          disabled={!canGoNext}
          style={styles.arrowButton}
        >
          <ChevronRight size={24} color={canGoNext ? Colors.textPrimary : Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    width: 23,
    height: 23,
    marginRight: Spacing.sm,
  },
  arrowButton: {
    padding: Spacing.lg,
  },
  yearText: {
    fontSize: FontSizes['3xl'],
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 80,
    textAlign: 'center',
  },
});
