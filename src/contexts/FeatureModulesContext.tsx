import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { supabase } from "@/lib/supabase";
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
  lockedModules: Set<FeatureModuleId>;
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

interface PersistedData {
  enabledModules: FeatureModuleId[];
  shortcuts: ShortcutConfig;
  recentModules: FeatureModuleId[];
}

export function FeatureModulesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const { entitlements, canAccessModule } = useEntitlements();
  const storageKey = useMemo(() => `feature-modules:v1:${user?.id ?? "guest"}`, [user?.id]);
  const [ready, setReady] = useState(false);
  const [enabledModules, setEnabledModules] = useState<FeatureModuleId[]>(DEFAULT_ENABLED_MODULES);
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(DEFAULT_SHORTCUTS);
  const [recentModules, setRecentModules] = useState<FeatureModuleId[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(true);

  // --- Compute hidden modules from entitlements ---
  const hiddenModules = useMemo(() => {
    const hidden = new Set<FeatureModuleId>();
    if (!entitlements) return hidden;

    // default_visibility from plan
    for (const [moduleId, visible] of Object.entries(entitlements.default_visibility || {})) {
      if (visible === false && isFeatureModuleId(moduleId)) {
        hidden.add(moduleId);
      }
    }

    // visibility:* overrides (RPC merges plan features + overrides)
    for (const [key, value] of Object.entries(entitlements)) {
      if (key.startsWith('visibility:')) {
        const moduleId = key.replace('visibility:', '');
        if (isFeatureModuleId(moduleId)) {
          if (value === false) hidden.add(moduleId);
          else hidden.delete(moduleId);
        }
      }
    }

    return hidden;
  }, [entitlements]);

  // --- Compute locked modules (visible but plan doesn't include) ---
  const lockedModules = useMemo(() => {
    const locked = new Set<FeatureModuleId>();
    for (const m of FEATURE_MODULES) {
      if (!hiddenModules.has(m.id) && !canAccessModule(m.id)) {
        locked.add(m.id);
      }
    }
    return locked;
  }, [hiddenModules, canAccessModule]);

  // --- Load: Supabase first, fallback to AsyncStorage ---
  useEffect(() => {
    let mounted = true;
    isLoadingRef.current = true;

    void (async () => {
      let data: PersistedData | null = null;

      // 1) Try Supabase (cloud source of truth)
      if (user?.id) {
        try {
          const settingsRes = await supabase
            .from("user_settings")
            .select("feature_modules")
            .eq("user_id", user.id)
            .single();

          if (settingsRes.data?.feature_modules && typeof settingsRes.data.feature_modules === "object") {
            const cloud = settingsRes.data.feature_modules as Record<string, unknown>;
            data = {
              enabledModules: normalizeEnabled(cloud.enabledModules),
              shortcuts: normalizeShortcuts(cloud.shortcuts, normalizeEnabled(cloud.enabledModules)),
              recentModules: normalizeRecent(cloud.recentModules),
            };
          }
        } catch {
          // Supabase unavailable, fall through to local
        }
      }

      // 2) Fallback to AsyncStorage (local cache / offline)
      if (!data) {
        try {
          const raw = await AsyncStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            data = {
              enabledModules: normalizeEnabled(parsed.enabledModules),
              shortcuts: normalizeShortcuts(parsed.shortcuts, normalizeEnabled(parsed.enabledModules)),
              recentModules: normalizeRecent(parsed.recentModules),
            };
          }
        } catch {
          // ignore
        }
      }

      // 3) If we loaded from local but user is logged in, push local → cloud (migration)
      if (data && user?.id) {
        const { data: existing } = await supabase
          .from("user_settings")
          .select("user_id")
          .eq("user_id", user.id)
          .single();

        if (!existing) {
          void supabase.from("user_settings").upsert({
            user_id: user.id,
            feature_modules: data,
          });
        }
      }

      if (!mounted) return;

      if (data) {
        setEnabledModules(data.enabledModules);
        setShortcuts(data.shortcuts);
        setRecentModules(data.recentModules);
      }

      isLoadingRef.current = false;
      setReady(true);
    })();

    return () => { mounted = false; };
  }, [storageKey, user?.id]);

  // --- Save: debounce → AsyncStorage + Supabase ---
  useEffect(() => {
    if (!ready || isLoadingRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const payload = { enabledModules, shortcuts, recentModules };
      const json = JSON.stringify(payload);

      // Local cache
      void AsyncStorage.setItem(storageKey, json);

      // Cloud sync
      if (user?.id) {
        void supabase.from("user_settings").upsert({
          user_id: user.id,
          feature_modules: payload,
        });
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [ready, enabledModules, shortcuts, recentModules, storageKey, user?.id]);

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
        return { ok: false, reason: "바로가기 1·2·4 슬롯을 채우려면 최소 3개 모듈이 필요해요." };
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

  const visibleModules = useMemo(
    () => FEATURE_MODULES.filter((m) => !hiddenModules.has(m.id)),
    [hiddenModules]
  );

  const value = useMemo<FeatureModulesContextValue>(
    () => ({
      ready,
      enabledModules,
      shortcuts,
      recentModules,
      modules: visibleModules,
      lockedModules,
      toggleModule,
      setShortcut,
      moveShortcut,
      recordModuleUsage,
      restoreDefaults,
    }),
    [ready, enabledModules, shortcuts, recentModules, visibleModules, lockedModules, toggleModule, setShortcut, moveShortcut, recordModuleUsage, restoreDefaults]
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
