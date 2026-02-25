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

const sanitizeRichHtml = (html: string): string => {
    if (!html) return "";
    return html
        .replace(/\sstyle="[^"]*"/gi, "")
        .replace(/\sclass="[^"]*"/gi, "")
        .replace(/\sid="[^"]*"/gi, "")
        .replace(/<span[^>]*>/gi, "")
        .replace(/<\/span>/gi, "");
};

// 웹용 에디터 컴포넌트 (Tiptap)
function WebRichTextEditor({
    value,
    onChange,
    placeholder = "내용을 입력하세요...",
    minHeight = 120,
    autoFocus = false,
}: RichTextEditorProps) {
    const tiptapReact = require("@tiptap/react");
    const StarterKit = require("@tiptap/starter-kit").default;
    const UnderlineExt = require("@tiptap/extension-underline").default;
    const LinkExt = require("@tiptap/extension-link").default;
    const PlaceholderExt = require("@tiptap/extension-placeholder").default;
    const EditorContent = tiptapReact.EditorContent as any;
    const useEditor = tiptapReact.useEditor as any;

    useEffect(() => {
        const styleId = "tiptap-web-editor-style";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                .tiptap-root {
                    display: flex;
                    flex-direction: column;
                    background: ${Colors.bgTertiary};
                }
                .tiptap-content {
                    min-height: ${Math.max(minHeight - 44, 60)}px;
                    padding: 12px;
                    color: ${Colors.textPrimary};
                    font-size: 14px;
                    line-height: 1.8;
                    outline: none;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .tiptap-content * {
                    color: ${Colors.textPrimary};
                    font-size: 14px;
                }
                .tiptap-content p { margin: 0 0 6px 0; }
                .tiptap-content ul,
                .tiptap-content ol { margin: 0 0 6px 0; padding-left: 20px; }
                .tiptap-content a { color: ${Colors.accent}; text-decoration: underline; }
                .tiptap-content .is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    color: ${Colors.textMuted};
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        }
    }, [minHeight]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            UnderlineExt,
            LinkExt.configure({
                openOnClick: false,
                autolink: true,
            }),
            PlaceholderExt.configure({
                placeholder,
                emptyEditorClass: "is-editor-empty",
            }),
        ],
        content: sanitizeRichHtml(value || ""),
        autofocus: autoFocus,
        editorProps: {
            attributes: {
                class: "tiptap-content",
                spellcheck: "true",
            },
            transformPastedHTML: (html: string) => sanitizeRichHtml(html),
        },
        onUpdate: ({ editor: nextEditor }: any) => {
            onChange(sanitizeRichHtml(nextEditor.getHTML()));
        },
    });

    useEffect(() => {
        if (!editor) return;
        const current = sanitizeRichHtml(editor.getHTML());
        const next = sanitizeRichHtml(value || "");
        if (current !== next) {
            editor.commands.setContent(next || "", false, { preserveWhitespace: "full" });
        }
    }, [editor, value]);

    if (!editor) {
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
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => editor.chain().focus().toggleBold().run()}>
                        <Bold size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => editor.chain().focus().toggleItalic().run()}>
                        <Italic size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => editor.chain().focus().toggleUnderline().run()}>
                        <Underline size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => editor.chain().focus().toggleStrike().run()}>
                        <Strikethrough size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.toolbarDivider} />
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => editor.chain().focus().toggleBulletList().run()}>
                        <List size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => editor.chain().focus().toggleOrderedList().run()}>
                        <ListOrdered size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </ScrollView>
            </View>
            <View style={[styles.editorContainer, { minHeight: minHeight - 44 }]}>
                <EditorContent editor={editor} className="tiptap-root" />
            </View>
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
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        fontSize: 14,
        lineHeight: 22,
        padding: 12,
        textAlignVertical: 'top',
    },
});
