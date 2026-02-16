import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView, Linking, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, ChevronDown, ChevronUp, Flame, Tag, CheckCircle, LayoutGrid, ListChecks } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { DraggableList } from "./DraggableList";
import { AddTodoModal } from "./AddTodoModal";
import { EditTodoModal } from "./EditTodoModal";
import { useTodos } from "@/hooks/useTodos";
import { useTodoCategories } from "@/hooks/useTodoCategories";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import { useWebLayout } from "@/contexts/WebLayoutContext";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import type { Database } from '@/lib/database.types';

type Todo = Database['public']['Tables']['todos']['Row'];

interface TodoSectionProps {
  ListHeaderComponent?: React.ReactElement;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function MemoText({ memo }: { memo: string }) {
  const urls = memo.match(URL_REGEX) ?? [];
  const uniqueUrls = Array.from(new Set(urls));
  const firstUrl = uniqueUrls[0] ?? null;
  const memoWithoutUrls = memo.replace(URL_REGEX, "").replace(/\s+/g, " ").trim();

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <View style={styles.todoMemoRow}>
      {!!memoWithoutUrls && (
        <Text style={styles.todoMemoInline} numberOfLines={1} ellipsizeMode="tail">
          {memoWithoutUrls}
        </Text>
      )}
      {!!firstUrl && (
        <Text
          style={styles.todoMemoLinkInline}
          numberOfLines={1}
          ellipsizeMode="tail"
          onPress={() => handleOpenLink(firstUrl)}
        >
          {firstUrl}
        </Text>
      )}
    </View>
  );
}

