import { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, LayoutChangeEvent } from "react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const DAYS_RANGE = 60; // 전후 60일씩 (총 121일)
const VISIBLE_DAYS = 7; // 화면에 보이는 날짜 수

interface WeekDaySelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

interface DayItem {
  date: Date;
  dayName: string;
  dayNumber: number;
  month: number;
  isToday: boolean;
  isSelected: boolean;
}

function generateDays(selectedDate: Date): DayItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(selectedDate);
  selected.setHours(0, 0, 0, 0);

  const days: DayItem[] = [];

  for (let i = -DAYS_RANGE; i <= DAYS_RANGE; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);

    days.push({
      date,
      dayName: DAY_NAMES[date.getDay()],
      dayNumber: date.getDate(),
      month: date.getMonth() + 1,
      isToday: i === 0,
      isSelected: date.getTime() === selected.getTime(),
    });
  }

  return days;
}

export function WeekDaySelector({ selectedDate, onDateChange }: WeekDaySelectorProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [itemWidth, setItemWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const hasScrolledToToday = useRef(false);

  const days = generateDays(selectedDate);
  const todayIndex = DAYS_RANGE; // 오늘은 항상 중앙 인덱스

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setContainerWidth(width);
    // 7개 날짜가 보이도록 아이템 너비 계산 (gap 포함)
    const gap = Spacing.sm;
    const calculatedItemWidth = (width - gap * (VISIBLE_DAYS - 1)) / VISIBLE_DAYS;
    setItemWidth(calculatedItemWidth);
  };

  // 오늘 날짜를 중앙에 위치시키기
  useEffect(() => {
    if (itemWidth > 0 && scrollViewRef.current && !hasScrolledToToday.current) {
      const gap = Spacing.sm;
      const totalItemWidth = itemWidth + gap;
      // 오늘이 중앙(4번째)에 오도록 스크롤 위치 계산
      const scrollX = todayIndex * totalItemWidth - (containerWidth / 2) + (itemWidth / 2);

      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: false });
        hasScrolledToToday.current = true;
      }, 50);
    }
  }, [itemWidth, containerWidth]);

  if (itemWidth === 0) {
    return <View style={styles.container} onLayout={handleLayout} />;
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={itemWidth + Spacing.sm}
        decelerationRate="fast"
      >
        {days.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayItem,
              { width: itemWidth },
              item.isSelected && styles.dayItemActive,
              item.isToday && !item.isSelected && styles.dayItemToday,
            ]}
            onPress={() => onDateChange(item.date)}
          >
            {item.dayNumber === 1 && (
              <Text style={[
                styles.monthText,
                item.isSelected && styles.monthTextActive,
              ]}>
                {item.month}월
              </Text>
            )}
            <Text style={[
              styles.dateText,
              item.isSelected && styles.dateTextActive,
              item.isToday && !item.isSelected && styles.dateTextToday,
            ]}>
              {item.dayNumber}
            </Text>
            <Text style={[
              styles.dayText,
              item.isSelected && styles.dayTextActive,
              item.isToday && !item.isSelected && styles.dayTextToday,
            ]}>
              {item.dayName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingHorizontal: 0,
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.bgSecondary,
  },
  dayItemActive: {
    backgroundColor: Colors.accent,
  },
  dayItemToday: {
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  monthText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    color: Colors.accent,
    marginBottom: 2,
  },
  monthTextActive: {
    color: Colors.textOnDark,
  },
  dateText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateTextActive: {
    color: Colors.textOnDark,
  },
  dateTextToday: {
    color: Colors.accent,
  },
  dayText: {
    fontSize: FontSizes.xs,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  dayTextActive: {
    color: Colors.textOnDark,
  },
  dayTextToday: {
    color: Colors.accent,
  },
});
