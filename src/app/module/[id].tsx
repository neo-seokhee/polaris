import { useMemo, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { FEATURE_MODULE_MAP } from "@/modules/featureModules";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import type { FeatureModuleId } from "@/modules/types";

function isFeatureModuleId(value: string): value is FeatureModuleId {
  return Object.prototype.hasOwnProperty.call(FEATURE_MODULE_MAP, value);
}

export default function ModuleEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recordModuleUsage } = useFeatureModules();

  const module = useMemo(() => {
    if (!id || typeof id !== "string" || !isFeatureModuleId(id)) {
      return null;
    }
    return FEATURE_MODULE_MAP[id];
  }, [id]);

  useScreenTracking("screen_module_entry");

  useEffect(() => {
    if (!module?.id) return;
    recordModuleUsage(module.id);
  }, [module?.id, recordModuleUsage]);

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
});
