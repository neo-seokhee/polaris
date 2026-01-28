import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, Modal, Pressable, Alert, ActivityIndicator, TextInput as TextInputType } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, Check } from "lucide-react-native";
import ColorPicker, { Panel1, HueSlider, Preview } from "reanimated-color-picker";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

const PRESET_COLORS = [
    '#3B82F6',
    '#22C55E',
    '#EF4444',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#FFD700',
];

interface AddCalendarModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (name: string, url: string, color: string) => Promise<{ error: string | null }>;
}

export function AddCalendarModal({ visible, onClose, onAdd }: AddCalendarModalProps) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [tempColor, setTempColor] = useState(PRESET_COLORS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const nameInputRef = useRef<TextInputType>(null);

    useEffect(() => {
        if (visible) {
            setTimeout(() => nameInputRef.current?.focus(), 100);
        }
    }, [visible]);

    const handleClose = () => {
        setName("");
        setUrl("");
        setColor(PRESET_COLORS[0]);
        onClose();
    };

    const handleAdd = async () => {
        if (!name.trim() || !url.trim()) {
            Alert.alert('입력 오류', '이름과 URL을 모두 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        const result = await onAdd(name.trim(), url.trim(), color);
        setIsSubmitting(false);

        if (result.error) {
            Alert.alert('오류', result.error);
        } else {
            handleClose();
        }
    };

    return (
    <>
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>캘린더 추가</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.field}>
                            <Text style={styles.label}>캘린더 이름</Text>
                            <TextInput
                                ref={nameInputRef}
                                style={styles.input}
                                placeholder="예: 회사 캘린더"
                                placeholderTextColor={Colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>iCal URL</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://calendar.google.com/calendar/ical/..."
                                placeholderTextColor={Colors.textMuted}
                                value={url}
                                onChangeText={setUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                            <Text style={styles.urlHint}>
                                • Google: 설정 → 캘린더 통합 → iCal 형식의 공개/비공개 주소{'\n'}
                                • Apple: icloud.com/calendar → 공유 → 공개 캘린더 체크 → 링크 복사
                            </Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>색상</Text>
                            <View style={styles.colorPicker}>
                                {PRESET_COLORS.map((c) => (
                                    <Pressable
                                        key={c}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: c },
                                            color === c && styles.colorOptionSelected,
                                        ]}
                                        onPress={() => setColor(c)}
                                    />
                                ))}
                            </View>
                            <View style={styles.customColorRow}>
                                <Pressable
                                    style={[styles.colorPreview, { backgroundColor: color }]}
                                    onPress={() => {
                                        setTempColor(color);
                                        setShowColorPicker(true);
                                    }}
                                />
                                <TextInput
                                    style={styles.colorInput}
                                    placeholder="#FF5733"
                                    placeholderTextColor={Colors.textMuted}
                                    value={color}
                                    onChangeText={(text) => {
                                        const hex = text.startsWith('#') ? text : `#${text}`;
                                        if (hex.length <= 7) setColor(hex.toUpperCase());
                                    }}
                                    autoCapitalize="characters"
                                    maxLength={7}
                                />
                            </View>
                            <Text style={styles.colorPickerHint}>색상 칩을 눌러 스펙트럼에서 선택</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleAdd}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={Colors.textOnDark} />
                            ) : (
                                <Text style={styles.submitButtonText}>추가</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>

        <Modal
            visible={showColorPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowColorPicker(false)}
        >
            <GestureHandlerRootView style={styles.colorPickerOverlay}>
                <View style={styles.colorPickerModal}>
                    <View style={styles.colorPickerHeader}>
                        <Text style={styles.colorPickerTitle}>색상 선택</Text>
                        <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ColorPicker
                        value={tempColor}
                        onComplete={(colors) => setTempColor(colors.hex)}
                        style={styles.colorPickerContainer}
                    >
                        <Panel1 style={styles.colorPanel} />
                        <HueSlider style={styles.hueSlider} />
                        <View style={styles.colorPreviewRow}>
                            <Preview style={styles.colorPreviewLarge} />
                            <Text style={styles.colorHexText}>{tempColor.toUpperCase()}</Text>
                        </View>
                    </ColorPicker>

                    <TouchableOpacity
                        style={styles.colorPickerConfirmButton}
                        onPress={() => {
                            setColor(tempColor.toUpperCase());
                            setShowColorPicker(false);
                        }}
                    >
                        <Check size={20} color={Colors.textOnDark} />
                        <Text style={styles.colorPickerConfirmText}>선택</Text>
                    </TouchableOpacity>
                </View>
            </GestureHandlerRootView>
        </Modal>
    </>
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
    form: {
        gap: Spacing['2xl'],
    },
    field: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    input: {
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    urlHint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
        lineHeight: 16,
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: Colors.textPrimary,
    },
    customColorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
    colorPreview: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
    },
    colorInput: {
        flex: 1,
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing['2xl'],
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        fontFamily: 'monospace',
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginTop: Spacing['3xl'],
    },
    cancelButton: {
        flex: 1,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        backgroundColor: Colors.bgTertiary,
    },
    cancelButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    submitButton: {
        flex: 1,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        backgroundColor: Colors.accent,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    colorPickerHint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
    },
    colorPickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing['4xl'],
    },
    colorPickerModal: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['3xl'],
        padding: Spacing['4xl'],
        width: '100%',
        maxWidth: 360,
    },
    colorPickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing['2xl'],
    },
    colorPickerTitle: {
        fontSize: FontSizes['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    colorPickerContainer: {
        gap: Spacing['2xl'],
    },
    colorPanel: {
        height: 200,
        borderRadius: BorderRadius.lg,
    },
    hueSlider: {
        height: 32,
        borderRadius: BorderRadius.lg,
    },
    colorPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2xl'],
    },
    colorPreviewLarge: {
        flex: 1,
        height: 48,
        borderRadius: BorderRadius.lg,
    },
    colorHexText: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
        fontFamily: 'monospace',
        minWidth: 80,
    },
    colorPickerConfirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.accent,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        marginTop: Spacing['2xl'],
    },
    colorPickerConfirmText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
