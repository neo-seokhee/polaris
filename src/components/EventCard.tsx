import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MapPin, Clock } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

interface EventCardProps {
  title: string;
  time: string;
  location: string;
  color: string;
  onPress?: () => void;
}

// 장소 정보에서 장소명만 추출 (주소 제거)
function extractPlaceName(location: string): string {
  if (!location) return '';
  // 쉼표로 구분된 경우 첫 번째 부분만 사용
  const parts = location.split(',');
  return parts[0].trim();
}

export function EventCard({ title, time, location, color, onPress }: EventCardProps) {
  const displayLocation = extractPlaceName(location);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.detailText}>{time}</Text>
          </View>
          {displayLocation ? (
            <View style={styles.locationItem}>
              <MapPin size={12} color={Colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>{displayLocation}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgSecondary,
    padding: Spacing['2xl'],
  },
  indicator: {
    width: 4,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: FontSizes.sm,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    maxWidth: '50%',
  },
  locationText: {
    fontSize: FontSizes.sm,
    fontWeight: '400',
    color: Colors.textMuted,
    flex: 1,
  },
});
