import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, Keyboard, Pressable, ScrollView, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { X, ChevronRight } from "lucide-react-native";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import type { Category } from "@/hooks/useCategories";

interface AddMemoModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (content: string, category: string, categoryColor: string) => void;
    categories: Category[];
}

export function AddMemoModal({ visible, onClose, onAdd, categories }: AddMemoModalProps) {
    const [content, setContent] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0]);
        }
    }, [categories]);

    const handleNext = () => {
        const trimmedContent = content.replace(/<[^>]*>/g, '').trim();
        if (trimmedContent) {
            Keyboard.dismiss();
            setShowCategoryModal(true);
        }
    };

    const handleSelectCategory = (category: Category) => {
        setSelectedCategory(category);
    };

    const handleSave = () => {
        if (selectedCategory) {
            onAdd(content, selectedCategory.label, selectedCategory.color);
            setContent("");
            setSelectedCategory(categories[0] || null);
            setShowCategoryModal(false);
            onClose();
        }
    };

    const handleClose = () => {
        setContent("");
        setSelectedCategory(categories[0] || null);
        setShowCategoryModal(false);
        onClose();
    };

    const handleCloseCategoryModal = () => {
        setShowCategoryModal(false);
    };

    const isContentEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === '';

    return (
        <>
            {/* Step 1: 메모 입력 */}
            <Modal
                visible={visible && !showCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={handleClose}
            >
                <GestureHandlerRootView style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.header}>
                            <Text style={styles.title}>새 메모</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <X size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.editorContainer}>
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="메모 내용을 입력하세요"
                                minHeight={300}
                            />
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                isContentEmpty && styles.buttonDisabled,
                                pressed && !isContentEmpty && styles.buttonPressed,
                            ]}
                            onPress={handleNext}
                            disabled={isContentEmpty}
                        >
                            <Text style={styles.buttonText}>다음</Text>
                            <ChevronRight size={20} color={Colors.textOnDark} />
                        </Pressable>
                    </View>
                </GestureHandlerRootView>
            </Modal>

            {/* Step 2: 카테고리 선택 */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseCategoryModal}
            >
                <GestureHandlerRootView style={styles.overlay}>
                    <View style={styles.categoryModal}>
                        <View style={styles.header}>
                            <Text style={styles.title}>카테고리 선택</Text>
                            <TouchableOpacity onPress={handleCloseCategoryModal}>
                                <X size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.categoryScrollView}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.categoryList}>
                                {categories.map((cat) => (
                                    <Pressable
                                        key={cat.id}
                                        style={[
                                            styles.categoryItem,
                                            selectedCategory?.id === cat.id && styles.categoryItemSelected,
                                        ]}
                                        onPress={() => handleSelectCategory(cat)}
                                    >
                                        <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                                        <Text style={[
                                            styles.categoryItemText,
                                            selectedCategory?.id === cat.id && { color: Colors.accent }
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>

                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                !selectedCategory && styles.buttonDisabled,
                                pressed && selectedCategory && styles.buttonPressed,
                            ]}
                            onPress={handleSave}
                            disabled={!selectedCategory}
                        >
                            <Text style={styles.buttonText}>저장</Text>
                        </Pressable>
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
        maxHeight: '90%',
    },
    categoryModal: {
        backgroundColor: Colors.bgSecondary,
        borderTopLeftRadius: BorderRadius['3xl'],
        borderTopRightRadius: BorderRadius['3xl'],
        padding: Spacing['4xl'],
        maxHeight: '60%',
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
    editorContainer: {
        marginBottom: Spacing['2xl'],
    },
    categoryScrollView: {
        marginBottom: Spacing['2xl'],
    },
    categoryList: {
        gap: Spacing.md,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        backgroundColor: Colors.bgTertiary,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryItemSelected: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent + '10',
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    categoryItemText: {
        fontSize: FontSizes.base,
        fontWeight: '500',
        color: Colors.textPrimary,
    },
    button: {
        backgroundColor: Colors.accent,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
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
