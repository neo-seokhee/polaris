import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TextInput, ScrollView, Platform, Alert, ActivityIndicator } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, Clock, MapPin, FileText, ChevronDown } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { CalendarWithEnabled } from "@/hooks/useGoogleCalendar";
import type { CreateEventParams } from "@/lib/googleCalendar";

interface AddEventModalProps {
    visible: boolean;
    onClose: () => void;
    onEventCreated?: () => void;
    initialDate?: Date;
    calendars: CalendarWithEnabled[];
    addEvent: (params: CreateEventParams) => Promise<{ success: boolean; error?: string }>;
}

export function AddEventModal({ visible, onClose, onEventCreated, initialDate, calendars, addEvent }: AddEventModalProps) {

    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(initialDate || new Date());
    const [endDate, setEndDate] = useState(() => {
        const end = new Date(initialDate || new Date());
        end.setHours(end.getHours() + 1);
        return end;
    });

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
    const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
    const [showCalendarPicker, setShowCalendarPicker] = useState(false);

    // 캘린더 목록이 로드되면 primary 캘린더 선택
    useEffect(() => {
        if (calendars.length > 0) {
            const primaryCalendar = calendars.find(c => c.primary);
            if (primaryCalendar) {
                setSelectedCalendarId(primaryCalendar.id);
            }
        }
    }, [calendars]);

    // 초기 날짜 설정
    useEffect(() => {
        if (visible && initialDate) {
            setStartDate(initialDate);
            const end = new Date(initialDate);
            end.setHours(end.getHours() + 1);
            setEndDate(end);
        }
    }, [visible, initialDate]);

    const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
    const writableCalendars = calendars.filter(c => c.isEnabled);

    const resetForm = () => {
        setTitle('');
        setLocation('');
        setDescription('');
        const now = new Date();
        setStartDate(now);
        const end = new Date(now);
        end.setHours(end.getHours() + 1);
        setEndDate(end);
        const primaryCalendar = calendars.find(c => c.primary);
        setSelectedCalendarId(primaryCalendar?.id || 'primary');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const formatDateTime = (date: Date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? '오후' : '오전';
        const displayHours = hours % 12 || 12;
        return `${month}월 ${day}일 ${period} ${displayHours}:${minutes}`;
    };

    // 웹용 datetime-local 포맷
    const toDateTimeLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleWebStartDateChange = (e: any) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setStartDate(newDate);
            if (newDate >= endDate) {
                const newEnd = new Date(newDate);
                newEnd.setHours(newEnd.getHours() + 1);
                setEndDate(newEnd);
            }
        }
    };

    const handleWebEndDateChange = (e: any) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setEndDate(newDate);
        }
    };

    const handleStartDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowStartPicker(false);
        }

        if (selectedDate) {
            setStartDate(selectedDate);
            if (selectedDate >= endDate) {
                const newEnd = new Date(selectedDate);
                newEnd.setHours(newEnd.getHours() + 1);
                setEndDate(newEnd);
            }

            if (Platform.OS === 'android' && startPickerMode === 'date') {
                setStartPickerMode('time');
                setShowStartPicker(true);
            } else {
                setStartPickerMode('date');
            }
        }
    };

    const handleEndDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowEndPicker(false);
        }

        if (selectedDate) {
            setEndDate(selectedDate);

            if (Platform.OS === 'android' && endPickerMode === 'date') {
                setEndPickerMode('time');
                setShowEndPicker(true);
            } else {
                setEndPickerMode('date');
            }
        }
    };

    const showStartDateTimePicker = () => {
        setStartPickerMode('date');
        setShowStartPicker(true);
    };

    const showEndDateTimePicker = () => {
        setEndPickerMode('date');
        setShowEndPicker(true);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('오류', '일정 제목을 입력해주세요.');
            return;
        }

        if (endDate <= startDate) {
            Alert.alert('오류', '종료 시간은 시작 시간보다 이후여야 합니다.');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await addEvent({
                title: title.trim(),
                startTime: startDate,
                endTime: endDate,
                location: location.trim() || undefined,
                description: description.trim() || undefined,
                calendarId: selectedCalendarId,
            });

            if (result.success) {
                const calendarName = selectedCalendar?.summary || 'Google Calendar';
                Alert.alert('완료', `일정이 "${calendarName}"에 추가되었습니다.`);
                handleClose();
                onEventCreated?.();
            } else {
                Alert.alert('오류', result.error || '일정 추가에 실패했습니다.');
            }
        } catch (err: any) {
            Alert.alert('오류', err.message || '일정 추가에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>일정 추가</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* 캘린더 선택 */}
                        {writableCalendars.length > 0 && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>캘린더</Text>
                                <TouchableOpacity
                                    style={styles.calendarSelector}
                                    onPress={() => setShowCalendarPicker(!showCalendarPicker)}
                                >
                                    <View style={styles.calendarSelectorContent}>
                                        {selectedCalendar && (
                                            <View
                                                style={[
                                                    styles.calendarColorDot,
                                                    { backgroundColor: selectedCalendar.backgroundColor || Colors.accent }
                                                ]}
                                            />
                                        )}
                                        <Text style={styles.calendarSelectorText}>
                                            {selectedCalendar?.summary || '캘린더 선택'}
                                        </Text>
                                    </View>
                                    <ChevronDown
                                        size={18}
                                        color={Colors.textSecondary}
                                        style={showCalendarPicker ? { transform: [{ rotate: '180deg' }] } : undefined}
                                    />
                                </TouchableOpacity>

                                {showCalendarPicker && (
                                    <View style={styles.calendarDropdown}>
                                        {writableCalendars.map((calendar) => (
                                            <TouchableOpacity
                                                key={calendar.id}
                                                style={[
                                                    styles.calendarOption,
                                                    selectedCalendarId === calendar.id && styles.calendarOptionSelected,
                                                ]}
                                                onPress={() => {
                                                    setSelectedCalendarId(calendar.id);
                                                    setShowCalendarPicker(false);
                                                }}
                                            >
                                                <View
                                                    style={[
                                                        styles.calendarColorDot,
                                                        { backgroundColor: calendar.backgroundColor || Colors.accent }
                                                    ]}
                                                />
                                                <Text
                                                    style={[
                                                        styles.calendarOptionText,
                                                        selectedCalendarId === calendar.id && styles.calendarOptionTextSelected,
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {calendar.summary}
                                                    {calendar.primary && ' (기본)'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* 일정 제목 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>일정 제목 *</Text>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="일정 제목을 입력하세요"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        {/* 시작 시간 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>시작</Text>
                            {Platform.OS === 'web' ? (
                                <View style={styles.dateButton}>
                                    <Clock size={18} color={Colors.textSecondary} />
                                    <input
                                        type="datetime-local"
                                        value={toDateTimeLocal(startDate)}
                                        onChange={handleWebStartDateChange}
                                        style={{
                                            flex: 1,
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: Colors.textPrimary,
                                            fontSize: 16,
                                            outline: 'none',
                                        }}
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.dateButton} onPress={showStartDateTimePicker}>
                                    <Clock size={18} color={Colors.textSecondary} />
                                    <Text style={styles.dateButtonText}>{formatDateTime(startDate)}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 종료 시간 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>종료</Text>
                            {Platform.OS === 'web' ? (
                                <View style={styles.dateButton}>
                                    <Clock size={18} color={Colors.textSecondary} />
                                    <input
                                        type="datetime-local"
                                        value={toDateTimeLocal(endDate)}
                                        onChange={handleWebEndDateChange}
                                        min={toDateTimeLocal(startDate)}
                                        style={{
                                            flex: 1,
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: Colors.textPrimary,
                                            fontSize: 16,
                                            outline: 'none',
                                        }}
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.dateButton} onPress={showEndDateTimePicker}>
                                    <Clock size={18} color={Colors.textSecondary} />
                                    <Text style={styles.dateButtonText}>{formatDateTime(endDate)}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 장소 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>장소</Text>
                            <View style={styles.inputWithIcon}>
                                <MapPin size={18} color={Colors.textMuted} />
                                <TextInput
                                    style={styles.inputInner}
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder="장소를 입력하세요 (선택)"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>
                        </View>

                        {/* 설명 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>설명</Text>
                            <View style={[styles.inputWithIcon, styles.textAreaContainer]}>
                                <FileText size={18} color={Colors.textMuted} style={styles.textAreaIcon} />
                                <TextInput
                                    style={[styles.inputInner, styles.textArea]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="설명을 입력하세요 (선택)"
                                    placeholderTextColor={Colors.textMuted}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            isSubmitting && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={Colors.textOnDark} />
                        ) : (
                            <Text style={styles.submitButtonText}>일정 추가</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Date Time Picker (Mobile Only) */}
                {Platform.OS !== 'web' && showStartPicker && (
                    <DateTimePicker
                        value={startDate}
                        mode={startPickerMode}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleStartDateChange}
                        locale="ko"
                    />
                )}

                {Platform.OS !== 'web' && showEndPicker && (
                    <DateTimePicker
                        value={endDate}
                        mode={endPickerMode}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleEndDateChange}
                        locale="ko"
                        minimumDate={startDate}
                    />
                )}
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: Colors.bgSecondary,
        borderTopLeftRadius: BorderRadius['3xl'],
        borderTopRightRadius: BorderRadius['3xl'],
        padding: Spacing['4xl'],
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing['2xl'],
    },
    title: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    content: {
        marginBottom: Spacing['2xl'],
    },
    inputGroup: {
        marginBottom: Spacing['2xl'],
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        gap: Spacing.md,
    },
    inputInner: {
        flex: 1,
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
    },
    textAreaIcon: {
        marginTop: 2,
    },
    textArea: {
        minHeight: 60,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        gap: Spacing.md,
    },
    dateButtonText: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    submitButton: {
        backgroundColor: Colors.accent,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: Colors.bgMuted,
    },
    submitButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    calendarSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
    },
    calendarSelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    calendarSelectorText: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    calendarColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    calendarDropdown: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    calendarOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing['2xl'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderPrimary,
    },
    calendarOptionSelected: {
        backgroundColor: Colors.accent + '20',
    },
    calendarOptionText: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        flex: 1,
    },
    calendarOptionTextSelected: {
        color: Colors.accent,
        fontWeight: '600',
    },
});
