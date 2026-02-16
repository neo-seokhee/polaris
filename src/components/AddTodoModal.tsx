import { useState, useRef } from "react";
import { View, Text, TextInput, StyleSheet, Modal, TextInput as TextInputType, InteractionManager, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { X } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";

interface AddTodoModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (title: string, memo?: string | null) => Promise<void>;
}

export function AddTodoModal({ visible, onClose, onAdd }: AddTodoModalProps) {
    const [title, setTitle] = useState("");
    const [memo, setMemo] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInputType>(null);

    // 모달이 열리면 입력창에 포커스
    const handleShow = () => {
        InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        });
    };

    const handleAdd = async () => {
        if (!title.trim()) return;

        Keyboard.dismiss();
        setLoading(true);
        try {
            await onAdd(title, memo.trim() ? memo.trim() : null);
            setTitle("");
            setMemo("");
            onClose();
        } catch (error) {
            console.error('Failed to add todo:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            onShow={handleShow}
        >
            <GestureHandlerRootView style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                >
                    <View style={styles.modal}>
                        <View style={styles.header}>
                            <Text style={styles.title}>새 할일 추가</Text>
                            <TouchableOpacity onPress={onClose}>
                                <X size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>할일</Text>
                                <TextInput
                                    ref={inputRef}
                                    style={styles.input}
                                    placeholder="할일을 입력하세요"
                                    placeholderTextColor={Colors.textMuted}
                                    value={title}
                                    onChangeText={setTitle}
                                    returnKeyType="done"
                                    onSubmitEditing={handleAdd}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>메모 (선택)</Text>
                                <TextInput
                                    style={[styles.input, styles.memoInput]}
                                    placeholder="메모를 입력하세요 (URL 포함 가능)"
                                    placeholderTextColor={Colors.textMuted}
                                    value={memo}
                                    onChangeText={setMemo}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonPrimary]}
                            onPress={handleAdd}
                        >
                            <Text style={styles.buttonTextPrimary}>
                                {loading ? "추가 중..." : "추가"}
                            </Text>
                        </TouchableOpacity>
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardAvoidingView: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: Spacing['3xl'],
    },
    modal: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        padding: Spacing['3xl'],
        gap: Spacing['3xl'],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: FontSizes['3xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    form: {
        gap: Spacing['2xl'],
    },
    inputGroup: {
        gap: Spacing.md,
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
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
    memoInput: {
        minHeight: 96,
    },
    button: {
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    buttonPrimary: {
        backgroundColor: Colors.accent,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonTextPrimary: {
        fontSize: FontSizes.base,
        fontWeight: '600',
        color: Colors.textOnDark,
    },
});
