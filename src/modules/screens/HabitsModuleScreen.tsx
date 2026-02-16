import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { Repeat } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { DemoBanner } from "@/components/DemoBanner";
import { FeatureModuleHeader } from "@/components/FeatureModuleHeader";

export function HabitsModuleScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <DemoBanner />
      <FeatureModuleHeader title="습관" />
      <View style={styles.content}>
        <View style={styles.card}>
          <Repeat size={24} color={Colors.accent} />
          <Text style={styles.title}>습관 트래커 모듈 (샘플)</Text>
          <Text style={styles.description}>
            반복 습관을 만들고, 연속 달성일과 주간 체크를 통해 꾸준함을 관리할 수 있는 모듈입니다.
          </Text>
          <Text style={styles.badge}>준비중</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing["3xl"],
    gap: Spacing.lg,
  },
  title: {
    fontSize: FontSizes["2xl"],
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  description: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.accentBg,
    color: Colors.accent,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
});
