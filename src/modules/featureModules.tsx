import { ListChecks, Target, StickyNote, Wallet, Repeat, Clapperboard } from "lucide-react-native";
import { HomeScreen } from "@/app/(tabs)/index";
import { GoalsScreen } from "@/app/(tabs)/goals";
import { MemoScreen } from "@/app/(tabs)/memo";
import { BudgetModuleScreen } from "@/modules/screens/BudgetModuleScreen";
import { HabitsModuleScreen } from "@/modules/screens/HabitsModuleScreen";
import { SettlementModuleScreen } from "@/modules/screens/SettlementModuleScreen";
import type { FeatureModuleDefinition, FeatureModuleId, ShortcutConfig } from "@/modules/types";

export const DEFAULT_ENABLED_MODULES: FeatureModuleId[] = ["todo", "goals", "memo", "settlement", "budget", "habits"];
export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  slot1: "todo",
  slot2: "goals",
  slot4: "memo",
};

export const SHORTCUT_SLOTS: Array<keyof ShortcutConfig> = ["slot1", "slot2", "slot4"];

export const FEATURE_MODULES: FeatureModuleDefinition[] = [
  {
    id: "todo",
    title: "할일",
    tabLabel: "할일",
    description: "오늘 해야 할 일을 정리하고 우선순위를 관리합니다.",
    icon: ListChecks,
    component: HomeScreen,
  },
  {
    id: "goals",
    title: "목표",
    tabLabel: "목표",
    description: "연간/월간 목표를 등록하고 진행률을 추적합니다.",
    icon: Target,
    component: GoalsScreen,
  },
  {
    id: "memo",
    title: "메모",
    tabLabel: "메모",
    description: "카테고리별 메모를 기록하고 빠르게 검색합니다.",
    icon: StickyNote,
    component: MemoScreen,
  },
  {
    id: "settlement",
    title: "영상 발주 관리",
    tabLabel: "발주",
    description: "영상 작업 발주, 진행 상태, 입금 일정을 통합 관리합니다.",
    icon: Clapperboard,
    component: SettlementModuleScreen,
  },
  {
    id: "budget",
    title: "가계부",
    tabLabel: "가계부",
    description: "수입/지출을 기록하고 소비 패턴을 확인합니다.",
    icon: Wallet,
    component: BudgetModuleScreen,
  },
  {
    id: "habits",
    title: "습관",
    tabLabel: "습관",
    description: "반복 습관과 달성률을 추적합니다.",
    icon: Repeat,
    component: HabitsModuleScreen,
  },
];

export const FEATURE_MODULE_MAP: Record<FeatureModuleId, FeatureModuleDefinition> = FEATURE_MODULES.reduce(
  (acc, module) => {
    acc[module.id] = module;
    return acc;
  },
  {} as Record<FeatureModuleId, FeatureModuleDefinition>
);
