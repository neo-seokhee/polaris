import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X, Check } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { Category } from "@/hooks/useCategories";

interface CategoryFilterModalProps {
    visible: boolean;
    onClose: () => void;
    categories: Category[];
    selectedCategories: string[];
    onToggleCategory: (categoryLabel: string) => void;
    onClearAll: () => void;
    onSelectAll: () => void;
}

export function CategoryFilterModal({
    visible,
    onClose,
    categories,
    selectedCategories,
    onToggleCategory,
    onClearAll,
    onSelectAll,
}: CategoryFilterModalProps) {
    const isAllSelected = selectedCategories.length === 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>카테고리 필터</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, isAllSelected && styles.actionButtonActive]}
                            onPress={onSelectAll}
                        >
                            <Text style={[styles.actionButtonText, isAllSelected && styles.actionButtonTextActive]}>
                                전체
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onClearAll}
                        >
                            <Text style={styles.actionButtonText}>초기화</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.categoryList}>
                        {categories.map((category) => {
                            const isSelected = selectedCategories.includes(category.label);
                            return (
                                <Pressable
                                    key={category.id}
                                    style={[
                                        styles.categoryItem,
                                        { borderColor: category.color },
                                        isSelected && { backgroundColor: category.color + '20' },
                                    ]}
                                    onPress={() => onToggleCategory(category.label)}
                                >
                                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                                    <Text style={[styles.categoryLabel, { color: isSelected ? category.color : Colors.textSecondary }]}>
                                        {category.label}
                                    </Text>
                                    {isSelected && (
                                        <Check size={14} color={category.color} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modal: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing['3xl'],
        width: '85%',
        maxWidth: 320,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing['2xl'],
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing['2xl'],
    },
    actionButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
    },
    actionButtonActive: {
        backgroundColor: Colors.accent,
    },
    actionButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    actionButtonTextActive: {
        color: Colors.textOnDark,
        fontWeight: '600',
    },
    categoryList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        backgroundColor: Colors.bgTertiary,
    },
    categoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    categoryLabel: {
        fontSize: FontSizes.sm,
        fontWeight: '500',
    },
});
