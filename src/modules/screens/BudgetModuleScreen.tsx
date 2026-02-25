import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { Wallet } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { StatusBanners } from "@/components/StatusBanners";
import { FeatureModuleHeader } from "@/components/FeatureModuleHeader";

export function BudgetModuleScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBanners />
      <FeatureModuleHeader title="가계부" />
      <View style={styles.content}>
        <View style={styles.card}>
          <Wallet size={24} color={Colors.accent} />
          <Text style={styles.title}>가계부 모듈 (샘플)</Text>
          <Text style={styles.description}>
            월별 수입/지출을 기록하고 카테고리별로 소비 흐름을 확인할 수 있는 모듈입니다.
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
