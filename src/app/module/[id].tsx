import { useMemo, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Lock } from "lucide-react-native";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { FEATURE_MODULE_MAP } from "@/modules/featureModules";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import type { FeatureModuleId } from "@/modules/types";

function isFeatureModuleId(value: string): value is FeatureModuleId {
  return Object.prototype.hasOwnProperty.call(FEATURE_MODULE_MAP, value);
}

export default function ModuleEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recordModuleUsage } = useFeatureModules();
  const { showUpgradePrompt, canAccessModule, loading: entitlementsLoading } = useEntitlements();

  const module = useMemo(() => {
    if (!id || typeof id !== "string" || !isFeatureModuleId(id)) {
      return null;
    }
    return FEATURE_MODULE_MAP[id];
  }, [id]);

  const moduleId = module?.id ?? null;
  const isLocked = moduleId && !entitlementsLoading ? !canAccessModule(moduleId) : false;

  useScreenTracking("screen_module_entry");

  useEffect(() => {
    if (!moduleId || isLocked) return;
    recordModuleUsage(moduleId);
  }, [moduleId, isLocked, recordModuleUsage]);

  if (!module) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.push("/profile")}>
            <ArrowLeft size={18} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle}>기능 모듈</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallbackText}>존재하지 않는 모듈입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLocked) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.push("/profile")}>
            <ArrowLeft size={18} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle}>{module.title}</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <View style={styles.lockedWrap}>
          <View style={styles.lockedIconWrap}>
            <Lock size={32} color={Colors.textMuted} />
          </View>
          <Text style={styles.lockedTitle}>{module.title}은(는) Pro 전용입니다</Text>
          <Text style={styles.lockedDesc}>
            Pro 플랜으로 업그레이드하면{'\n'}이 모듈을 사용할 수 있습니다.
          </Text>
          <Pressable
            style={styles.upgradeButton}
            onPress={() => showUpgradePrompt(module.title, `${module.title}은(는) Pro 플랜에서 사용할 수 있습니다.`)}
          >
            <Text style={styles.upgradeButtonText}>Pro 시작하기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const ModuleComponent = module.component;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.push("/profile")}>
          <ArrowLeft size={18} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{module.title}</Text>
        <View style={styles.topBarSpacer} />
      </View>
      <View style={styles.content}>
        <ModuleComponent />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  topBar: {
    height: 44,
    paddingHorizontal: Spacing["3xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
    backgroundColor: Colors.bgPrimary,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
  },
  topBarTitle: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  topBarSpacer: {
    width: 28,
    height: 28,
  },
  content: {
    flex: 1,
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
  lockedWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing['4xl'],
  },
  lockedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing['3xl'],
  },
  lockedTitle: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  lockedDesc: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing['4xl'],
  },
  upgradeButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['4xl'],
    minWidth: 200,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.textOnDark,
  },
});
