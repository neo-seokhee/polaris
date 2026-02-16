import { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings, RefreshCw, Calendar, Plus, Sparkles } from "lucide-react-native";
import { router } from "expo-router";
import { DateHeader } from "@/components/DateHeader";
import { WeekDaySelector } from "@/components/WeekDaySelector";
import { EventCard } from "@/components/EventCard";
import { GoogleCalendarSettingsModal } from "@/components/GoogleCalendarSettingsModal";
import { AddEventModal } from "@/components/AddEventModal";
import { EventDetailModal } from "@/components/EventDetailModal";
import { DemoBanner } from "@/components/DemoBanner";
import { useGoogleCalendar, UnifiedEvent } from "@/hooks/useGoogleCalendar";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { DEMO_SCHEDULES } from "@/data/demoData";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";

function formatEventTime(startTime: Date, endTime: Date): string {
    const formatTime = (date: Date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${period}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export default function ScheduleScreen() {
    useScreenTracking('screen_schedule');

    const { isDemoMode } = useAuth();
    const { checkDemoAndNudge } = useDemoNudge();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);

    const {
        isConnected,
        isLoading,
        isSyncing,
        calendars,
        getEventsForDate,
        sync,
        toggleCalendar,
        connect,
        disconnect,
        email,
        addEvent,
        editEvent,
        removeEvent,
    } = useGoogleCalendar();

    const hasSyncedOnMount = useRef(false);

    // 탭 진입 시 자동 동기화
    useEffect(() => {
        if (!isDemoMode && isConnected && !hasSyncedOnMount.current && !isSyncing && !isLoading) {
            hasSyncedOnMount.current = true;
            sync();
        }
    }, [isConnected, isLoading, isDemoMode]);

    // 데모 모드용 이벤트 데이터
    const getDemoEventsForDate = (date: Date): UnifiedEvent[] => {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        return DEMO_SCHEDULES
            .filter((schedule) => {
                const startTime = new Date(schedule.start_time);
                return startTime >= targetDate && startTime < nextDate;
            })
            .map((schedule) => ({
                id: schedule.id,
                calendarId: 'demo',
                calendarName: '데모 캘린더',
                title: schedule.title,
                startTime: new Date(schedule.start_time),
                endTime: new Date(schedule.end_time),
                location: schedule.location,
                color: schedule.color,
            }));
    };

    const eventsForSelectedDate = useMemo(() => {
        if (isDemoMode) {
            return getDemoEventsForDate(selectedDate);
        }
        return getEventsForDate(selectedDate);
    }, [selectedDate, getEventsForDate, isDemoMode]);

    const handleRefresh = async () => {
        await sync();
    };

    const handleEventCreated = () => {
        // 일정이 이미 로컬 상태에 추가됨 - 전체 동기화 불필요
    };

    const handleEventPress = (event: UnifiedEvent) => {
        setSelectedEvent(event);
        setShowDetailModal(true);
    };

    const isToday = useMemo(() => {
        const today = new Date();
        return (
            selectedDate.getDate() === today.getDate() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getFullYear() === today.getFullYear()
        );
    }, [selectedDate]);

    const getSectionTitle = () => {
        if (isToday) return '오늘의 스케쥴';
        const month = selectedDate.getMonth() + 1;
        const day = selectedDate.getDate();
        return `${month}월 ${day}일 스케쥴`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <DemoBanner />
            <View style={styles.fixedHeader}>
                <View style={styles.headerRow}>
                    <View style={styles.dateHeaderWrapper}>
                        <DateHeader />
                    </View>
                    <View style={styles.headerActions}>
                        {!isDemoMode && (
                            <>
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={handleRefresh}
                                    disabled={isSyncing || !isConnected}
                                >
                                    {isSyncing ? (
                                        <ActivityIndicator size="small" color={Colors.accent} />
                                    ) : (
                                        <RefreshCw size={20} color={isConnected ? Colors.textSecondary : Colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={() => setShowSettingsModal(true)}
                                >
                                    <Settings size={20} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.weekSection}>
                    <WeekDaySelector
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                    />
                </View>
                <View style={styles.eventsSection}>
                    <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>

                    {/* 데모 모드 넛지 배너 */}
                    {isDemoMode && (
                        <Pressable
                            style={styles.demoNudgeBanner}
                            onPress={() => {
                                router.push('/(tabs)/profile');
                            }}
                        >
                            <Sparkles size={14} color={Colors.accent} />
                            <Text style={styles.demoNudgeText}>
                                Google Calendar를 연동하면 이렇게 보여요!
                            </Text>
                        </Pressable>
                    )}

                    {isLoading && !isDemoMode ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.accent} />
                        </View>
                    ) : !isConnected && !isDemoMode ? (
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>Google Calendar에 연결하세요</Text>
                            <TouchableOpacity
                                style={styles.connectButton}
                                onPress={() => setShowSettingsModal(true)}
                            >
                                <Text style={styles.connectButtonText}>연결하기</Text>
                            </TouchableOpacity>
                        </View>
                    ) : eventsForSelectedDate.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>일정이 없습니다</Text>
                        </View>
                    ) : (
                        <View style={styles.eventsList}>
                            {eventsForSelectedDate.map((event) => (
                                <EventCard
                                    key={event.id}
                                    title={event.title}
                                    time={formatEventTime(event.startTime, event.endTime)}
                                    location={event.location || ''}
                                    color={event.color}
                                    onPress={() => isDemoMode ? checkDemoAndNudge('일정 상세보기') : handleEventPress(event)}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <GoogleCalendarSettingsModal
                visible={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                isConnected={isConnected}
                email={email}
                calendars={calendars}
                isSyncing={isSyncing}
                onConnect={connect}
                onDisconnect={disconnect}
                onToggleCalendar={toggleCalendar}
                onSync={sync}
            />

            <AddEventModal
                visible={showAddEventModal}
                onClose={() => setShowAddEventModal(false)}
                onEventCreated={handleEventCreated}
                initialDate={selectedDate}
                calendars={calendars}
                addEvent={addEvent}
            />

            <EventDetailModal
                visible={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedEvent(null);
                }}
                event={selectedEvent}
                calendars={calendars}
                onUpdate={editEvent}
                onDelete={removeEvent}
            />

            {/* 일정 추가 FAB */}
            {(isConnected || isDemoMode) && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        if (isDemoMode) {
                            checkDemoAndNudge('일정을 추가');
                            return;
                        }
                        setShowAddEventModal(true);
                    }}
                >
                    <Plus size={24} color={Colors.textOnDark} strokeWidth={2.5} />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    fixedHeader: {
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.md,
        backgroundColor: Colors.bgPrimary,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateHeaderWrapper: {
        flex: 1,
        flexShrink: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flexShrink: 0,
    },
    headerButton: {
        padding: Spacing.md,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: Spacing['3xl'],
    },
    content: {
        paddingBottom: 100, // FAB 버튼 높이 + 여유 공간
    },
    weekSection: {
        paddingVertical: Spacing.md,
    },
    eventsSection: {
        gap: Spacing.md,
        paddingTop: Spacing['2xl'],
    },
    sectionTitle: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    eventsList: {
        gap: Spacing.md,
    },
    loadingContainer: {
        paddingVertical: Spacing['4xl'],
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: Spacing['4xl'],
        alignItems: 'center',
        gap: Spacing.lg,
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
        marginTop: Spacing.md,
    },
    demoNudgeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.bgSecondary,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.accent + '30',
    },
    demoNudgeText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    connectButton: {
        marginTop: Spacing.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing['2xl'],
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.lg,
    },
    connectButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    fab: {
        position: 'absolute',
        right: Spacing['3xl'],
        bottom: Spacing['3xl'],
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
        elevation: 8,
    },
});