// 드래그 가능한 할일 아이템
function TodoItem({
  todo,
  isDragging,
  onToggleComplete,
  onToggleActive,
  onPress,
}: {
  todo: Todo;
  isDragging: boolean;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onPress: (todo: Todo) => void;
}) {
  return (
    <View style={[styles.todoItemWrapper, isDragging && styles.todoItemDragging]}>
      <View style={styles.todoContainer}>
        <Pressable
          style={styles.checkbox}
          onPress={() => onToggleComplete(todo.id, todo.is_completed)}
        >
          {todo.is_completed && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={styles.content}
          onPress={() => onPress(todo)}
        >
          <Text style={[styles.todoTitle, todo.is_completed && styles.todoTitleCompleted]}>
            {todo.title}
          </Text>
          {!!todo.memo && <MemoText memo={todo.memo} />}
          {todo.time && <Text style={styles.time}>{todo.time}</Text>}
        </Pressable>
        <Pressable
          style={[styles.actionButton, todo.is_active && styles.actionButtonActive]}
          onPress={() => onToggleActive(todo.id, todo.is_active)}
        >
          <Flame
            size={16}
            color={todo.is_active ? Colors.accent : Colors.textMuted}
            fill={todo.is_active ? Colors.accent : "transparent"}
          />
        </Pressable>
      </View>
    </View>
  );
}

// 정적 할일 아이템 (완료된 항목 및 카테고리 항목용)
function StaticTodoItem({
  todo,
  onToggleComplete,
  onToggleActive,
  onPress
}: {
  todo: Todo;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onPress: (todo: Todo) => void;
}) {
  return (
    <View style={styles.todoItemWrapper}>
      <View style={styles.todoContainer}>
        <Pressable
          style={styles.checkbox}
          onPress={() => onToggleComplete(todo.id, todo.is_completed)}
        >
          {todo.is_completed && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={styles.content}
          onPress={() => onPress(todo)}
        >
          <Text style={[styles.todoTitle, todo.is_completed && styles.todoTitleCompleted]}>
            {todo.title}
          </Text>
          {!!todo.memo && <MemoText memo={todo.memo} />}
        </Pressable>
        <Pressable
          style={[styles.actionButton, todo.is_active && styles.actionButtonActive]}
          onPress={() => onToggleActive(todo.id, todo.is_active)}
        >
          <Flame
            size={16}
            color={todo.is_active ? Colors.accent : Colors.textMuted}
            fill={todo.is_active ? Colors.accent : "transparent"}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function TodoSection({ ListHeaderComponent }: TodoSectionProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = useMemo(() => {
    if (!isWeb) return false;
    if (typeof navigator === "undefined") return width >= 1024;
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return !isMobileUA && width >= 1024;
  }, [isWeb, width]);
  const { setTodoBoardWide } = useWebLayout();
  const { todos, loading, isDemoMode, addTodo, updateTodo, updateTodoCategory, clearCategoryFromTodos, toggleCompleted, toggleActive, deleteTodo, refetch } = useTodos();
  const { categories, addCategory, deleteCategory, reorderCategory } = useTodoCategories();
  const { checkDemoAndNudge } = useDemoNudge();
  const [modalVisible, setModalVisible] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isBoardView, setIsBoardView] = useState(false);

  // 카테고리별 접기 상태 (기본적으로 접힌 상태)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  // 드래그 순서 상태
  const [importantOrder, setImportantOrder] = useState<string[]>([]);
  const [normalOrder, setNormalOrder] = useState<string[]>([]);
  const [categoryOrders, setCategoryOrders] = useState<Record<string, string[]>>({});
  const [dragOverColumnKey, setDragOverColumnKey] = useState<string | null>(null);
  const pendingCrossDropRef = useRef<{
    sourceColumnKey: string;
    targetColumnKey: string;
  } | null>(null);

  const handleAddTodo = async (title: string, memo?: string | null) => {
    const result = await addTodo(title, memo);
    if (result?.demoBlocked) {
      checkDemoAndNudge('할일을 추가');
    }
  };

  const handleEditTodo = useCallback((todo: Todo) => {
    setSelectedTodo(todo);
    setEditModalVisible(true);
  }, []);

  const handleUpdateTodo = async (id: string, title: string, memo?: string | null) => {
    if (updateTodo) {
      const result = await updateTodo(id, title, memo);
      if (result?.demoBlocked) {
        checkDemoAndNudge('할일을 수정');
      }
    }
  };

  const handleCategoryChange = async (id: string, category: string | null) => {
    if (updateTodoCategory) {
      const result = await updateTodoCategory(id, category);
      if (result?.demoBlocked) {
        checkDemoAndNudge('카테고리를 변경');
        return;
      }
      setImportantOrder(prev => prev.filter(todoId => todoId !== id));
      setNormalOrder(prev => prev.filter(todoId => todoId !== id));
      setCategoryOrders(prev => {
        const next: Record<string, string[]> = {};
        Object.entries(prev).forEach(([key, ids]) => {
          next[key] = ids.filter(todoId => todoId !== id);
        });
        return next;
      });
    }
  };

  const handleAddCategory = async (name: string) => {
    const result = await addCategory(name);
    if (result?.demoBlocked) {
      checkDemoAndNudge('카테고리를 추가');
      return { error: '데모 모드에서는 사용할 수 없습니다.' };
    }
    return { error: result?.error || null };
  };

  const handleDeleteCategory = async (name: string) => {
    const result = await deleteCategory(name);
    if (result?.demoBlocked) {
      checkDemoAndNudge('카테고리를 삭제');
      return { error: '데모 모드에서는 사용할 수 없습니다.' };
    }
    if (!result?.error) {
      clearCategoryFromTodos(name);
    }
    return { error: result?.error || null, deletedCategory: result?.deletedCategory };
  };

  const handleReorderCategory = async (name: string, direction: 'up' | 'down') => {
    const result = await reorderCategory(name, direction);
    if (result?.demoBlocked) {
      checkDemoAndNudge('카테고리 순서를 변경');
      return { error: '데모 모드에서는 사용할 수 없습니다.' };
    }
    return { error: result?.error || null };
  };

  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    const targetTodo = todos.find(todo => todo.id === id);
    // 카테고리 할일을 중요로 전환할 때는 카테고리에서 분리하여 중요 섹션으로 이동시킨다.
    if (!isActive && targetTodo?.category) {
      const categoryResult = await updateTodoCategory(id, null);
      if (categoryResult?.demoBlocked) {
        checkDemoAndNudge('할일 상태를 변경');
        return;
      }
      const categoryError = (categoryResult as any)?.error;
      if (categoryError) return;
    }

    const result = await toggleActive(id, isActive);
    if (result?.demoBlocked) {
      checkDemoAndNudge('할일 상태를 변경');
      return;
    }
    // 섹션 이동 시 해당 섹션의 순서 목록에서 제거
    if (isActive) {
      setImportantOrder(prev => prev.filter(i => i !== id));
    } else {
      setNormalOrder(prev => prev.filter(i => i !== id));
    }
  }, [todos, updateTodoCategory, toggleActive, checkDemoAndNudge]);

  const toggleCategoryCollapse = (categoryName: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  // 중요 항목 (미지정 카테고리만)
  const importantTodos = useMemo(() => {
    const base = todos
      .filter(todo => !todo.is_completed && todo.is_active && !todo.category)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (importantOrder.length === 0) return base;

    const orderedSet = new Set(importantOrder);
    const ordered = importantOrder
      .map(id => base.find(t => t.id === id))
      .filter((t): t is Todo => t !== undefined);
    const newItems = base.filter(t => !orderedSet.has(t.id));
    return [...ordered, ...newItems];
  }, [todos, importantOrder]);

  // 일반 항목 (미지정 카테고리만)
  const normalTodos = useMemo(() => {
    const base = todos
      .filter(todo => !todo.is_completed && !todo.is_active && !todo.category)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (normalOrder.length === 0) return base;

    const orderedSet = new Set(normalOrder);
    const ordered = normalOrder
      .map(id => base.find(t => t.id === id))
      .filter((t): t is Todo => t !== undefined);
    const newItems = base.filter(t => !orderedSet.has(t.id));
    return [...ordered, ...newItems];
  }, [todos, normalOrder]);

  // 카테고리별 할일 그룹화
  const categorizedTodos = useMemo(() => {
    const groups: { [key: string]: Todo[] } = {};

    categories.forEach(cat => {
      const base = todos
        .filter(todo => !todo.is_completed && todo.category === cat.name)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const order = categoryOrders[cat.name] || [];
      if (order.length === 0) {
        groups[cat.name] = base;
        return;
      }

      const orderedSet = new Set(order);
      const ordered = order
        .map(id => base.find(t => t.id === id))
        .filter((t): t is Todo => t !== undefined);
      const newItems = base.filter(t => !orderedSet.has(t.id));
      groups[cat.name] = [...ordered, ...newItems];
    });

    return groups;
  }, [todos, categories, categoryOrders]);

  // 완료된 항목
  const completedTodos = useMemo(() => todos
    .filter(todo => todo.is_completed)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [todos]);

  const hasNoTodos = importantTodos.length === 0 && normalTodos.length === 0 &&
    Object.values(categorizedTodos).every(arr => arr.length === 0) && completedTodos.length === 0;

  // 드래그 리오더 핸들러
  const handleImportantReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...importantTodos];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setImportantOrder(newOrder.map(t => t.id));
  }, [importantTodos]);

  const handleNormalReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...normalTodos];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setNormalOrder(newOrder.map(t => t.id));
  }, [normalTodos]);

  const handleCategoryReorder = useCallback((categoryName: string, fromIndex: number, toIndex: number) => {
    const categoryTodos = categorizedTodos[categoryName] || [];
    if (categoryTodos.length === 0) return;
    const newOrder = [...categoryTodos];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setCategoryOrders(prev => ({
      ...prev,
      [categoryName]: newOrder.map(t => t.id),
    }));
  }, [categorizedTodos]);

  const getColumnKeyForTodo = useCallback((todo: Todo): string => {
    if (!todo.category && todo.is_active) return "important";
    if (!todo.category && !todo.is_active) return "normal";
    return `category:${todo.category}`;
  }, []);

  const applyInsertOrder = useCallback((ids: string[], movingId: string, toIndex: number) => {
    const filtered = ids.filter(id => id !== movingId);
    const safeIndex = Math.max(0, Math.min(toIndex, filtered.length));
    filtered.splice(safeIndex, 0, movingId);
    return filtered;
  }, []);

  const setOrderForColumn = useCallback((columnKey: string, movingId: string, toIndex: number) => {
    if (columnKey === "important") {
      const baseIds = importantTodos.map(t => t.id);
      setImportantOrder(applyInsertOrder(baseIds, movingId, toIndex));
      return;
    }
    if (columnKey === "normal") {
      const baseIds = normalTodos.map(t => t.id);
      setNormalOrder(applyInsertOrder(baseIds, movingId, toIndex));
      return;
    }
    if (columnKey.startsWith("category:")) {
      const categoryName = columnKey.replace("category:", "");
      const baseIds = (categorizedTodos[categoryName] || []).map(t => t.id);
      setCategoryOrders(prev => ({
        ...prev,
        [categoryName]: applyInsertOrder(baseIds, movingId, toIndex),
      }));
    }
  }, [importantTodos, normalTodos, categorizedTodos, applyInsertOrder]);

  const moveTodoToColumn = useCallback(async (todo: Todo, targetColumnKey: string, toIndex: number) => {
    const sourceColumnKey = getColumnKeyForTodo(todo);
    if (sourceColumnKey === targetColumnKey) {
      setOrderForColumn(targetColumnKey, todo.id, toIndex);
      return;
    }

    if (targetColumnKey === "important" || targetColumnKey === "normal") {
      if (todo.category !== null) {
        await handleCategoryChange(todo.id, null);
      }
      const shouldBeActive = targetColumnKey === "important";
      if (todo.is_active !== shouldBeActive) {
        await handleToggleActive(todo.id, todo.is_active);
      }
      setOrderForColumn(targetColumnKey, todo.id, toIndex);
      return;
    }

    if (targetColumnKey.startsWith("category:")) {
      const categoryName = targetColumnKey.replace("category:", "");
      if (todo.category !== categoryName) {
        await handleCategoryChange(todo.id, categoryName);
      }
      setOrderForColumn(targetColumnKey, todo.id, toIndex);
    }
  }, [getColumnKeyForTodo, setOrderForColumn, handleCategoryChange, handleToggleActive]);

  // 렌더 아이템 함수
  const renderImportantItem = useCallback((todo: Todo, index: number, isDragging: boolean) => (
    <TodoItem
      todo={todo}
      isDragging={isDragging}
      onToggleComplete={toggleCompleted}
      onToggleActive={handleToggleActive}
      onPress={handleEditTodo}
    />
  ), [toggleCompleted, handleToggleActive, handleEditTodo]);

  const renderNormalItem = useCallback((todo: Todo, index: number, isDragging: boolean) => (
    <TodoItem
      todo={todo}
      isDragging={isDragging}
      onToggleComplete={toggleCompleted}
      onToggleActive={handleToggleActive}
      onPress={handleEditTodo}
    />
  ), [toggleCompleted, handleToggleActive, handleEditTodo]);

  const keyExtractor = useCallback((todo: Todo) => todo.id, []);
  const boardColumns = useMemo(() => {
    const columns: {
      id: string;
      key: string;
      title: string;
      todos: Todo[];
      tone?: "accent" | "normal";
      onReorder: (fromIndex: number, toIndex: number) => void;
    }[] = [];
    if (importantTodos.length > 0) {
      columns.push({
        id: "important",
        key: "important",
        title: "중요",
        todos: importantTodos,
        tone: "accent",
        onReorder: handleImportantReorder,
      });
    }
    if (normalTodos.length > 0) {
      columns.push({
        id: "normal",
        key: "normal",
        title: "할일",
        todos: normalTodos,
        tone: "normal",
        onReorder: handleNormalReorder,
      });
    }
    categories.forEach(category => {
      const categoryTodos = categorizedTodos[category.name] || [];
      columns.push({
        id: category.id,
        key: `category:${category.name}`,
        title: category.name,
        todos: categoryTodos,
        tone: "normal",
        onReorder: (fromIndex: number, toIndex: number) =>
          handleCategoryReorder(category.name, fromIndex, toIndex),
      });
    });
    return columns;
  }, [importantTodos, normalTodos, categories, categorizedTodos, handleImportantReorder, handleNormalReorder, handleCategoryReorder]);

  const renderBoardItem = useCallback((todo: Todo, index: number, isDragging: boolean) => (
    <TodoItem
      todo={todo}
      isDragging={isDragging}
      onToggleComplete={toggleCompleted}
      onToggleActive={handleToggleActive}
      onPress={handleEditTodo}
    />
  ), [toggleCompleted, handleToggleActive, handleEditTodo]);
  const boardColumnWidth = 320 + Spacing.md;

  const resolveTargetColumnKey = useCallback((sourceColumnKey: string, translationX: number) => {
    const sourceIndex = boardColumns.findIndex(column => column.key === sourceColumnKey);
    if (sourceIndex < 0) return sourceColumnKey;

    const delta = Math.round(translationX / boardColumnWidth);
    const targetIndex = Math.max(0, Math.min(boardColumns.length - 1, sourceIndex + delta));
    return boardColumns[targetIndex]?.key ?? sourceColumnKey;
  }, [boardColumns, boardColumnWidth]);

  const estimateTargetIndex = useCallback((fromIndex: number, translationY: number, targetCount: number) => {
    const estimated = fromIndex + Math.round(translationY / 76);
    return Math.max(0, Math.min(targetCount, estimated));
  }, []);

  const handleBoardDragEnd = useCallback((params: {
    listId?: string;
    item: Todo;
    fromIndex: number;
    toIndex: number;
    translationX: number;
    translationY: number;
  }) => {
    const sourceColumnKey = params.listId || getColumnKeyForTodo(params.item);
    const targetColumnKey = resolveTargetColumnKey(sourceColumnKey, params.translationX);
    setDragOverColumnKey(null);

    if (targetColumnKey === sourceColumnKey) {
      pendingCrossDropRef.current = null;
      return;
    }

    pendingCrossDropRef.current = { sourceColumnKey, targetColumnKey };
    const targetColumn = boardColumns.find(column => column.key === targetColumnKey);
    const targetCount = targetColumn?.todos.length ?? 0;
    const targetIndex = estimateTargetIndex(params.fromIndex, params.translationY, targetCount);
    void moveTodoToColumn(params.item, targetColumnKey, targetIndex);
  }, [boardColumns, estimateTargetIndex, getColumnKeyForTodo, moveTodoToColumn, resolveTargetColumnKey]);

  const handleBoardDragMove = useCallback((params: {
    listId?: string;
    item: Todo;
    fromIndex: number;
    currentIndex: number;
    translationX: number;
    translationY: number;
  }) => {
    const sourceColumnKey = params.listId || getColumnKeyForTodo(params.item);
    const targetColumnKey = resolveTargetColumnKey(sourceColumnKey, params.translationX);
    setDragOverColumnKey(targetColumnKey);
  }, [getColumnKeyForTodo, resolveTargetColumnKey]);

  const shouldCommitBoardReorder = useCallback((params: {
    listId?: string;
    fromIndex: number;
    toIndex: number;
  }) => {
    const pending = pendingCrossDropRef.current;
    if (!pending) return true;
    if (pending.sourceColumnKey !== params.listId) return true;
    pendingCrossDropRef.current = null;
    return pending.sourceColumnKey === pending.targetColumnKey;
  }, []);
  const shouldRenderBoard = isBoardView && isDesktopWeb;

  useFocusEffect(
    useCallback(() => {
      void refetch();
      return () => {
        setIsBoardView(false);
        setTodoBoardWide(false);
      };
    }, [refetch, setTodoBoardWide])
  );

  const handleToggleBoardView = useCallback(() => {
    if (!isDesktopWeb) return;
    setIsBoardView(prev => {
      const next = !prev;
      setTodoBoardWide(next);
      return next;
    });
  }, [isDesktopWeb, setTodoBoardWide]);

  useEffect(() => {
    if (!isDesktopWeb && isBoardView) {
      setIsBoardView(false);
      setTodoBoardWide(false);
    }
  }, [isDesktopWeb, isBoardView, setTodoBoardWide]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 헤더 컴포넌트 */}
        {ListHeaderComponent}

        {/* 오늘의 할일 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>오늘의 할일</Text>
        </View>

        {/* 빈 상태 */}
        {hasNoTodos && (
          <Text style={styles.emptyText}>할일이 없습니다. + 버튼을 눌러 추가하세요.</Text>
        )}

        {shouldRenderBoard && boardColumns.length > 0 && (
          <ScrollView
            horizontal
            style={styles.boardScroll}
            contentContainerStyle={styles.boardContent}
            showsHorizontalScrollIndicator={false}
          >
            {boardColumns.map(column => (
              <View
                key={column.id}
                style={[
                  styles.boardColumn,
                  dragOverColumnKey === column.key && styles.boardColumnDragOver,
                ]}
              >
                <View style={styles.boardColumnHeader}>
                  <Text style={[styles.boardColumnTitle, column.tone === "accent" && styles.boardColumnTitleAccent]}>
                    {column.title}
                  </Text>
                  <Text style={styles.boardColumnCount}>{column.todos.length}</Text>
                </View>
                <View style={styles.boardColumnList}>
                  <DraggableList
                    listId={column.key}
                    data={column.todos}
                    renderItem={renderBoardItem}
                    keyExtractor={keyExtractor}
                    onReorder={column.onReorder}
                    onDragMoveEvent={handleBoardDragMove}
                    onDragEndEvent={handleBoardDragEnd}
                    shouldCommitReorder={shouldCommitBoardReorder}
                    scrollEnabled
                    contentContainerStyle={styles.boardColumnListContent}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {!shouldRenderBoard && (
          <>
            {/* 중요 항목 섹션 */}
            {importantTodos.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Flame size={14} color={Colors.accent} fill={Colors.accent} />
                  <Text style={styles.sectionTitle}>중요</Text>
                  <Text style={styles.sectionCount}>{importantTodos.length}</Text>
                </View>
                <DraggableList
                  data={importantTodos}
                  renderItem={renderImportantItem}
                  keyExtractor={keyExtractor}
                  onReorder={handleImportantReorder}
                  scrollEnabled={false}
                />
              </>
            )}

            {/* 구분선 */}
            {importantTodos.length > 0 && normalTodos.length > 0 && (
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
              </View>
            )}

            {/* 일반 항목 섹션 */}
            {normalTodos.length > 0 && (
              <DraggableList
                data={normalTodos}
                renderItem={renderNormalItem}
                keyExtractor={keyExtractor}
                onReorder={handleNormalReorder}
                scrollEnabled={false}
              />
            )}

            {/* 카테고리별 섹션들 */}
            {categories.map(category => {
              const categoryTodos = categorizedTodos[category.name] || [];
              if (categoryTodos.length === 0) return null;

              const isCollapsed = !collapsedCategories.has(category.name);

              return (
                <View key={category.id}>
                  <Pressable
                    style={styles.categoryHeader}
                    onPress={() => toggleCategoryCollapse(category.name)}
                  >
                    <View style={styles.categoryHeaderLeft}>
                      <Tag size={14} color={Colors.textMuted} />
                      <Text style={styles.categoryTitle}>{category.name} ({categoryTodos.length})</Text>
                    </View>
                    {isCollapsed
                      ? <ChevronDown size={18} color={Colors.textMuted} />
                      : <ChevronUp size={18} color={Colors.textMuted} />
                    }
                  </Pressable>
                  {!isCollapsed && categoryTodos.map(todo => (
                    <StaticTodoItem
                      key={todo.id}
                      todo={todo}
                      onToggleComplete={toggleCompleted}
                      onToggleActive={handleToggleActive}
                      onPress={handleEditTodo}
                    />
                  ))}
                </View>
              );
            })}

            {/* 완료된 항목 섹션 */}
            {completedTodos.length > 0 && (
              <>
                <Pressable style={styles.completedHeader} onPress={() => setShowCompleted(!showCompleted)}>
                  <View style={styles.completedHeaderLeft}>
                    <CheckCircle size={14} color={Colors.textMuted} />
                    <Text style={styles.completedTitle}>완료된 항목 ({completedTodos.length})</Text>
                  </View>
                  {showCompleted
                    ? <ChevronUp size={18} color={Colors.textMuted} />
                    : <ChevronDown size={18} color={Colors.textMuted} />
                  }
                </Pressable>
                {showCompleted && completedTodos.map(todo => (
                  <StaticTodoItem
                    key={todo.id}
                    todo={todo}
                    onToggleComplete={toggleCompleted}
                    onToggleActive={handleToggleActive}
                    onPress={handleEditTodo}
                  />
                ))}
              </>
            )}
          </>
        )}

        {shouldRenderBoard && completedTodos.length > 0 && (
          <View style={styles.completedBoardInline}>
            <Pressable style={styles.completedHeader} onPress={() => setShowCompleted(!showCompleted)}>
              <View style={styles.completedHeaderLeft}>
                <CheckCircle size={14} color={Colors.textMuted} />
                <Text style={styles.completedTitle}>완료된 항목 ({completedTodos.length})</Text>
              </View>
              {showCompleted
                ? <ChevronUp size={18} color={Colors.textMuted} />
                : <ChevronDown size={18} color={Colors.textMuted} />
              }
            </Pressable>
            {showCompleted && completedTodos.map(todo => (
                <StaticTodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={toggleCompleted}
                  onToggleActive={handleToggleActive}
                  onPress={handleEditTodo}
                />
              ))}
          </View>
        )}
      </ScrollView>

      {isDesktopWeb && (
        <Pressable
          style={[
            styles.boardFab,
            { bottom: (insets.bottom || 0) + Spacing['3xl'] + 64 },
          ]}
          onPress={handleToggleBoardView}
        >
          {isBoardView
            ? <ListChecks size={24} color={Colors.textOnDark} />
            : <LayoutGrid size={24} color={Colors.textOnDark} />
          }
        </Pressable>
      )}

      <Pressable style={[styles.fab, { bottom: Spacing['3xl'] }]} onPress={() => {
        if (isDemoMode) {
          checkDemoAndNudge('할일을 추가');
          return;
        }
        setModalVisible(true);
      }}>
        <Plus size={24} color={Colors.textOnDark} strokeWidth={2.5} />
      </Pressable>
      <AddTodoModal visible={modalVisible} onClose={() => setModalVisible(false)} onAdd={handleAddTodo} />
      <EditTodoModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        todoId={selectedTodo?.id || ""}
        initialTitle={selectedTodo?.title || ""}
        initialMemo={selectedTodo?.memo || ""}
        initialCategory={selectedTodo?.category || null}
        categories={categories}
        onEdit={handleUpdateTodo}
        onDelete={deleteTodo}
        onCategoryChange={handleCategoryChange}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onReorderCategory={handleReorderCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: 100,
  },
  boardScroll: {
    marginTop: Spacing.sm,
  },
  boardContent: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingRight: Spacing['2xl'],
  },
  boardColumn: {
    width: 320,
    maxHeight: 620,
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    padding: Spacing.md,
  },
  boardColumnDragOver: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  boardColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  boardColumnTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  boardColumnTitleAccent: {
    color: Colors.accent,
  },
  boardColumnCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  boardColumnList: {
    flex: 1,
    maxHeight: 560,
  },
  boardColumnListContent: {
    paddingBottom: Spacing.sm,
  },
  todoItemWrapper: {
    marginBottom: Spacing.md,
  },
  todoItemDragging: {
    opacity: 0.95,
  },
  todoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.borderPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  todoTitle: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  todoTitleCompleted: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
  todoMemoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  todoMemoInline: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    flexShrink: 1,
    minWidth: 0,
  },
  todoMemoLinkInline: {
    fontSize: FontSizes.sm,
    color: Colors.accent,
    textDecorationLine: "underline",
    flexShrink: 1,
    minWidth: 0,
  },
  time: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonActive: {
    backgroundColor: Colors.accentBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  title: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing['4xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  sectionCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  dividerContainer: {
    paddingVertical: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderPrimary,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.bgTertiary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.bgTertiary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  completedBoardInline: {
    marginTop: Spacing.sm,
  },
  boardFab: {
    position: 'absolute',
    right: Spacing['3xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.25)',
    elevation: 4,
    zIndex: 9999,
  },
  fab: {
    position: 'absolute',
    right: Spacing['3xl'],
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
