import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { X, Plus, Pencil, Trash2, Check, GripVertical } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { Category } from "@/hooks/useCategories";

const PRESET_COLORS = [
    '#FFFFFF', '#D4D4D4', '#A3A3A3', '#737373', '#404040', '#171717',
    '#EF4444', '#F97316', '#F59E0B', '#FFD700', '#84CC16', '#22C55E',
    '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899',
];

// Hex to RGB conversion
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : { r: 255, g: 215, b: 0 };
}

// RGB to Hex conversion
function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

interface CategoryManageModalProps {
    visible: boolean;
    onClose: () => void;
    categories: Category[];
    onAdd: (label: string, color: string) => Promise<Category>;
    onUpdate: (id: string, label: string, color: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onReorder: (categories: Category[]) => Promise<void>;
}

export function CategoryManageModal({
    visible,
    onClose,
    categories,
    onAdd,
    onUpdate,
    onDelete,
    onReorder,
}: CategoryManageModalProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showAddColorPicker, setShowAddColorPicker] = useState(false);
    const [rgb, setRgb] = useState({ r: 255, g: 215, b: 0 });

    const handleStartEdit = (category: Category) => {
        setEditingId(category.id);
        setEditLabel(category.label);
        setEditColor(category.color);
        setRgb(hexToRgb(category.color));
        setIsAdding(false);
        setShowColorPicker(false);
    };

