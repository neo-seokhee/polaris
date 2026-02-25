import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import RenderHtml from "react-native-render-html";
import { Edit3, Check, X } from "lucide-react-native";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import { sanitizeRichHtml } from "@/lib/richText";

interface YearGoalCardProps {
    year: number;
    content: string;
    isLoading: boolean;
    onSave: (content: string) => Promise<{ success: boolean; error?: string }>;
}

export function YearGoalCard({ year, content, isLoading, onSave }: YearGoalCardProps) {
    const { width } = useWindowDimensions();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    const [isSaving, setIsSaving] = useState(false);
    const contentWidth = width - Spacing['3xl'] * 2 - Spacing['2xl'] * 2;

    useEffect(() => {
        setEditContent(content);
    }, [content]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await onSave(sanitizeRichHtml(editContent));
            if (result.success) {
                setIsEditing(false);
            } else {
                Alert.alert('오류', result.error || '저장에 실패했습니다.');
            }
        } catch (err: any) {
            Alert.alert('오류', err.message || '저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditContent(content);
        setIsEditing(false);
    };

    const handleStartEdit = () => {
        setEditContent(content);
        setIsEditing(true);
    };

    const isContentEmpty = !content || content === '<p></p>' || content === '<br>' || content.replace(/<[^>]*>/g, '').trim() === '';

    if (isLoading) {
        return (
            <View style={styles.card}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Colors.accent} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>{year}년 목표</Text>
                {isEditing ? (
                    <View style={styles.editActions}>
                        <TouchableOpacity onPress={handleCancel} style={styles.actionButton} disabled={isSaving}>
                            <X size={20} color={Colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={styles.actionButton} disabled={isSaving}>
                            {isSaving ? (
                                <ActivityIndicator size="small" color={Colors.success} />
                            ) : (
                                <Check size={20} color={Colors.success} />
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity onPress={handleStartEdit} style={styles.actionButton}>
                        <Edit3 size={14} color={Colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {isEditing ? (
                <RichTextEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder={`${year}년에 이루고 싶은 목표를 적어보세요...`}
                    minHeight={200}
                    autoFocus
                />
            ) : isContentEmpty ? (
                <TouchableOpacity onPress={handleStartEdit}>
                    <Text style={styles.placeholder}>탭하여 {year}년 목표를 입력하세요...</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={handleStartEdit} activeOpacity={0.8}>
                    {Platform.OS === 'web' ? (
                        <div
                            style={{
                                color: '#FFFFFF',
                                fontSize: 14,
                                lineHeight: '22px',
                            }}
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    ) : (
                        <RenderHtml
                            contentWidth={contentWidth}
                            source={{ html: content }}
                            ignoredDomTags={['font']}
                            enableExperimentalMarginCollapsing={true}
                            tagsStyles={{
                                body: {
                                    color: '#FFFFFF',
                                    fontSize: 14,
                                    lineHeight: 22,
                                    margin: 0,
                                    padding: 0,
                                },
                                p: {
                                    marginVertical: 2,
                                    marginTop: 0,
                                    marginBottom: 4,
                                },
                                b: {
                                    fontWeight: 'bold',
                                    color: '#FFFFFF',
                                },
                                strong: {
                                    fontWeight: 'bold',
                                    color: '#FFFFFF',
                                },
                                i: {
                                    fontStyle: 'italic',
                                    color: '#FFFFFF',
                                },
                                em: {
                                    fontStyle: 'italic',
                                    color: '#FFFFFF',
                                },
                                u: {
                                    textDecorationLine: 'underline',
                                    color: '#FFFFFF',
                                },
                                s: {
                                    textDecorationLine: 'line-through',
                                    color: '#FFFFFF',
                                },
                                strike: {
                                    textDecorationLine: 'line-through',
                                    color: '#FFFFFF',
                                },
                                del: {
                                    textDecorationLine: 'line-through',
                                    color: '#FFFFFF',
                                },
                                ul: {
                                    marginVertical: 4,
                                    marginLeft: 0,
                                    paddingLeft: 20,
                                },
                                ol: {
                                    marginVertical: 4,
                                    marginLeft: 0,
                                    paddingLeft: 20,
                                },
                                li: {
                                    marginVertical: 2,
                                    fontSize: 14,
                                    lineHeight: 22,
                                    color: '#FFFFFF',
                                },
                            }}
                        />
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.accent + '40',
        padding: Spacing['2xl'],
        marginTop: Spacing['2xl'],
    },
    loadingContainer: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.accent,
    },
    editActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionButton: {
        padding: Spacing.xs,
    },
    placeholder: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
        fontStyle: 'italic',
    },
    textInput: {
        fontSize: 14,
        color: '#FFFFFF',
        lineHeight: 22,
        minHeight: 80,
        textAlignVertical: 'top',
        padding: 0,
    },
    contentText: {
        fontSize: 14,
        color: '#FFFFFF',
        lineHeight: 22,
    },
});
