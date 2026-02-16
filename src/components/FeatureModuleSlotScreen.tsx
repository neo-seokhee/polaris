import { View, ActivityIndicator } from "react-native";
import { useMemo, useEffect } from "react";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { FEATURE_MODULE_MAP } from "@/modules/featureModules";
import type { ShortcutSlot } from "@/modules/types";
import { Colors } from "@/constants/theme";

interface FeatureModuleSlotScreenProps {
  slot: ShortcutSlot;
}

export function FeatureModuleSlotScreen({ slot }: FeatureModuleSlotScreenProps) {
  const { ready, shortcuts, recordModuleUsage } = useFeatureModules();
  const moduleId = shortcuts[slot];

  const ModuleComponent = useMemo(
    () => FEATURE_MODULE_MAP[moduleId]?.component ?? FEATURE_MODULE_MAP.todo.component,
    [moduleId]
  );

  useEffect(() => {
    if (!ready) return;
    recordModuleUsage(moduleId);
  }, [ready, moduleId, recordModuleUsage]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.bgPrimary }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return <ModuleComponent />;
}
