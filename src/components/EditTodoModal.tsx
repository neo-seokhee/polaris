import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    StyleSheet,
    Alert,
    Platform,
    ScrollView,
} from "react-native";
import { X, Plus, Trash2, ChevronDown, ChevronUp, Tag, ArrowUp, ArrowDown } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

interface EditTodoModalProps {
    visible: boolean;
    onClose: () => void;
    todoId: string;
    initialTitle: string;
    initialMemo: string | null;
    initialCategory: string | null;
    categories: { id: string; name: string; position: number }[];
    onEdit: (id: string, title: string, memo?: string | null) => void;
    onDelete: (id: string) => void;
    onCategoryChange: (id: string, category: string | null) => void;
    onAddCategory: (name: string) => Promise<{ error: string | null }>;
    onDeleteCategory: (name: string) => Promise<{ error: string | null; deletedCategory?: string }>;
    onReorderCategory: (name: string, direction: 'up' | 'down') => Promise<{ error: string | null }>;
}

export function EditTodoModal({
    visible,
    onClose,
    todoId,
    initialTitle,
    initialMemo,
    initialCategory,
    categories,
    onEdit,
    onDelete,
    onCategoryChange,
    onAddCategory,
    onDeleteCategory,
    onReorderCategory,
}: EditTodoModalProps) {
    const [title, setTitle] = useState(initialTitle);
    const [memo, setMemo] = useState(initialMemo ?? "");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showAddCategory, setShowAddCategory] = useState(false);

    useEffect(() => {
        if (visible) {
            setTitle(initialTitle);
            setMemo(initialMemo ?? "");
            setSelectedCategory(initialCategory);
            setShowCategoryPicker(false);
            setShowAddCategory(false);
            setNewCategoryName("");
        }
    }, [initialTitle, initialMemo, initialCategory, visible]);

    const handleEdit = () => {
        if (!title.trim()) {
            Alert.alert("잠깐", "할일 내용을 입력해주세요.");
            return;
        }
        onEdit(todoId, title.trim(), memo.trim() ? memo.trim() : null);
        if (selectedCategory !== initialCategory) {
            onCategoryChange(todoId, selectedCategory);
        }
        onClose();
    };

    const handleDelete = () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("이 할일을 삭제할까요?");
            if (confirmed) {
                onDelete(todoId);
                onClose();
            }
        } else {
            Alert.alert(
                "할일 삭제",
                "이 할일을 삭제할까요?",
                [
                    { text: "취소", style: "cancel" },
                    {
                        text: "삭제",
                        style: "destructive",
                        onPress: () => {
                            onDelete(todoId);
                            onClose();
                        },
                    },
                ]
            );
        }
    };

    const handleSelectCategory = (categoryName: string | null) => {
        setSelectedCategory(categoryName);
        setShowCategoryPicker(false);
    };

    const handleAddCategory = async () => {
        const trimmedName = newCategoryName.trim();
        if (!trimmedName) {
            Alert.alert("오류", "카테고리 이름을 입력해주세요.");
            return;
        }

        const result = await onAddCategory(trimmedName);
        if (result.error) {
            Alert.alert("오류", result.error);
        } else {
            setNewCategoryName("");
            setShowAddCategory(false);
            setSelectedCategory(trimmedName);
        }
    };

    const handleDeleteCategory = async (categoryName: string) => {
        const confirmDelete = () => {
            return new Promise<boolean>((resolve) => {
                if (Platform.OS === 'web') {
                    resolve(window.confirm(`"${categoryName}" 카테고리를 삭제할까요?\n이 카테고리의 모든 할일은 '미지정'으로 이동됩니다.`));
                } else {
                    Alert.alert(
                        "카테고리 삭제",
                        `"${categoryName}" 카테고리를 삭제할까요?\n이 카테고리의 모든 할일은 '미지정'으로 이동됩니다.`,
                        [
                            { text: "취소", style: "cancel", onPress: () => resolve(false) },
                            { text: "삭제", style: "destructive", onPress: () => resolve(true) },
                        ]
                    );
                }
            });
        };

        const confirmed = await confirmDelete();
        if (confirmed) {
            const result = await onDeleteCategory(categoryName);
            if (result.error) {
                Alert.alert("오류", result.error);
            } else {
                if (selectedCategory === categoryName) {
                    setSelectedCategory(null);
                }
            }
        }
    };

    const handleMoveCategory = async (categoryName: string, direction: 'up' | 'down') => {
        const result = await onReorderCategory(categoryName, direction);
        if (result.error) {
            Alert.alert("오류", result.error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.title}>할일 수정</Text>
                        <Pressable onPress={onClose}>
                            <X size={20} color={Colors.textMuted} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.content}>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="할일 내용"
                                placeholderTextColor={Colors.textMuted}
                                autoFocus
                            />
                            <View style={styles.memoSection}>
                                <Text style={styles.memoLabel}>메모 (선택)</Text>
                                <TextInput
                                    style={[styles.input, styles.memoInput]}
                                    value={memo}
                                    onChangeText={setMemo}
                                    placeholder="메모를 입력하세요 (URL 포함 가능)"
                                    placeholderTextColor={Colors.textMuted}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Category Section */}
                            <View style={styles.categorySection}>
                                <Text style={styles.categoryLabel}>카테고리</Text>
                                <Pressable
                                    style={styles.categorySelector}
                                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                                >
                                    <View style={styles.categorySelectorContent}>
                                        <Tag size={16} color={Colors.textMuted} />
                                        <Text style={[
                                            styles.categorySelectorText,
                                            !selectedCategory && styles.categorySelectorPlaceholder
                                        ]}>
                                            {selectedCategory || "미지정"}
                                        </Text>
                                    </View>
                                    {showCategoryPicker
                                        ? <ChevronUp size={18} color={Colors.textMuted} />
                                        : <ChevronDown size={18} color={Colors.textMuted} />
                                    }
                                </Pressable>

                                {/* Category Picker Dropdown */}
                                {showCategoryPicker && (
                                    <View style={styles.categoryDropdown}>
                                        {/* Unassigned option */}
                                        <Pressable
                                            style={[
                                                styles.categoryOption,
                                                selectedCategory === null && styles.categoryOptionSelected
                                            ]}
                                            onPress={() => handleSelectCategory(null)}
                                        >
                                            <Text style={[
                                                styles.categoryOptionText,
                                                selectedCategory === null && styles.categoryOptionTextSelected
                                            ]}>
                                                미지정
                                            </Text>
                                        </Pressable>

                                        {/* Category list */}
                                        {categories.map((category, index) => (
                                            <View key={category.id} style={styles.categoryOptionRow}>
                                                <Pressable
                                                    style={[
                                                        styles.categoryOption,
                                                        styles.categoryOptionWithActions,
                                                        selectedCategory === category.name && styles.categoryOptionSelected
                                                    ]}
                                                    onPress={() => handleSelectCategory(category.name)}
                                                >
                                                    <Text style={[
                                                        styles.categoryOptionText,
                                                        selectedCategory === category.name && styles.categoryOptionTextSelected
                                                    ]}>
                                                        {category.name}
                                                    </Text>
                                                </Pressable>
                                                <View style={styles.categoryActions}>
                                                    <Pressable
                                                        style={[
                                                            styles.categoryActionButton,
                                                            index === 0 && styles.categoryActionButtonDisabled
                                                        ]}
                                                        onPress={() => index > 0 && handleMoveCategory(category.name, 'up')}
                                                        disabled={index === 0}
                                                    >
                                                        <ArrowUp size={14} color={index === 0 ? Colors.borderPrimary : Colors.textMuted} />
                                                    </Pressable>
                                                    <Pressable
                                                        style={[
                                                            styles.categoryActionButton,
                                                            index === categories.length - 1 && styles.categoryActionButtonDisabled
                                                        ]}
                                                        onPress={() => index < categories.length - 1 && handleMoveCategory(category.name, 'down')}
                                                        disabled={index === categories.length - 1}
                                                    >
                                                        <ArrowDown size={14} color={index === categories.length - 1 ? Colors.borderPrimary : Colors.textMuted} />
                                                    </Pressable>
                                                    <Pressable
                                                        style={styles.categoryDeleteButton}
                                                        onPress={() => handleDeleteCategory(category.name)}
                                                    >
                                                        <Trash2 size={14} color="#ef4444" />
                                                    </Pressable>
                                                </View>
                                            </View>
                                        ))}

                                        {/* Add new category */}
                                        {showAddCategory ? (
                                            <View style={styles.addCategoryInput}>
                                                <TextInput
                                                    style={styles.newCategoryInput}
                                                    value={newCategoryName}
                                                    onChangeText={setNewCategoryName}
                                                    placeholder="새 카테고리 이름"
                                                    placeholderTextColor={Colors.textMuted}
                                                    autoFocus
                                                    onSubmitEditing={handleAddCategory}
                                                />
                                                <Pressable
                                                    style={styles.addCategoryConfirmButton}
                                                    onPress={handleAddCategory}
                                                >
                                                    <Text style={styles.addCategoryConfirmText}>추가</Text>
                                                </Pressable>
                                            </View>
                                        ) : (
                                            <Pressable
                                                style={styles.addCategoryButton}
                                                onPress={() => setShowAddCategory(true)}
                                            >
                                                <Plus size={14} color={Colors.accent} />
                                                <Text style={styles.addCategoryText}>카테고리 추가</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.actions}>
                        <Pressable
                            style={[styles.button, styles.deleteButton]}
                            onPress={handleDelete}
                        >
                            <Text style={styles.deleteButtonText}>삭제</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.button, styles.editButton]}
                            onPress={handleEdit}
                        >
                            <Text style={styles.editButtonText}>수정</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.xl,
        width: "85%",
        maxWidth: 400,
        maxHeight: "80%",
        padding: Spacing["2xl"],
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing["2xl"],
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: "600",
        color: Colors.textPrimary,
    },
    scrollContent: {
        flexGrow: 0,
    },
    content: {
        marginBottom: Spacing["2xl"],
    },
    input: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
    },
    memoSection: {
        marginTop: Spacing.lg,
    },
    memoLabel: {
        fontSize: FontSizes.sm,
        fontWeight: "600",
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    memoInput: {
        minHeight: 96,
    },
    categorySection: {
        marginTop: Spacing.xl,
    },
    categoryLabel: {
        fontSize: FontSizes.sm,
        fontWeight: "600",
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    categorySelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
    },
    categorySelectorContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    categorySelectorText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
    },
    categorySelectorPlaceholder: {
        color: Colors.textMuted,
    },
    categoryDropdown: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        overflow: "hidden",
    },
    categoryOption: {
        flex: 1,
        padding: Spacing.lg,
    },
    categoryOptionRow: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.borderPrimary,
    },
    categoryOptionWithActions: {
        flex: 1,
    },
    categoryOptionSelected: {
        backgroundColor: Colors.accentBg,
    },
    categoryOptionText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
    },
    categoryOptionTextSelected: {
        color: Colors.accent,
        fontWeight: "600",
    },
    categoryActions: {
        flexDirection: "row",
        alignItems: "center",
        borderLeftWidth: 1,
        borderLeftColor: Colors.borderPrimary,
    },
    categoryActionButton: {
        padding: Spacing.md,
    },
    categoryActionButtonDisabled: {
        opacity: 0.3,
    },
    categoryDeleteButton: {
        padding: Spacing.md,
        paddingLeft: Spacing.sm,
    },
    addCategoryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        padding: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.borderPrimary,
    },
    addCategoryText: {
        fontSize: FontSizes.sm,
        color: Colors.accent,
        fontWeight: "500",
    },
    addCategoryInput: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.borderPrimary,
    },
    newCategoryInput: {
        flex: 1,
        padding: Spacing.lg,
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
    },
    addCategoryConfirmButton: {
        padding: Spacing.lg,
        borderLeftWidth: 1,
        borderLeftColor: Colors.borderPrimary,
    },
    addCategoryConfirmText: {
        fontSize: FontSizes.sm,
        color: Colors.accent,
        fontWeight: "600",
    },
    actions: {
        flexDirection: "row",
        gap: Spacing.lg,
    },
    button: {
        flex: 1,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: "center",
    },
    deleteButton: {
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.3)",
    },
    deleteButtonText: {
        color: "#ef4444",
        fontSize: FontSizes.md,
        fontWeight: "600",
    },
    editButton: {
        backgroundColor: Colors.accent,
    },
    editButtonText: {
        color: Colors.textOnAccent,
        fontSize: FontSizes.md,
        fontWeight: "600",
    },
});
