import { View, ScrollView } from "react-native";
import { GoalHeader } from "./GoalHeader";
import { GoalCard, type MonthStatus } from "./GoalCard";

const goals: Array<{
  id: number;
  title: string;
  description: string;
  progress?: string;
  type: "monthly" | "percentage" | "completed";
  monthlyStatus?: MonthStatus[];
  percentage?: number;
}> = [
    {
      id: 1,
      title: "책 30권 읽기",
      description: "매달 최소 3권씩 꾸준히 읽기",
      progress: "8/30",
      type: "monthly",
      monthlyStatus: [
        "complete",
        "complete",
        "partial",
        "failed",
        "failed",
        "failed",
        "pending",
        "pending",
        "pending",
        "pending",
        "pending",
        "pending",
      ],
    },
    {
      id: 2,
      title: "운동 100일 챌린지",
      description: "하루 30분 이상 운동하기",
      progress: "45%",
      type: "percentage",
      percentage: 45,
    },
    {
      id: 3,
      title: "매일 물 2L 마시기",
      description: "건강한 수분 섭취 습관 만들기",
      type: "completed",
      monthlyStatus: Array<MonthStatus>(12).fill("complete"),
    },
  ];

export function GoalScreen() {
  return (
    <ScrollView className="flex-1 px-5 pt-5">
      <GoalHeader />
      <View className="flex flex-1 flex-col gap-3 py-4">
        {goals.map((goal) => (
          <GoalCard key={goal.id} {...goal} />
        ))}
      </View>
    </ScrollView>
  );
}
