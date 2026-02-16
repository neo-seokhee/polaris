import { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert, Platform, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Search, Tag, Filter, Star, ChevronDown, ChevronUp } from "lucide-react-native";
import { DraggableList } from "@/components/DraggableList";
import { AddMemoModal } from "@/components/AddMemoModal";
import { EditMemoModal } from "@/components/EditMemoModal";
import { CategoryManageModal } from "@/components/CategoryManageModal";
import { CategoryFilterModal } from "@/components/CategoryFilterModal";
import { DemoBanner } from "@/components/DemoBanner";
import { useMemos } from "@/hooks/useMemos";
import { useCategories } from "@/hooks/useCategories";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import type { Database } from "@/lib/database.types";

type Memo = Database['public']['Tables']['memos']['Row'];

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHours = hours % 12 || 12;
        return `오늘 ${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
    } else if (diffDays === 1) {
        return '어제';
    } else if (diffDays < 7) {
        return `${diffDays}일 전`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}주일 전`;
    } else {
        const months = Math.floor(diffDays / 30);
        return `${months}개월 전`;
    }
}

// 메모 카드 컴포넌트
function MemoCard({
    memo,
    isDragging,
    onPress,
    onToggleStar,
}: {
    memo: Memo;
    isDragging: boolean;
    onPress: (id: string, content: string, category: string, categoryColor: string) => void;
    onToggleStar: (id: string, isStarred: boolean) => void;
}) {
    const { width } = useWindowDimensions();
    const [expanded, setExpanded] = useState(false);

    const content = memo.content;
    const isHtml = content.includes('<') && content.includes('>');
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const lineBreakCount = (content.match(/<br\s*\/?>/gi) || []).length +
        (content.match(/<\/p>\s*<p>/gi) || []).length +
        (content.match(/\n/g) || []).length;
    const isLongContent = lineBreakCount >= 3 || plainText.length > 150;
    const contentWidth = width - Spacing['3xl'] * 2 - Spacing['2xl'] * 2;

    return (
        <View style={[styles.memoItemWrapper, isDragging && styles.memoItemDragging]}>
            <TouchableOpacity
                style={styles.memoContainer}
                onPress={() => onPress(memo.id, memo.content, memo.category, memo.category_color)}
                activeOpacity={0.7}
            >
                <View style={styles.memoHeader}>
                    <View style={[styles.categoryBadge, { backgroundColor: memo.category_color + '30' }]}>
                        <Text style={[styles.categoryText, { color: memo.category_color }]}>
                            {memo.category}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => onToggleStar(memo.id, memo.is_starred)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Star
                            size={16}
                            color={memo.is_starred ? Colors.accent : Colors.textMuted}
                            fill={memo.is_starred ? Colors.accent : 'transparent'}
                        />
                    </TouchableOpacity>
                </View>

                <View style={[styles.contentWrapper, !expanded && isLongContent && styles.contentCollapsed]}>
                    {isHtml ? (
                        Platform.OS === 'web' ? (
                            <>
                                <style>{`
                                    .memo-content-white * {
                                        color: #FFFFFF !important;
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                                        font-size: 12px !important;
                                        font-weight: normal !important;
                                    }
                                    .memo-content-white {
                                        color: #FFFFFF !important;
                                        font-size: 12px;
                                        line-height: 18px;
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                                    }
                                    .memo-content-white h1,
                                    .memo-content-white h2,
                                    .memo-content-white h3,
                                    .memo-content-white h4,
                                    .memo-content-white h5,
                                    .memo-content-white h6 {
                                        font-size: 12px !important;
                                        font-weight: normal !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        line-height: 18px !important;
                                    }
                                `}</style>
                                <div
                                    className="memo-content-white"
                                    dangerouslySetInnerHTML={{ __html: content }}
                                />
                            </>
                        ) : (
                            <RenderHtml
                                contentWidth={contentWidth}
                                source={{ html: content }}
                                ignoredDomTags={['font']}
                                ignoredStyles={['color', 'backgroundColor', 'fontFamily', 'fontSize']}
                                enableExperimentalMarginCollapsing={true}
                                tagsStyles={{
                                    body: {
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        lineHeight: 18,
                                        margin: 0,
                                        padding: 0,
                                    },
                                    p: {
                                        color: '#FFFFFF',
                                        marginVertical: 2,
                                        marginTop: 0,
                                        marginBottom: 4,
                                    },
                                    span: {
                                        color: '#FFFFFF',
                                    },
                                    li: {
                                        color: '#FFFFFF',
                                    },
                                    ul: {
                                        color: '#FFFFFF',
                                    },
                                    ol: {
                                        color: '#FFFFFF',
                                    },
                                    h1: {
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        fontWeight: 'normal',
                                        margin: 0,
                                        lineHeight: 18,
                                    },
                                    h2: {
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        fontWeight: 'normal',
                                        margin: 0,
                                        lineHeight: 18,
                                    },
                                    h3: {
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        fontWeight: 'normal',
                                        margin: 0,
                                        lineHeight: 18,
                                    },
                                    h4: {
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        fontWeight: 'normal',
                                        margin: 0,
                                        lineHeight: 18,
                                    },
                                    h5: {
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        fontWeight: 'normal',
                                        margin: 0,
                                        lineHeight: 18,
                                    },
                                    h6: {
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        fontWeight: 'normal',
                                        margin: 0,
                                        lineHeight: 18,
                                    },
                                    a: {
                                        color: '#FFFFFF',
                                    },
                                    strong: {
                                        color: '#FFFFFF',
                                    },
                                    b: {
                                        color: '#FFFFFF',
                                    },
                                    em: {
                                        color: '#FFFFFF',
                                    },
                                    i: {
                                        color: '#FFFFFF',
                                    },
                                }}
                                baseStyle={{
                                    color: '#FFFFFF',
                                }}
                            />
                        )
                    ) : (
                        <Text style={styles.memoContent} numberOfLines={expanded ? undefined : 3}>
                            {content}
                        </Text>
                    )}
                </View>

                <View style={styles.memoFooter}>
                    <Text style={styles.memoTime}>{formatTime(memo.updated_at)}</Text>
                    {isLongContent && (
                        <TouchableOpacity
                            onPress={() => setExpanded(!expanded)}
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
        </View>
    );
}

export function MemoScreen() {
    useScreenTracking('screen_memo');

    const { memos, loading, isDemoMode, addMemo, updateMemo, toggleStarred, deleteMemo, reorderMemos } = useMemos();
    const { categories, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategories();
    const { checkDemoAndNudge } = useDemoNudge();
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [starFilterActive, setStarFilterActive] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedMemo, setSelectedMemo] = useState<{
        id: string;
        content: string;
        category: string;
        categoryColor: string;
    } | null>(null);

    // 로컬 순서 상태
    const [orderedMemos, setOrderedMemos] = useState<Memo[]>([]);

    const baseFilteredMemos = (orderedMemos.length > 0 ? orderedMemos : memos).filter(memo => {
        // 순서가 적용된 상태에서도 삭제된 메모 제거
        if (!memos.some(m => m.id === memo.id)) return false;
        if (starFilterActive && !memo.is_starred) return false;
        if (selectedCategories.length > 0 && !selectedCategories.includes(memo.category)) return false;
        return true;
    });

    const filteredMemos = baseFilteredMemos;

    const handleToggleCategory = (categoryLabel: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryLabel)
                ? prev.filter(c => c !== categoryLabel)
                : [...prev, categoryLabel]
        );
    };

    const handleClearCategoryFilter = () => {
        setSelectedCategories([]);
    };

    const handleSelectAllCategories = () => {
        setSelectedCategories([]);
    };

    const isCategoryFilterActive = selectedCategories.length > 0;

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleAddMemo = async (content: string, category: string, categoryColor: string) => {
        const result = await addMemo(content, category, categoryColor);
        if (result?.demoBlocked) {
            checkDemoAndNudge('메모를 추가');
        }
    };

    const handleEditMemo = useCallback((id: string, content: string, category: string, categoryColor: string) => {
        setSelectedMemo({ id, content, category, categoryColor });
        setEditModalVisible(true);
    }, []);

    const handleUpdateMemo = async (id: string, updates: { content?: string; category?: string; category_color?: string }) => {
        await updateMemo(id, updates);
    };

    const handleDeleteMemo = async (id: string) => {
        await deleteMemo(id);
    };

    const handleToggleStar = useCallback(async (id: string, isStarred: boolean) => {
        await toggleStarred(id, isStarred);
    }, [toggleStarred]);

    const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
        setOrderedMemos(value => {
            const data = value.length > 0 ? value : memos;
            const newOrder = [...data];
            const [removed] = newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, removed);
            reorderMemos(newOrder);
            return newOrder;
        });
    }, [memos, reorderMemos]);

    const renderItem = useCallback((memo: Memo, index: number, isDragging: boolean) => (
        <MemoCard
            memo={memo}
            isDragging={isDragging}
            onPress={handleEditMemo}
            onToggleStar={handleToggleStar}
        />
    ), [handleEditMemo, handleToggleStar]);

    const keyExtractor = useCallback((item: Memo) => item.id, []);

    const getEmptyMessage = () => {
        if (starFilterActive && isCategoryFilterActive) {
            return { text: '조건에 맞는 메모가 없습니다.', subText: '필터를 변경해보세요.' };
        }
        if (starFilterActive) {
            return { text: '별표 친 메모가 없습니다.', subText: '메모에서 별표를 눌러 추가하세요.' };
        }
        if (isCategoryFilterActive) {
            return { text: '해당 카테고리의 메모가 없습니다.', subText: '다른 카테고리를 선택하거나 메모를 추가하세요.' };
        }
        return { text: '메모가 없습니다.', subText: '+ 버튼을 눌러 새 메모를 작성하세요.' };
    };

    const ListEmptyComponent = useCallback(() => {
        const { text, subText } = getEmptyMessage();
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{text}</Text>
                <Text style={styles.emptySubText}>{subText}</Text>
            </View>
        );
    }, [starFilterActive, isCategoryFilterActive]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <DemoBanner />
            {/* 고정 헤더 */}
            <View style={styles.fixedHeader}>
                <View style={styles.headerTitleContainer}>
                    <Image source={require('../../../assets/sparkle-icon.png')} style={styles.headerIcon} />
                    <Text style={styles.headerTitle}>메모</Text>
                </View>
                <View style={styles.headerActions}>
                    <Pressable
                        style={styles.headerButton}
                        onPress={() => showAlert('준비중', '검색 기능은 준비중입니다.')}
                    >
                        <Search size={20} color={Colors.textMuted} />
                    </Pressable>
                    <Pressable
                        style={styles.headerButton}
                        onPress={() => setCategoryModalVisible(true)}
                    >
                        <Tag size={20} color={Colors.textMuted} />
                    </Pressable>
                    <Pressable
                        style={styles.headerButton}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Filter
                            size={20}
                            color={isCategoryFilterActive ? Colors.accent : Colors.textMuted}
                            fill={isCategoryFilterActive ? Colors.accent : 'transparent'}
                        />
                    </Pressable>
                    <Pressable
                        style={styles.headerButton}
                        onPress={() => setStarFilterActive(!starFilterActive)}
                    >
                        <Star
                            size={20}
                            color={starFilterActive ? Colors.accent : Colors.textMuted}
                            fill={starFilterActive ? Colors.accent : 'transparent'}
                        />
                    </Pressable>
                </View>
            </View>

            {/* 메모 목록 */}
            <DraggableList
                data={filteredMemos}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onReorder={handleReorder}
                ListEmptyComponent={<ListEmptyComponent />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* 플로팅 추가 버튼 */}
            <Pressable style={styles.fab} onPress={() => {
                if (isDemoMode) {
                    checkDemoAndNudge('메모를 추가');
                    return;
                }
                setAddModalVisible(true);
            }}>
                <Plus size={24} color={Colors.textOnDark} strokeWidth={2.5} />
            </Pressable>

            {/* 모달 */}
            <AddMemoModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onAdd={handleAddMemo}
                categories={categories}
            />
            {selectedMemo && (
                <EditMemoModal
                    visible={editModalVisible}
                    onClose={() => {
                        setEditModalVisible(false);
                        setSelectedMemo(null);
                    }}
                    memoId={selectedMemo.id}
                    initialContent={selectedMemo.content}
                    initialCategory={selectedMemo.category}
                    initialCategoryColor={selectedMemo.categoryColor}
                    onEdit={handleUpdateMemo}
                    onDelete={handleDeleteMemo}
                    categories={categories}
                />
            )}
            <CategoryManageModal
                visible={categoryModalVisible}
                onClose={() => setCategoryModalVisible(false)}
                categories={categories}
                onAdd={addCategory}
                onUpdate={updateCategory}
                onDelete={deleteCategory}
                onReorder={reorderCategories}
            />
            <CategoryFilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                categories={categories}
                selectedCategories={selectedCategories}
                onToggleCategory={handleToggleCategory}
                onClearAll={handleClearCategoryFilter}
                onSelectAll={handleSelectAllCategories}
            />
        </SafeAreaView>
    );
}

export default MemoScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fixedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.md,
        backgroundColor: Colors.bgPrimary,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    headerIcon: {
        width: 23,
        height: 23,
    },
    headerTitle: {
        fontSize: FontSizes['3xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2xl'],
    },
    headerButton: {
        padding: Spacing.sm,
    },
    listContent: {
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing.md,
        paddingBottom: 100,
    },
    memoItemWrapper: {
        marginBottom: Spacing.md,
    },
    memoItemDragging: {
        opacity: 0.95,
    },
    memoContainer: {
        width: '100%',
        gap: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderPrimary,
        backgroundColor: Colors.bgSecondary,
        padding: Spacing['2xl'],
    },
    memoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        maxHeight: 54,
    },
    memoContent: {
        fontSize: 12,
        fontWeight: '400',
        color: '#FFFFFF',
        lineHeight: 18,
    },
    memoFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    memoTime: {
        fontSize: FontSizes.xs,
        fontWeight: '400',
        color: Colors.textMuted,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing['4xl'] * 2,
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textMuted,
        marginBottom: Spacing.sm,
    },
    emptySubText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    fab: {
        position: 'absolute',
        right: Spacing['3xl'],
        bottom: Spacing['3xl'],
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
        elevation: 8,
    },
});
