import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Switch, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { FEATURE_MODULE_MAP, SHORTCUT_SLOTS } from "@/modules/featureModules";
import type { FeatureModuleId } from "@/modules/types";

function isFeatureModuleId(value: string): value is FeatureModuleId {
  return Object.prototype.hasOwnProperty.call(FEATURE_MODULE_MAP, value);
}

export default function FeatureModuleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { enabledModules, shortcuts, toggleModule, setShortcut } = useFeatureModules();
  const { track } = useAnalytics();

  const moduleId = typeof id === "string" && isFeatureModuleId(id) ? id : null;
  const module = moduleId ? FEATURE_MODULE_MAP[moduleId] : null;
  useScreenTracking("screen_feature_module_detail");

  const assignedSlot = useMemo(() => {
    if (!moduleId) return null;
    return SHORTCUT_SLOTS.find((slot) => shortcuts[slot] === moduleId) ?? null;
  }, [moduleId, shortcuts]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  if (!moduleId || !module) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.push("/profile")}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>기능 모듈</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallbackText}>존재하지 않는 모듈입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const Icon = module.icon;
  const isEnabled = enabledModules.includes(moduleId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.push("/profile")}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{module.title}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.moduleInfoRow}>
            <View style={styles.moduleIconWrap}>
              <Icon color={Colors.accent} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleDescription}>{module.description}</Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={(value) => {
                const result = toggleModule(moduleId, value);
                if (!result.ok && result.reason) {
                  showAlert("변경 불가", result.reason);
                }
              }}
              trackColor={{ false: Colors.bgMuted, true: Colors.accentBg }}
              thumbColor={isEnabled ? Colors.accent : Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>바로가기 배치</Text>
          <Text style={styles.cardDescription}>
            {assignedSlot
              ? `현재 바로가기 ${assignedSlot.replace("slot", "")}에 배치되어 있습니다.`
              : "아직 바로가기에 배치되지 않았습니다."}
          </Text>
          <View style={styles.shortcutButtons}>
            {SHORTCUT_SLOTS.map((slot) => (
              <Pressable
                key={slot}
                style={[styles.shortcutButton, shortcuts[slot] === moduleId && styles.shortcutButtonActive]}
                onPress={() => {
                  track("feature_module_detail_assign_shortcut", { module_id: moduleId, slot });
                  setShortcut(slot, moduleId);
                }}
              >
                <Text
                  style={[
                    styles.shortcutButtonText,
                    shortcuts[slot] === moduleId && styles.shortcutButtonTextActive,
                  ]}
                >
                  바로가기 {slot.replace("slot", "")}에 배치
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={styles.manageButton}
            onPress={() => {
              track("feature_module_detail_open_shortcut_manager", { module_id: moduleId });
              router.push("/shortcut-manager");
            }}
          >
            <Text style={styles.manageButtonText}>바로가기 관리 열기</Text>
            <ChevronRight size={14} color={Colors.textMuted} />
          </Pressable>
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
  headerPlaceholder: {
    width: 28,
  },
  content: {
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["3xl"],
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    padding: Spacing["2xl"],
    gap: Spacing.md,
  },
  moduleInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  moduleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  moduleDescription: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  cardTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  shortcutButtons: {
    gap: Spacing.sm,
  },
  shortcutButton: {
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
  },
  shortcutButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  shortcutButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  shortcutButtonTextActive: {
    color: Colors.accent,
    fontWeight: "600",
  },
  manageButton: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
  },
  manageButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  fallbackWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: Colors.textMuted,
    fontSize: FontSizes.base,
  },
});
