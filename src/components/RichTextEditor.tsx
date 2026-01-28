import { useRef, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Bold, Italic, Underline, List, ListOrdered, Strikethrough } from "lucide-react-native";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    minHeight?: number;
    autoFocus?: boolean;
}

// 웹용 에디터 컴포넌트
function WebRichTextEditor({
    value,
    onChange,
    placeholder = "내용을 입력하세요...",
    minHeight = 120,
    autoFocus = false,
}: RichTextEditorProps) {
    const containerRef = useRef<View>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);
    const lastValueRef = useRef(value);
    const hasUserInputRef = useRef(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // 플레이스홀더 스타일 추가
        const styleId = 'rich-editor-placeholder-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .rich-editor-placeholder:empty:before {
                    content: attr(data-placeholder);
                    color: #6B6B70;
                    pointer-events: none;
                }
                .rich-editor-content {
                    outline: none;
                    min-height: ${minHeight - 44}px;
                    padding: 12px;
                    color: #FFFFFF;
                    font-size: 12px;
                    line-height: 1.8;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #1A1A1D;
                }
                .rich-editor-content * {
                    color: #FFFFFF;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        }

        // DOM이 준비된 후 에디터 생성
        const timer = setTimeout(() => {
            const container = containerRef.current as unknown as HTMLDivElement;
            if (container && !editorRef.current) {
                const editor = document.createElement('div');
                editor.className = 'rich-editor-placeholder rich-editor-content';
                editor.setAttribute('contenteditable', 'true');
                editor.innerHTML = value || '';

                // 입력 이벤트 - 디바운스 처리
                let inputTimeout: NodeJS.Timeout | null = null;

                editor.addEventListener('input', () => {
                    hasUserInputRef.current = true;

                    // 디바운스: 입력이 멈춘 후 100ms 후에 onChange 호출
                    if (inputTimeout) {
                        clearTimeout(inputTimeout);
                    }
                    inputTimeout = setTimeout(() => {
                        const currentValue = editor.innerHTML;
                        lastValueRef.current = currentValue;
                        onChange(currentValue);
                    }, 100);
                });

                if (!value || value.replace(/<[^>]*>/g, '').trim() === '') {
                    editor.setAttribute('data-placeholder', placeholder);
                }

                editor.addEventListener('focus', () => {
                    editor.removeAttribute('data-placeholder');
                });

                editor.addEventListener('blur', () => {
                    // blur 시 즉시 최종 값 동기화
                    if (inputTimeout) {
                        clearTimeout(inputTimeout);
                    }
                    const currentValue = editor.innerHTML;
                    lastValueRef.current = currentValue;
                    onChange(currentValue);

                    const text = editor.innerText.trim();
                    if (!text) {
                        editor.setAttribute('data-placeholder', placeholder);
                    }

                    // blur 후 외부 값 동기화 허용
                    setTimeout(() => {
                        hasUserInputRef.current = false;
                    }, 200);
                });

                container.appendChild(editor);
                editorRef.current = editor;
                setIsReady(true);

                if (autoFocus) {
                    setTimeout(() => editor.focus(), 100);
                }
            }
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    // value가 외부에서 변경된 경우 (사용자 입력 중이 아닐 때만, 값이 초기화되는 경우만)
    useEffect(() => {
        if (editorRef.current && isReady) {
            // 사용자가 입력 중이면 외부 값 무시
            if (hasUserInputRef.current) {
                return;
            }
            // 값이 완전히 비워지거나(리셋), 완전히 다른 값으로 변경된 경우만 동기화
            const isReset = !value || value === '';
            const isCompletelyDifferent = lastValueRef.current !== value &&
                value.replace(/<[^>]*>/g, '').trim() !== editorRef.current.innerText.trim();

            if (isReset || isCompletelyDifferent) {
                editorRef.current.innerHTML = value || '';
                lastValueRef.current = value;
            }
        }
    }, [value, isReady]);

    const execCommand = (command: string, value?: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, value);
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <View style={[styles.container, { minHeight }]}>
            <View style={styles.toolbar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => execCommand('bold')}>
                        <Bold size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => execCommand('italic')}>
                        <Italic size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => execCommand('underline')}>
                        <Underline size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => execCommand('strikeThrough')}>
                        <Strikethrough size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.toolbarDivider} />
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => execCommand('insertUnorderedList')}>
                        <List size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => execCommand('insertOrderedList')}>
                        <ListOrdered size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </ScrollView>
            </View>
            <View
                ref={containerRef}
                style={[styles.editorContainer, { minHeight: minHeight - 44 }]}
            />
        </View>
    );
}

