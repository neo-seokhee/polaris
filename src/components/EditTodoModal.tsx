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
} from "react-native";
import { X } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

interface EditTodoModalProps {
    visible: boolean;
    onClose: () => void;
    todoId: string;
    initialTitle: string;
    onEdit: (id: string, title: string) => void;
    onDelete: (id: string) => void;
}

export function EditTodoModal({
    visible,
    onClose,
    todoId,
    initialTitle,
    onEdit,
    onDelete,
}: EditTodoModalProps) {
    const [title, setTitle] = useState(initialTitle);

    useEffect(() => {
        if (visible) {
            setTitle(initialTitle);
        }
    }, [initialTitle, visible]);

    const handleEdit = () => {
        if (!title.trim()) {
            Alert.alert("오류", "할일 내용을 입력해주세요.");
            return;
        }
        onEdit(todoId, title.trim());
        onClose();
    };

    const handleDelete = () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("이 할일을 삭제하시겠습니까?");
            if (confirmed) {
                onDelete(todoId);
                onClose();
            }
        } else {
            Alert.alert(
                "할일 삭제",
                "이 할일을 삭제하시겠습니까?",
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

                    <View style={styles.content}>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="할일 내용"
                            placeholderTextColor={Colors.textMuted}
                            autoFocus
                        />
                    </View>

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
