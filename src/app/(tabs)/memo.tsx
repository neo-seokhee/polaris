import { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert, Platform, Image } from "react-native";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Search, Tag, Filter, Star } from "lucide-react-native";
import { MemoCard } from "@/components/MemoCard";
import { AddMemoModal } from "@/components/AddMemoModal";
import { EditMemoModal } from "@/components/EditMemoModal";
import { CategoryManageModal } from "@/components/CategoryManageModal";
import { CategoryFilterModal } from "@/components/CategoryFilterModal";
import { DemoBanner } from "@/components/DemoBanner";
import { useMemos } from "@/hooks/useMemos";
import { useCategories } from "@/hooks/useCategories";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
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

export default function MemoScreen() {
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

    const filteredMemos = memos.filter(memo => {
        if (starFilterActive && !memo.is_starred) return false;
        if (selectedCategories.length > 0 && !selectedCategories.includes(memo.category)) return false;
        return true;
    });

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

    const handleEditMemo = (id: string, content: string, category: string, categoryColor: string) => {
        setSelectedMemo({ id, content, category, categoryColor });
        setEditModalVisible(true);
    };

    const handleUpdateMemo = async (id: string, updates: { content?: string; category?: string; category_color?: string }) => {
        await updateMemo(id, updates);
    };

    const handleDeleteMemo = async (id: string) => {
        await deleteMemo(id);
    };

    const handleToggleStar = async (id: string, isStarred: boolean) => {
        await toggleStarred(id, isStarred);
    };

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Memo>) => (
        <ScaleDecorator>
            <MemoCard
                id={item.id}
                category={item.category}
                categoryColor={item.category_color}
                content={item.content}
                time={formatTime(item.updated_at)}
                isStarred={item.is_starred}
                onPress={handleEditMemo}
                onToggleStar={handleToggleStar}
                drag={drag}
            />
        </ScaleDecorator>
    ), []);

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
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
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
            <DraggableFlatList
                data={filteredMemos}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onDragEnd={({ data }) => reorderMemos(data)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={ListEmptyComponent}
                activationDistance={15}
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
        paddingBottom: 100, // FAB 버튼 높이 + 여유 공간
        gap: Spacing.md,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
