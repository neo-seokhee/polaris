import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import {
  DEFAULT_ENABLED_MODULES,
  DEFAULT_SHORTCUTS,
  FEATURE_MODULE_MAP,
  FEATURE_MODULES,
  SHORTCUT_SLOTS,
} from "@/modules/featureModules";
import { MODULE_CATALOG } from "@/modules/moduleCatalog";
import type { FeatureModuleId, ShortcutConfig, ShortcutSlot } from "@/modules/types";

interface FeatureModulesContextValue {
  ready: boolean;
  enabledModules: FeatureModuleId[];
  shortcuts: ShortcutConfig;
  recentModules: FeatureModuleId[];
  modules: typeof FEATURE_MODULES;
  toggleModule: (id: FeatureModuleId, enabled: boolean) => { ok: boolean; reason?: string };
  setShortcut: (slot: ShortcutSlot, moduleId: FeatureModuleId) => void;
  moveShortcut: (slot: ShortcutSlot, direction: "left" | "right") => void;
  recordModuleUsage: (moduleId: FeatureModuleId) => void;
  restoreDefaults: () => void;
}

const FeatureModulesContext = createContext<FeatureModulesContextValue | undefined>(undefined);

const SHORTCUT_ASSIGNABLE_MODULES = new Set<FeatureModuleId>(
  MODULE_CATALOG.filter((item) => item.status === "available" && item.moduleId)
    .map((item) => item.moduleId as FeatureModuleId)
);

function isShortcutAssignable(moduleId: FeatureModuleId): boolean {
  return SHORTCUT_ASSIGNABLE_MODULES.has(moduleId);
}

function isFeatureModuleId(value: string): value is FeatureModuleId {
  return Object.prototype.hasOwnProperty.call(FEATURE_MODULE_MAP, value);
}

function normalizeEnabled(raw: unknown): FeatureModuleId[] {
  if (!Array.isArray(raw)) return DEFAULT_ENABLED_MODULES;
  const unique = Array.from(new Set(raw.filter((item): item is string => typeof item === "string")));
  const filtered = unique.filter((id): id is FeatureModuleId => isFeatureModuleId(id));
  const base = filtered.length >= 3 ? filtered : DEFAULT_ENABLED_MODULES;
  return base;
}

function normalizeShortcuts(raw: unknown, enabled: FeatureModuleId[]): ShortcutConfig {
  const fallback = { ...DEFAULT_SHORTCUTS };
  const assignableEnabled = enabled.filter(isShortcutAssignable);
  if (assignableEnabled.length < SHORTCUT_SLOTS.length) {
    return fallback;
  }

  if (!raw || typeof raw !== "object") {
    return normalizeShortcuts(fallback, assignableEnabled);
  }

  const source = raw as Partial<Record<ShortcutSlot, string>>;
  const used = new Set<FeatureModuleId>();
  const result: Partial<ShortcutConfig> = {};

  SHORTCUT_SLOTS.forEach((slot) => {
    const candidate = source[slot];
    if (
      candidate &&
      isFeatureModuleId(candidate) &&
      assignableEnabled.includes(candidate) &&
      isShortcutAssignable(candidate) &&
      !used.has(candidate)
    ) {
      result[slot] = candidate;
      used.add(candidate);
      return;
    }

    const next = assignableEnabled.find((id) => !used.has(id)) ?? assignableEnabled[0];
    result[slot] = next;
    used.add(next);
  });

  return result as ShortcutConfig;
}

function normalizeRecent(raw: unknown): FeatureModuleId[] {
  if (!Array.isArray(raw)) return [];
  const unique = Array.from(new Set(raw.filter((item): item is string => typeof item === "string")));
  return unique.filter((id): id is FeatureModuleId => isFeatureModuleId(id));
}

