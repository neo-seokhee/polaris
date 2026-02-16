import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import type { FeatureModuleId } from "@/modules/types";

export default function FeatureModulesScreen() {
  useScreenTracking("screen_feature_modules");
  const { modules, enabledModules, toggleModule, restoreDefaults } = useFeatureModules();
  const { track } = useAnalytics();

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleToggle = (id: FeatureModuleId, enabled: boolean) => {
    const result = toggleModule(id, enabled);
    if (!result.ok && result.reason) {
      showAlert("변경 불가", result.reason);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>기능 모듈</Text>
        <Pressable
          onPress={() => {
            track("feature_modules_restore_defaults_clicked");
            restoreDefaults();
          }}
        >
          <Text style={styles.resetText}>초기화</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>바로가기</Text>
          <Text style={styles.sectionDescription}>하단 탭 바로가기 순서 및 배치를 관리합니다.</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                track("feature_modules_open_shortcut_manager");
                router.push("/shortcut-manager");
              }}
            >
              <View style={styles.menuMeta}>
                <Text style={styles.menuTitle}>바로가기 관리</Text>
                <Text style={styles.menuDescription}>1 · 2 · 4 슬롯 순서/추가/변경</Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>모듈 목록</Text>
          <Text style={styles.sectionDescription}>모듈 사용 여부를 켜고 끌 수 있습니다.</Text>
          <View style={styles.card}>
            {modules.map((module, index) => {
              const Icon = module.icon;
              const isEnabled = enabledModules.includes(module.id);
              return (
                <View key={module.id} style={[styles.moduleRow, index < modules.length - 1 && styles.rowDivider]}>
                  <Pressable
                    style={styles.moduleMeta}
                    onPress={() => {
                      track("feature_modules_open_detail", { module_id: module.id });
                      router.push(`/feature-module/${module.id}`);
                    }}
                  >
                    <View style={styles.moduleIconWrap}>
                      <Icon color={isEnabled ? Colors.accent : Colors.textMuted} size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>{module.title}</Text>
                      <Text style={styles.moduleDescription}>{module.description}</Text>
                    </View>
                  </Pressable>
                  <Switch
                    value={isEnabled}
                    onValueChange={(value) => handleToggle(module.id, value)}
                    trackColor={{ false: Colors.bgMuted, true: Colors.accentBg }}
                    thumbColor={isEnabled ? Colors.accent : Colors.textMuted}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  resetText: {
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: "600",
    paddingHorizontal: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing["4xl"],
    gap: Spacing["3xl"],
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    overflow: "hidden",
  },
  menuRow: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  menuMeta: {
    gap: 2,
    flex: 1,
  },
  menuTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  menuDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
  },
  moduleRow: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  moduleMeta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  moduleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  moduleDescription: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
});
