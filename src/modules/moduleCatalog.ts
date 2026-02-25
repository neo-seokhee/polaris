import type { ComponentType } from "react";
import {
  ListChecks,
  Target,
  StickyNote,
  CalendarDays,
  CircleDollarSign,
  Clapperboard,
  BatteryFull,
  AlarmClock,
  Flag,
  CreditCard,
  Sparkles,
} from "lucide-react-native";
import type { FeatureModuleId } from "@/modules/types";

export type ModuleCatalogCategory = "핵심 생산성" | "라이프 관리" | "성장 도구";
export type ModuleCatalogStatus = "available" | "comingSoon";

export interface ModuleCatalogItem {
  key: string;
  title: string;
  description: string;
  category: ModuleCatalogCategory;
  status: ModuleCatalogStatus;
  icon: ComponentType<{ color: string; size?: number }>;
  moduleId?: FeatureModuleId;
}

export const MODULE_CATALOG: ModuleCatalogItem[] = [
  {
    key: "todo",
    title: "할일",
    description: "오늘 해야 할 일을 정리하고 우선순위를 관리합니다.",
    category: "핵심 생산성",
    status: "available",
    icon: ListChecks,
    moduleId: "todo",
  },
  {
    key: "goals",
    title: "목표",
    description: "연간/월간 목표를 등록하고 진행률을 추적합니다.",
    category: "핵심 생산성",
    status: "available",
    icon: Target,
    moduleId: "goals",
  },
  {
    key: "memo",
    title: "메모",
    description: "카테고리별 메모를 기록하고 빠르게 검색합니다.",
    category: "핵심 생산성",
    status: "available",
    icon: StickyNote,
    moduleId: "memo",
  },
  {
    key: "schedule",
    title: "일정",
    description: "일정을 관리하고 캘린더와 연동합니다.",
    category: "핵심 생산성",
    status: "available",
    icon: CalendarDays,
    moduleId: "schedule",
  },
  {
    key: "settlement",
    title: "영상 발주 관리",
    description: "영상 발주 작업, 진행 단계, 입금 일정을 한눈에 추적합니다.",
    category: "핵심 생산성",
    status: "available",
    icon: Clapperboard,
    moduleId: "settlement",
  },
  {
    key: "budget",
    title: "자산 관리",
    description: "수입/지출과 자산 흐름을 한눈에 확인합니다.",
    category: "라이프 관리",
    status: "comingSoon",
    icon: CircleDollarSign,
    moduleId: "budget",
  },
  {
    key: "habits",
    title: "마음 챙김",
    description: "마음 컨디션을 기록하고 루틴을 관리합니다.",
    category: "라이프 관리",
    status: "comingSoon",
    icon: BatteryFull,
    moduleId: "habits",
  },
  {
    key: "focus-timer",
    title: "몰입 타이머",
    description: "집중 세션을 설정하고 작업 흐름을 관리합니다.",
    category: "성장 도구",
    status: "comingSoon",
    icon: AlarmClock,
  },
  {
    key: "vision-board",
    title: "비전보드",
    description: "목표 이미지를 모아 동기부여 보드를 구성합니다.",
    category: "성장 도구",
    status: "comingSoon",
    icon: Flag,
  },
  {
    key: "subscription",
    title: "구독 관리",
    description: "정기결제 내역과 갱신 일정을 모아 관리합니다.",
    category: "라이프 관리",
    status: "comingSoon",
    icon: CreditCard,
  },
  {
    key: "long-term-plan",
    title: "장기 계획",
    description: "분기/연 단위 계획을 세우고 점검합니다.",
    category: "성장 도구",
    status: "comingSoon",
    icon: Sparkles,
  },
];

export const MODULE_CATALOG_MAP: Record<string, ModuleCatalogItem> = MODULE_CATALOG.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {} as Record<string, ModuleCatalogItem>);

export const MODULE_CATEGORY_ORDER: ModuleCatalogCategory[] = ["핵심 생산성", "라이프 관리", "성장 도구"];

export function getModuleCatalogByCategory() {
  return MODULE_CATEGORY_ORDER.map((category) => ({
    category,
    items: MODULE_CATALOG.filter((item) => item.category === category),
  }));
}