export function FeatureModulesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const storageKey = useMemo(() => `feature-modules:v1:${user?.id ?? "guest"}`, [user?.id]);
  const [ready, setReady] = useState(false);
  const [enabledModules, setEnabledModules] = useState<FeatureModuleId[]>(DEFAULT_ENABLED_MODULES);
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(DEFAULT_SHORTCUTS);
  const [recentModules, setRecentModules] = useState<FeatureModuleId[]>([]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!mounted) return;
        if (!raw) {
          setReady(true);
          return;
        }
        const parsed = JSON.parse(raw) as {
          enabledModules?: unknown;
          shortcuts?: unknown;
          recentModules?: unknown;
        };
        const normalizedEnabled = normalizeEnabled(parsed.enabledModules);
        const normalizedShortcuts = normalizeShortcuts(parsed.shortcuts, normalizedEnabled);
        const normalizedRecent = normalizeRecent(parsed.recentModules);
        setEnabledModules(normalizedEnabled);
        setShortcuts(normalizedShortcuts);
        setRecentModules(normalizedRecent);
      } catch {
        setEnabledModules(DEFAULT_ENABLED_MODULES);
        setShortcuts(DEFAULT_SHORTCUTS);
        setRecentModules([]);
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify({
      enabledModules,
      shortcuts,
      recentModules,
    });
    void AsyncStorage.setItem(storageKey, payload);
  }, [ready, enabledModules, shortcuts, recentModules, storageKey]);

  const toggleModule = useCallback(
    (id: FeatureModuleId, enabled: boolean) => {
      if (enabled) {
        if (enabledModules.includes(id)) return { ok: true };
        setEnabledModules((prev) => [...prev, id]);
        track("feature_module_enabled", { module_id: id });
        return { ok: true };
      }

      if (!enabledModules.includes(id)) return { ok: true };
      if (enabledModules.length <= 3) {
        return { ok: false, reason: "바로가기 1·2·4 슬롯을 채우려면 최소 3개 모듈이 필요합니다." };
      }

      const nextEnabled = enabledModules.filter((moduleId) => moduleId !== id);
      const nextShortcuts = normalizeShortcuts(shortcuts, nextEnabled);
      setEnabledModules(nextEnabled);
      setShortcuts(nextShortcuts);
      track("feature_module_disabled", { module_id: id });
      return { ok: true };
    },
    [enabledModules, shortcuts, track]
  );

  const setShortcut = useCallback(
    (slot: ShortcutSlot, moduleId: FeatureModuleId) => {
      if (!isShortcutAssignable(moduleId)) return;
      setEnabledModules((prev) => (prev.includes(moduleId) ? prev : [...prev, moduleId]));
      setShortcuts((prev) => {
        const otherSlot = SHORTCUT_SLOTS.find((key) => key !== slot && prev[key] === moduleId);
        if (!otherSlot) {
          track("shortcut_assigned", { slot, module_id: moduleId });
          return { ...prev, [slot]: moduleId };
        }
        track("shortcut_swapped", { slot, module_id: moduleId, other_slot: otherSlot });
        return {
          ...prev,
          [slot]: moduleId,
          [otherSlot]: prev[slot],
        };
      });
    },
    [track]
  );

  const moveShortcut = useCallback((slot: ShortcutSlot, direction: "left" | "right") => {
    const index = SHORTCUT_SLOTS.indexOf(slot);
    if (index < 0) return;
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= SHORTCUT_SLOTS.length) return;

    const targetSlot = SHORTCUT_SLOTS[targetIndex];
    setShortcuts((prev) => ({
      ...prev,
      [slot]: prev[targetSlot],
      [targetSlot]: prev[slot],
    }));
    track("shortcut_moved", { slot, direction });
  }, [track]);

  const recordModuleUsage = useCallback((moduleId: FeatureModuleId) => {
    setRecentModules((prev) => {
      if (prev[0] === moduleId) return prev;
      return [moduleId, ...prev.filter((id) => id !== moduleId)];
    });
    track("feature_module_opened", { module_id: moduleId });
  }, [track]);

  const restoreDefaults = useCallback(() => {
    setEnabledModules(DEFAULT_ENABLED_MODULES);
    setShortcuts(DEFAULT_SHORTCUTS);
    track("feature_modules_restored_defaults");
  }, [track]);

  const value = useMemo<FeatureModulesContextValue>(
    () => ({
      ready,
      enabledModules,
      shortcuts,
      recentModules,
      modules: FEATURE_MODULES,
      toggleModule,
      setShortcut,
      moveShortcut,
      recordModuleUsage,
      restoreDefaults,
    }),
    [ready, enabledModules, shortcuts, recentModules, toggleModule, setShortcut, moveShortcut, recordModuleUsage, restoreDefaults]
  );

  return <FeatureModulesContext.Provider value={value}>{children}</FeatureModulesContext.Provider>;
}

export function useFeatureModules() {
  const context = useContext(FeatureModulesContext);
  if (!context) {
    throw new Error("useFeatureModules must be used within FeatureModulesProvider");
  }
  return context;
}
