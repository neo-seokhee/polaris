import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { ScheduleHeader } from "./ScheduleHeader";
import { WeekDaySelector } from "./WeekDaySelector";
import { EventCard } from "./EventCard";

const events = [
  {
    id: 1,
    title: "아침 회의",
    time: "2:00 PM - 3:30 PM",
    location: "7-3 회의실",
    color: "#FFD700",
  },
  {
    id: 2,
    title: "고객 미팅",
    time: "2:00 PM - 3:30 PM",
    location: "신논현 투썸플레이스",
    color: "#22C55E",
  },
];

export function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <ScrollView className="flex-1 gap-5 px-5 pt-5">
      <View className="flex flex-col gap-3">
        <ScheduleHeader />
        <WeekDaySelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </View>
      <View className="flex flex-col gap-3">
        <Text className="text-base font-semibold text-text-primary">
          오늘의 스케쥴
        </Text>
        <View className="flex flex-col gap-2">
          {events.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
