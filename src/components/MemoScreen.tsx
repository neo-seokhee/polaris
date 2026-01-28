import { View, ScrollView } from "react-native";
import { MemoHeader } from "./MemoHeader";
import { MemoCard } from "./MemoCard";

const memos = [
  {
    id: 1,
    category: "아이디어",
    categoryColor: "#FFD700",
    content:
      "프로젝트 아이디어: 사용자 경험을 개선할 수 있는 새로운 인터페이스 디자인. 특히 모바일 환경에서의 터치 인터랙션과...",
    time: "오늘 오전 10:23",
    isStarred: true,
    isExpanded: false,
  },
  {
    id: 2,
    category: "회의",
    categoryColor: "#3B82F6",
    content: "회의 내용 정리: 다음 주 목표 설정 및 역할 분담 완료",
    time: "어제",
    isStarred: false,
    isExpanded: false,
  },
  {
    id: 3,
    category: "독서",
    categoryColor: "#22C55E",
    content: `독서 노트: 좋은 습관을 만드는 작은 변화의 힘

아주 작은 습관이라도 매일 꾸준히 실천하면 큰 변화를 만들 수 있다. 1%씩 개선하는 것이 중요하며, 습관의 복리 효과는 시간이 지날수록 기하급수적으로 증가한다.

핵심 내용:
- 습관 형성의 4단계: 신호, 갈망, 반응, 보상
- 환경을 디자인하여 좋은 습관을 쉽게 만들기
- 작은 성공을 축하하며 동기부여 유지하기`,
    time: "1주일 전",
    isStarred: true,
    isExpanded: true,
    isSelected: true,
  },
];

export function MemoScreen() {
  return (
    <ScrollView className="flex-1 px-5 pt-5">
      <MemoHeader />
      <View className="flex flex-1 flex-col gap-3 pt-3">
        {memos.map((memo) => (
          <MemoCard key={memo.id} {...memo} />
        ))}
      </View>
    </ScrollView>
  );
}
