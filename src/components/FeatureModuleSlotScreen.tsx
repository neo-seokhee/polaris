import { View, Text, Pressable, StyleSheet } from "react-native";
import { useMemo, useEffect } from "react";
import { Lock } from "lucide-react-native";
import { ModuleSkeleton } from "@/components/Skeleton";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { FEATURE_MODULE_MAP } from "@/modules/featureModules";
import type { ShortcutSlot } from "@/modules/types";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";

interface FeatureModuleSlotScreenProps {
  slot: ShortcutSlot;
}

function LockedModuleView({ moduleName, onUpgrade }: { moduleName?: string; onUpgrade: () => void }) {
  return (
    <View style={lockedStyles.container}>
      <View style={lockedStyles.iconWrap}>
        <Lock size={32} color={Colors.textMuted} />
      </View>
      <Text style={lockedStyles.title}>{moduleName || '이 모듈'}</Text>
      <Text style={lockedStyles.description}>
        이 모듈은 스토어에서{'\n'}구매 후 사용할 수 있습니다.
      </Text>
      <Pressable style={lockedStyles.button} onPress={onUpgrade}>
        <Text style={lockedStyles.buttonText}>스토어 보기</Text>
      </Pressable>
    </View>
  );
}

export function FeatureModuleSlotScreen({ slot }: FeatureModuleSlotScreenProps) {
  const { ready, shortcuts, recordModuleUsage } = useFeatureModules();
  const { showUpgradePrompt, canAccessModule, loading: entitlementsLoading } = useEntitlements();
  const moduleId = shortcuts[slot];

  const moduleDef = FEATURE_MODULE_MAP[moduleId];

  const ModuleComponent = useMemo(
    () => moduleDef?.component ?? FEATURE_MODULE_MAP.todo.component,
    [moduleId]
  );

  useEffect(() => {
    if (!ready) return;
    recordModuleUsage(moduleId);
  }, [ready, moduleId, recordModuleUsage]);

  if (!ready || entitlementsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPrimary }}>
        <ModuleSkeleton />
      </View>
    );
  }

  if (!canAccessModule(moduleId)) {
    return (
      <LockedModuleView
        moduleName={moduleDef?.title}
        onUpgrade={() => showUpgradePrompt(
          moduleDef?.title || '이 모듈',
          `${moduleDef?.title || '이 모듈'}은(는) 스토어에서 구매 후 사용할 수 있습니다.`
        )}
      />
    );
  }

  return <ModuleComponent />;
}

const lockedStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bgPrimary,
    padding: Spacing['4xl'],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing['3xl'],
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  description: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing['4xl'],
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['4xl'],
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.textOnDark,
  },
});
