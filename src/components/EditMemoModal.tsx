import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, Keyboard, Pressable, ScrollView, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { X, Trash2 } from "lucide-react-native";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { Category } from "@/hooks/useCategories";

interface EditMemoModalProps {
    visible: boolean;
    onClose: () => void;
    memoId: string;
    initialContent: string;
    initialCategory: string;
    initialCategoryColor: string;
    onEdit: (id: string, updates: { content?: string; category?: string; category_color?: string }) => void;
    onDelete: (id: string) => void;
    categories: Category[];
}

export function EditMemoModal({
    visible,
    onClose,
    memoId,
    initialContent,
    initialCategory,
    initialCategoryColor,
    onEdit,
    onDelete,
    categories,
}: EditMemoModalProps) {
    const [content, setContent] = useState(initialContent);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(
        categories.find(c => c.label === initialCategory) || categories[0] || null
    );

    useEffect(() => {
        setContent(initialContent);
        setSelectedCategory(
            categories.find(c => c.label === initialCategory) || categories[0] || null
        );
    }, [initialContent, initialCategory, visible, categories]);

    const handleSave = () => {
        const trimmedContent = content.replace(/<[^>]*>/g, '').trim();
        if (trimmedContent && selectedCategory) {
            onEdit(memoId, {
                content: content,
                category: selectedCategory.label,
                category_color: selectedCategory.color,
            });
            Keyboard.dismiss();
            onClose();
        }
    };

    const handleDelete = () => {
        onDelete(memoId);
        onClose();
    };

    const isContentEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === '';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>메모 수정</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                    >
                        <View style={styles.categoryContainer}>
                            <Text style={styles.label}>카테고리</Text>
                            <View style={styles.categoryList}>
                                {categories.map((cat) => (
                                    <Pressable
                                        key={cat.id}
                                        style={[
                                            styles.categoryChip,
                                            { backgroundColor: cat.color + '20' },
                                            selectedCategory?.id === cat.id && styles.categoryChipSelected,
                                        ]}
                                        onPress={() => setSelectedCategory(cat)}
                                    >
                                        <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                                        <Text style={[styles.categoryChipText, { color: cat.color }]}>
                                            {cat.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>내용</Text>
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="메모 내용을 입력하세요"
                                minHeight={200}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.actions}>
                        <Pressable
                            style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
                            onPress={handleDelete}
                        >
                            <Trash2 size={20} color={Colors.error} />
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.saveButton,
                                isContentEmpty && styles.buttonDisabled,
                                pressed && !isContentEmpty && styles.buttonPressed
                            ]}
                            onPress={handleSave}
                            disabled={isContentEmpty}
                        >
                            <Text style={styles.buttonText}>저장</Text>
                        </Pressable>
                    </View>
                </View>
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
        maxHeight: '85%',
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
    scrollContent: {
        marginBottom: Spacing['2xl'],
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    categoryContainer: {
        marginBottom: Spacing['2xl'],
    },
    categoryList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    categoryChipSelected: {
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    categoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    categoryChipText: {
        fontSize: FontSizes.sm,
        fontWeight: '500',
    },
    inputContainer: {
    },
    textArea: {
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        fontSize: 12,
        color: '#FFFFFF',
        minHeight: 150,
        textAlignVertical: 'top',
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    deleteButton: {
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        flex: 1,
        backgroundColor: Colors.accent,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonPressed: {
        opacity: 0.8,
    },
    buttonText: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
