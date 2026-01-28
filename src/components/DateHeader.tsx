import { View, Text, StyleSheet, Image } from "react-native";
import { Colors, FontSizes, Spacing } from "@/constants/theme";

const DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export function DateHeader() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  const day = DAYS[today.getDay()];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Image source={require('../../assets/sparkle-icon.png')} style={styles.icon} />
        <Text style={styles.date}>{year}년 {month}월 {date}일</Text>
        <Text style={styles.day}>{day}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 23,
    height: 23,
  },
  date: {
    fontSize: FontSizes['3xl'],
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  day: {
    fontSize: FontSizes.base,
    fontWeight: '400',
    color: Colors.accent,
  },
});
