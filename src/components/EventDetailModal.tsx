import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TextInput, ScrollView, Platform, Alert, ActivityIndicator, TouchableOpacity as RNTouchableOpacity } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, Clock, MapPin, FileText, ChevronDown, Trash2, Edit3 } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { CalendarWithEnabled, UnifiedEvent } from "@/hooks/useGoogleCalendar";
import type { UpdateEventParams } from "@/lib/googleCalendar";

interface EventDetailModalProps {
    visible: boolean;
    onClose: () => void;
    event: UnifiedEvent | null;
    calendars: CalendarWithEnabled[];
    onUpdate: (params: UpdateEventParams) => Promise<{ success: boolean; error?: string }>;
    onDelete: (eventId: string, calendarId: string) => Promise<{ success: boolean; error?: string }>;
}

export function EventDetailModal({ visible, onClose, event, calendars, onUpdate, onDelete }: EventDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
    const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
    const [showCalendarPicker, setShowCalendarPicker] = useState(false);

    // 이벤트 데이터로 폼 초기화
    useEffect(() => {
        if (visible && event) {
            setTitle(event.title);
            setLocation(event.location || '');
            setDescription(event.description || '');
            setStartDate(new Date(event.startTime));
            setEndDate(new Date(event.endTime));
            setSelectedCalendarId(event.calendarId);
            setIsEditing(false);
        }
    }, [visible, event]);

    const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
    const writableCalendars = calendars.filter(c => c.isEnabled);

    const handleClose = () => {
        setIsEditing(false);
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

    const handleUpdate = async () => {
        if (!event) return;

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
            const result = await onUpdate({
                eventId: event.id,
                title: title.trim(),
                startTime: startDate,
                endTime: endDate,
                location: location.trim() || undefined,
                description: description.trim() || undefined,
                calendarId: selectedCalendarId,
            });

            if (result.success) {
                Alert.alert('완료', '일정이 수정되었습니다.');
                handleClose();
            } else {
                Alert.alert('오류', result.error || '일정 수정에 실패했습니다.');
            }
        } catch (err: any) {
            Alert.alert('오류', err.message || '일정 수정에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!event) return;

        const confirmDelete = async () => {
            setIsDeleting(true);
            try {
                const result = await onDelete(event.id, event.calendarId);
                if (result.success) {
                    Alert.alert('완료', '일정이 삭제되었습니다.');
                    handleClose();
                } else {
                    Alert.alert('오류', result.error || '일정 삭제에 실패했습니다.');
                }
            } catch (err: any) {
                Alert.alert('오류', err.message || '일정 삭제에 실패했습니다.');
            } finally {
                setIsDeleting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('이 일정을 삭제하시겠습니까?')) {
                confirmDelete();
            }
        } else {
            Alert.alert(
                '일정 삭제',
                '이 일정을 삭제하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: confirmDelete },
                ]
            );
        }
    };

    if (!event) return null;

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
                        <Text style={styles.headerTitle}>{isEditing ? '일정 편집' : '일정 상세'}</Text>
                        <View style={styles.headerActions}>
                            {!isEditing && (
                                <>
                                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
                                        <Edit3 size={20} color={Colors.accent} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleDelete} style={styles.headerButton} disabled={isDeleting}>
                                        {isDeleting ? (
                                            <ActivityIndicator size="small" color={Colors.error} />
                                        ) : (
                                            <Trash2 size={20} color={Colors.error} />
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                            <TouchableOpacity onPress={handleClose}>
                                <X size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* 캘린더 표시 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>캘린더</Text>
                            {isEditing && writableCalendars.length > 0 ? (
                                <>
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
                                </>
                            ) : (
                                <View style={styles.readOnlyField}>
                                    <View
                                        style={[
                                            styles.calendarColorDot,
                                            { backgroundColor: event.color || Colors.accent }
                                        ]}
                                    />
                                    <Text style={styles.readOnlyText}>{event.calendarName || '캘린더'}</Text>
                                </View>
                            )}
                        </View>

                        {/* 일정 제목 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>일정 제목 {isEditing && '*'}</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.input}
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="일정 제목을 입력하세요"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            ) : (
                                <Text style={styles.readOnlyValue}>{title}</Text>
                            )}
                        </View>

                        {/* 시작 시간 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>시작</Text>
                            {isEditing ? (
                                Platform.OS === 'web' ? (
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
                                )
                            ) : (
                                <View style={styles.readOnlyField}>
                                    <Clock size={18} color={Colors.textMuted} />
                                    <Text style={styles.readOnlyText}>{formatDateTime(startDate)}</Text>
                                </View>
                            )}
                        </View>

                        {/* 종료 시간 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>종료</Text>
                            {isEditing ? (
                                Platform.OS === 'web' ? (
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
                                )
                            ) : (
                                <View style={styles.readOnlyField}>
                                    <Clock size={18} color={Colors.textMuted} />
                                    <Text style={styles.readOnlyText}>{formatDateTime(endDate)}</Text>
                                </View>
                            )}
                        </View>

                        {/* 장소 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>장소</Text>
                            {isEditing ? (
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
                            ) : location ? (
                                <View style={styles.readOnlyField}>
                                    <MapPin size={18} color={Colors.textMuted} />
                                    <Text style={styles.readOnlyText}>{location}</Text>
                                </View>
                            ) : (
                                <Text style={styles.emptyText}>-</Text>
                            )}
                        </View>

                        {/* 설명 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>설명</Text>
                            {isEditing ? (
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
                            ) : description ? (
                                <View style={[styles.readOnlyField, styles.textAreaContainer]}>
                                    <FileText size={18} color={Colors.textMuted} style={styles.textAreaIcon} />
                                    <Text style={styles.readOnlyText}>{description}</Text>
                                </View>
                            ) : (
                                <Text style={styles.emptyText}>-</Text>
                            )}
                        </View>
                    </ScrollView>

                    {isEditing && (
                        <View style={styles.buttonRow}>
                            <RNTouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    // 원래 값으로 복원
                                    if (event) {
                                        setTitle(event.title);
                                        setLocation(event.location || '');
                                        setDescription(event.description || '');
                                        setStartDate(new Date(event.startTime));
                                        setEndDate(new Date(event.endTime));
                                        setSelectedCalendarId(event.calendarId);
                                    }
                                    setIsEditing(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonText}>취소</Text>
                            </RNTouchableOpacity>
                            <RNTouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleUpdate}
                                disabled={isSubmitting}
                                activeOpacity={0.7}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color={Colors.textOnDark} />
                                ) : (
                                    <Text style={styles.submitButtonText}>저장</Text>
                                )}
                            </RNTouchableOpacity>
                        </View>
                    )}
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
    headerTitle: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    headerButton: {
        padding: Spacing.sm,
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
    readOnlyField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
    },
    readOnlyText: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        flex: 1,
    },
    readOnlyValue: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: Colors.bgTertiary,
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    cancelButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    submitButton: {
        flex: 1,
        backgroundColor: Colors.accent,
        paddingVertical: Spacing['2xl'],
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
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