// 모바일용 에디터 컴포넌트
function MobileRichTextEditor({
    value,
    onChange,
    placeholder = "내용을 입력하세요...",
    minHeight = 120,
    autoFocus = false,
}: RichTextEditorProps) {
    const [RichEditor, setRichEditor] = useState<any>(null);
    const [actions, setActions] = useState<any>(null);
    const richText = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        import('react-native-pell-rich-editor').then((module) => {
            setRichEditor(() => module.RichEditor);
            setActions(module.actions);
        });
    }, []);

    const handleAction = (action: string) => {
        if (richText.current && actions) {
            richText.current.sendAction(action, 'result');
        }
    };

    const handleEditorInitialized = () => {
        if (autoFocus && richText.current) {
            setTimeout(() => {
                richText.current?.focusContentEditor();
            }, 100);
        }
    };

    // 디바운스된 onChange (한글 입력 호환성)
    const handleChange = (html: string) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            onChange(html);
        }, 150);
    };

    if (!RichEditor || !actions) {
        return (
            <View style={[styles.container, { minHeight }]}>
                <View style={styles.loadingContainer} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { minHeight }]}>
            <View style={styles.toolbar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => handleAction(actions.setBold)}>
                        <Bold size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => handleAction(actions.setItalic)}>
                        <Italic size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => handleAction(actions.setUnderline)}>
                        <Underline size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => handleAction(actions.setStrikethrough)}>
                        <Strikethrough size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.toolbarDivider} />
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => handleAction(actions.insertBulletsList)}>
                        <List size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => handleAction(actions.insertOrderedList)}>
                        <ListOrdered size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </ScrollView>
            </View>
            <View style={[styles.editorWrapper, { minHeight: minHeight - 44 }]}>
                <RichEditor
                    ref={richText}
                    initialContentHTML={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    disabled={false}
                    editorInitializedCallback={handleEditorInitialized}
                    editorStyle={{
                        backgroundColor: Colors.bgTertiary,
                        color: '#FFFFFF',
                        placeholderColor: Colors.textMuted,
                        caretColor: '#FFFFFF',
                        contentCSSText: `
                            font-size: 14px;
                            line-height: 1.8;
                            color: #FFFFFF;
                            padding: 12px;
                            min-height: ${minHeight - 44}px;
                        `,
                    }}
                    style={[styles.editor, { minHeight: minHeight - 44 }]}
                />
            </View>
        </View>
    );
}

export function RichTextEditor(props: RichTextEditorProps) {
    if (Platform.OS === 'web') {
        return <WebRichTextEditor {...props} />;
    }
    return <MobileRichTextEditor {...props} />;
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        backgroundColor: Colors.bgTertiary,
    },
    toolbar: {
        backgroundColor: Colors.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderPrimary,
    },
    toolbarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    toolbarButton: {
        padding: Spacing.sm,
        marginHorizontal: 2,
        borderRadius: BorderRadius.sm,
    },
    toolbarDivider: {
        width: 1,
        height: 20,
        backgroundColor: Colors.borderPrimary,
        marginHorizontal: Spacing.sm,
    },
    editorContainer: {
        backgroundColor: Colors.bgTertiary,
    },
    editorWrapper: {
        backgroundColor: Colors.bgTertiary,
        flex: 1,
    },
    editor: {
        backgroundColor: Colors.bgTertiary,
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.bgTertiary,
    },
    mobileTextInput: {
        backgroundColor: Colors.bgTertiary,
        color: '#FFFFFF',
        fontSize: 12,
        lineHeight: 22,
        padding: 12,
        textAlignVertical: 'top',
    },
});