    const handleSaveEdit = async () => {
        if (editingId && editLabel.trim()) {
            await onUpdate(editingId, editLabel.trim(), editColor);
            setEditingId(null);
            setEditLabel("");
            setShowColorPicker(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditLabel("");
        setShowColorPicker(false);
    };

    const handleStartAdd = () => {
        setIsAdding(true);
        setNewLabel("");
        setNewColor(PRESET_COLORS[0]);
        setEditingId(null);
        setShowAddColorPicker(false);
    };

    const handleSaveAdd = async () => {
        if (newLabel.trim()) {
            await onAdd(newLabel.trim(), newColor);
            setIsAdding(false);
            setNewLabel("");
            setShowAddColorPicker(false);
        }
    };

    const handleCancelAdd = () => {
        setIsAdding(false);
        setNewLabel("");
        setShowAddColorPicker(false);
    };

    const handleDelete = async (id: string) => {
        await onDelete(id);
        if (editingId === id) {
            setEditingId(null);
        }
    };

    const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
        const newRgb = { ...rgb, [channel]: value };
        setRgb(newRgb);
        setEditColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    };

    const renderColorPicker = (
        currentColor: string,
        onSelectColor: (color: string) => void,
        showPicker: boolean,
        setShowPicker: (show: boolean) => void,
        isAddMode: boolean
    ) => {
        const currentRgb = rgb;

        return (
            <View style={styles.colorSection}>
                <View style={styles.colorPresets}>
                    {PRESET_COLORS.map((color) => (
                        <Pressable
                            key={color}
                            style={[
                                styles.colorOption,
                                { backgroundColor: color },
                                color === '#FFFFFF' && styles.colorOptionWhite,
                                currentColor === color && styles.colorOptionSelected,
                            ]}
                            onPress={() => {
                                onSelectColor(color);
                                if (!isAddMode) {
                                    setRgb(hexToRgb(color));
                                }
                                setShowPicker(false);
                            }}
                        />
                    ))}
                    {!isAddMode && (
                        <Pressable
                            style={[styles.colorOption, styles.colorPickerButton]}
                            onPress={() => setShowPicker(!showPicker)}
                        >
                            <Text style={styles.colorPickerButtonText}>+</Text>
                        </Pressable>
                    )}
                </View>
                {!isAddMode && showPicker && (
                    <View style={styles.rgbPickerContainer}>
                        <View style={styles.rgbRow}>
                            <View style={[styles.previewColor, { backgroundColor: currentColor }]} />
                            <View style={styles.rgbSlidersWrapper}>
                                <View style={styles.rgbSliderRow}>
                                    <Text style={[styles.rgbLabel, { color: '#EF4444' }]}>R</Text>
                                    <View style={styles.rgbSlider}>
                                        {Array.from({ length: 9 }, (_, i) => Math.round(i * 32)).map((value) => (
                                            <Pressable
                                                key={value}
                                                style={[
                                                    styles.rgbOption,
                                                    { backgroundColor: rgbToHex(value, currentRgb.g, currentRgb.b) },
                                                    Math.abs(currentRgb.r - value) < 16 && styles.rgbOptionSelected,
                                                ]}
                                                onPress={() => handleRgbChange('r', Math.min(value, 255))}
                                            />
                                        ))}
                                    </View>
                                </View>
                                <View style={styles.rgbSliderRow}>
                                    <Text style={[styles.rgbLabel, { color: '#22C55E' }]}>G</Text>
                                    <View style={styles.rgbSlider}>
                                        {Array.from({ length: 9 }, (_, i) => Math.round(i * 32)).map((value) => (
                                            <Pressable
                                                key={value}
                                                style={[
                                                    styles.rgbOption,
                                                    { backgroundColor: rgbToHex(currentRgb.r, value, currentRgb.b) },
                                                    Math.abs(currentRgb.g - value) < 16 && styles.rgbOptionSelected,
                                                ]}
                                                onPress={() => handleRgbChange('g', Math.min(value, 255))}
                                            />
                                        ))}
                                    </View>
                                </View>
                                <View style={styles.rgbSliderRow}>
                                    <Text style={[styles.rgbLabel, { color: '#3B82F6' }]}>B</Text>
                                    <View style={styles.rgbSlider}>
                                        {Array.from({ length: 9 }, (_, i) => Math.round(i * 32)).map((value) => (
                                            <Pressable
                                                key={value}
                                                style={[
                                                    styles.rgbOption,
                                                    { backgroundColor: rgbToHex(currentRgb.r, currentRgb.g, value) },
                                                    Math.abs(currentRgb.b - value) < 16 && styles.rgbOptionSelected,
                                                ]}
                                                onPress={() => handleRgbChange('b', Math.min(value, 255))}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => {
        if (editingId === item.id) {
            return (
                <ScaleDecorator>
                    <View style={[styles.editForm, isActive && styles.dragging]}>
                        <TextInput
                            style={styles.editInput}
                            value={editLabel}
                            onChangeText={setEditLabel}
                            placeholder="카테고리 이름"
                            placeholderTextColor={Colors.textMuted}
                            autoFocus
                        />
                        {renderColorPicker(editColor, setEditColor, showColorPicker, setShowColorPicker, false)}
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancelEdit}
                            >
                                <Text style={styles.cancelButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSaveEdit}
                            >
                                <Check size={16} color={Colors.textOnDark} />
                                <Text style={styles.saveButtonText}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScaleDecorator>
            );
        }

        return (
            <ScaleDecorator>
                <View style={[styles.categoryRow, isActive && styles.dragging]}>
                    <TouchableOpacity
                        style={styles.dragHandle}
                        onLongPress={drag}
                        delayLongPress={100}
                    >
                        <GripVertical size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <View style={styles.categoryInfo}>
                        <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                        <Text style={styles.categoryLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.categoryActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleStartEdit(item)}
                        >
                            <Pencil size={16} color={Colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDelete(item.id)}
                        >
                            <Trash2 size={16} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScaleDecorator>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardAvoid}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={styles.modal}>
                        <View style={styles.header}>
                            <Text style={styles.title}>카테고리 관리</Text>
                            <TouchableOpacity onPress={onClose}>
                                <X size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scrollContent}
                            contentContainerStyle={styles.scrollContentContainer}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <DraggableFlatList
                                data={categories}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                                onDragEnd={({ data }) => onReorder(data)}
                                containerStyle={styles.listContainer}
                                activationDistance={10}
                                scrollEnabled={false}
                            />

                            {/* 카테고리 추가 영역 - FlatList 밖으로 분리 */}
                            {isAdding ? (
                                <View style={styles.addForm}>
                                    <TextInput
                                        style={styles.editInput}
                                        value={newLabel}
                                        onChangeText={setNewLabel}
                                        placeholder="새 카테고리 이름"
                                        placeholderTextColor={Colors.textMuted}
                                        autoFocus
                                    />
                                    {renderColorPicker(newColor, setNewColor, showAddColorPicker, setShowAddColorPicker, true)}
                                    <View style={styles.editActions}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={handleCancelAdd}
                                        >
                                            <Text style={styles.cancelButtonText}>취소</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.saveButton}
                                            onPress={handleSaveAdd}
                                        >
                                            <Check size={16} color={Colors.textOnDark} />
                                            <Text style={styles.saveButtonText}>추가</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.addButton} onPress={handleStartAdd}>
                                    <Plus size={20} color={Colors.accent} />
                                    <Text style={styles.addButtonText}>카테고리 추가</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: Colors.bgSecondary,
        borderTopLeftRadius: BorderRadius['3xl'],
        borderTopRightRadius: BorderRadius['3xl'],
        paddingTop: Spacing['4xl'],
        paddingHorizontal: Spacing['4xl'],
        paddingBottom: Spacing['2xl'],
        maxHeight: '80%',
    },
    scrollContent: {
        flexGrow: 0,
    },
    scrollContentContainer: {
        paddingBottom: Spacing['2xl'],
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
    listContainer: {
        flexGrow: 0,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgTertiary,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
    },
    dragging: {
        opacity: 0.9,
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
        elevation: 8,
    },
    dragHandle: {
        padding: Spacing.sm,
        marginRight: Spacing.sm,
    },
    categoryInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    categoryLabel: {
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    categoryActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    actionButton: {
        padding: Spacing.sm,
    },
    editForm: {
        backgroundColor: Colors.bgTertiary,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    addForm: {
        backgroundColor: Colors.bgTertiary,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    editInput: {
        backgroundColor: Colors.bgPrimary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
    },
    colorSection: {
        gap: Spacing.md,
    },
    colorPresets: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    colorOption: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    colorOptionWhite: {
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: Colors.accent,
    },
    colorPickerButton: {
        backgroundColor: Colors.bgPrimary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorPickerButtonText: {
        fontSize: FontSizes.lg,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    rgbPickerContainer: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    rgbRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    rgbSlidersWrapper: {
        flex: 1,
        gap: 4,
    },
    rgbSliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    rgbLabel: {
        fontSize: FontSizes.xs,
        fontWeight: '700',
        width: 14,
    },
    rgbSlider: {
        flex: 1,
        flexDirection: 'row',
        gap: 2,
    },
    rgbOption: {
        flex: 1,
        height: 20,
        borderRadius: 2,
    },
    rgbOptionSelected: {
        borderWidth: 2,
        borderColor: Colors.textPrimary,
    },
    previewColor: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.md,
    },
    cancelButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing['2xl'],
    },
    cancelButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.accent,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.md,
    },
    saveButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing['2xl'],
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.accent,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
    },
    addButtonText: {
        fontSize: FontSizes.base,
        color: Colors.accent,
        fontWeight: '500',
    },
});
