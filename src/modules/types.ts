import type { ComponentType } from "react";

export type FeatureModuleId = "todo" | "goals" | "memo" | "schedule" | "settlement" | "budget" | "habits";
export type ShortcutSlot = "slot1" | "slot2" | "slot4";

export interface FeatureModuleDefinition {
  id: FeatureModuleId;
  title: string;
  tabLabel: string;
  description: string;
  icon: ComponentType<{ color: string; size?: number }>;
  component: ComponentType;
}

export type ShortcutConfig = Record<ShortcutSlot, FeatureModuleId>;
