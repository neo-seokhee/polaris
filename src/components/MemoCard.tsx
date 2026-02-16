import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import RenderHtml from "react-native-render-html";
import { Star, ChevronDown, ChevronUp, GripVertical } from "lucide-react-native";
import { Colors, Spacing, BorderRadius, FontSizes, LineHeights } from "@/constants/theme";

interface MemoCardProps {
    id: string;
    category: string;
    categoryColor: string;
    content: string;
    time: string;
    isStarred: boolean;
    onPress: (id: string, content: string, category: string, categoryColor: string) => void;
    onToggleStar: (id: string, isStarred: boolean) => void;
    drag?: () => void;
    enableDrag?: boolean;
}

export function MemoCard({
    id,
    category,
    categoryColor,
    content,
    time,
    isStarred,
    onPress,
    onToggleStar,
    drag,
    enableDrag = false,
}: MemoCardProps) {
    const { width } = useWindowDimensions();
    const [expanded, setExpanded] = useState(false);

    const handleToggleExpand = () => {
        setExpanded(!expanded);
    };

    // HTML 태그가 포함되어 있는지 확인
    const isHtml = content.includes('<') && content.includes('>');

    // HTML에서 텍스트만 추출 (길이 체크용)
    const plainText = content.replace(/<[^>]*>/g, '').trim();

    // 줄 수 계산: <br>, <p>, \n 등을 줄바꿈으로 카운트
    const lineBreakCount = (content.match(/<br\s*\/?>/gi) || []).length +
        (content.match(/<\/p>\s*<p>/gi) || []).length +
        (content.match(/\n/g) || []).length;

    // 3줄 이상이거나 150자 이상이면 긴 콘텐츠로 판단
    const isLongContent = lineBreakCount >= 3 || plainText.length > 150;

    // 콘텐츠 너비 계산 (패딩 제외)
    const contentWidth = width - Spacing['3xl'] * 2 - Spacing['2xl'] * 2;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(id, content, category, categoryColor)}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {(drag || enableDrag) && (
                        <TouchableOpacity
                            onLongPress={drag}
                            delayLongPress={100}
                            style={styles.dragHandle}
                        >
                            <GripVertical size={14} color={Colors.textMuted} />
                        </TouchableOpacity>
                    )}
                    <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '30' }]}>
                        <Text style={[styles.categoryText, { color: categoryColor }]}>
                            {category}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => onToggleStar(id, isStarred)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Star
                        size={16}
                        color={isStarred ? Colors.accent : Colors.textMuted}
                        fill={isStarred ? Colors.accent : 'transparent'}
                    />
                </TouchableOpacity>
            </View>

            <View style={[styles.contentWrapper, !expanded && isLongContent && styles.contentCollapsed]}>
                {isHtml ? (
                    Platform.OS === 'web' ? (
                        <div
                            style={{
                                color: Colors.textContent,
                                fontSize: 12,
                                lineHeight: '18px',
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
                                    color: Colors.textContent,
                                    fontSize: 12,
                                    lineHeight: 18,
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
                                    color: Colors.textContent,
                                },
                                strong: {
                                    fontWeight: 'bold',
                                    color: Colors.textContent,
                                },
                                i: {
                                    fontStyle: 'italic',
                                    color: Colors.textContent,
                                },
                                em: {
                                    fontStyle: 'italic',
                                    color: Colors.textContent,
                                },
                                u: {
                                    textDecorationLine: 'underline',
                                    color: Colors.textContent,
                                },
                                s: {
                                    textDecorationLine: 'line-through',
                                    color: Colors.textContent,
                                },
                                strike: {
                                    textDecorationLine: 'line-through',
                                    color: Colors.textContent,
                                },
                                del: {
                                    textDecorationLine: 'line-through',
                                    color: Colors.textContent,
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
                                    fontSize: 12,
                                    lineHeight: 18,
                                    color: Colors.textContent,
                                },
                            }}
                        />
                    )
                ) : (
                    <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
                        {content}
                    </Text>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.time}>{time}</Text>
                {isLongContent && (
                    <TouchableOpacity
                        onPress={handleToggleExpand}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {expanded ? (
                            <ChevronUp size={16} color={Colors.textMuted} />
                        ) : (
                            <ChevronDown size={16} color={Colors.textMuted} />
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        backgroundColor: Colors.bgSecondary,
        padding: Spacing['2xl'],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dragHandle: {
        padding: 2,
        marginLeft: -4,
    },
    categoryBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    categoryText: {
        fontSize: FontSizes.xs,
        fontWeight: '600',
    },
    contentWrapper: {
        overflow: 'hidden',
    },
    contentCollapsed: {
        maxHeight: 54, // 약 3줄 (12px font, 18px line-height)
    },
    content: {
        fontSize: 12,
        fontWeight: '400',
        color: Colors.textContent,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    time: {
        fontSize: FontSizes.xs,
        fontWeight: '400',
        color: Colors.textMuted,
    },
});
