import { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Plus, ChevronDown, ChevronUp, Flame } from "lucide-react-native";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { TodoItem } from "./TodoItem";
import { AddTodoModal } from "./AddTodoModal";
import { EditTodoModal } from "./EditTodoModal";
import { useTodos } from "@/hooks/useTodos";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import type { Database } from '@/lib/database.types';

type Todo = Database['public']['Tables']['todos']['Row'];

// 리스트 아이템 타입 정의
type ListItemType =
  | { type: 'header'; component: React.ReactElement }
  | { type: 'todoHeader' }
  | { type: 'empty' }
  | { type: 'sectionHeader'; title: string; count: number }
  | { type: 'todo'; data: Todo; section: 'important' | 'normal' }
  | { type: 'divider' }
  | { type: 'completedHeader'; count: number; expanded: boolean }
  | { type: 'completedTodo'; data: Todo };

interface TodoSectionProps {
  ListHeaderComponent?: React.ReactElement;
}

export function TodoSection({ ListHeaderComponent }: TodoSectionProps) {
  const { todos, loading, isDemoMode, addTodo, updateTodo, toggleCompleted, toggleActive, deleteTodo } = useTodos();
  const { checkDemoAndNudge } = useDemoNudge();
  const [modalVisible, setModalVisible] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string>("");
  const [selectedTodoTitle, setSelectedTodoTitle] = useState<string>("");

  // 로컬 순서 상태 (드래그용)
  const [importantOrder, setImportantOrder] = useState<string[]>([]);
  const [normalOrder, setNormalOrder] = useState<string[]>([]);

  const handleAddTodo = async (title: string) => {
    const result = await addTodo(title);
    if (result?.demoBlocked) {
      checkDemoAndNudge('할일을 추가');
    }
  };

  const handleEditTodo = (id: string, title: string) => {
    setSelectedTodoId(id);
    setSelectedTodoTitle(title);
    setEditModalVisible(true);
  };

  const handleUpdateTodo = async (id: string, title: string) => {
    if (updateTodo) {
      const result = await updateTodo(id, title);
      if (result?.demoBlocked) {
        checkDemoAndNudge('할일을 수정');
      }
    }
  };

  // 중요 항목 (is_active === true)
  const importantTodosBase = todos
    .filter(todo => !todo.is_completed && todo.is_active)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 일반 항목 (is_active === false)
  const normalTodosBase = todos
    .filter(todo => !todo.is_completed && !todo.is_active)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 로컬 순서 적용
  const importantTodos = importantOrder.length > 0
    ? importantOrder
        .map(id => importantTodosBase.find(t => t.id === id))
        .filter((t): t is Todo => t !== undefined)
        .concat(importantTodosBase.filter(t => !importantOrder.includes(t.id)))
    : importantTodosBase;

  const normalTodos = normalOrder.length > 0
    ? normalOrder
        .map(id => normalTodosBase.find(t => t.id === id))
        .filter((t): t is Todo => t !== undefined)
        .concat(normalTodosBase.filter(t => !normalOrder.includes(t.id)))
    : normalTodosBase;

  // 완료된 항목
  const completedTodos = todos
    .filter(todo => todo.is_completed)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const hasNoTodos = importantTodos.length === 0 && normalTodos.length === 0 && completedTodos.length === 0;

  // 통합 리스트 데이터 생성
  const listData = useMemo((): ListItemType[] => {
    const items: ListItemType[] = [];

    // 헤더 컴포넌트
    if (ListHeaderComponent) {
      items.push({ type: 'header', component: ListHeaderComponent });
    }

    // 오늘의 할일 헤더
    items.push({ type: 'todoHeader' });

    // 빈 상태
    if (hasNoTodos) {
      items.push({ type: 'empty' });
    }

    // 중요 항목 섹션
    if (importantTodos.length > 0) {
      items.push({ type: 'sectionHeader', title: '중요', count: importantTodos.length });
      importantTodos.forEach(todo => {
        items.push({ type: 'todo', data: todo, section: 'important' });
      });
    }

    // 구분선
    if (importantTodos.length > 0 && normalTodos.length > 0) {
      items.push({ type: 'divider' });
    }

    // 일반 항목
    if (normalTodos.length > 0) {
      normalTodos.forEach(todo => {
        items.push({ type: 'todo', data: todo, section: 'normal' });
      });
    }

    // 완료된 항목 헤더
    if (completedTodos.length > 0) {
      items.push({ type: 'completedHeader', count: completedTodos.length, expanded: showCompleted });

      if (showCompleted) {
        completedTodos.forEach(todo => {
          items.push({ type: 'completedTodo', data: todo });
        });
      }
    }

    return items;
  }, [ListHeaderComponent, hasNoTodos, importantTodos, normalTodos, completedTodos, showCompleted]);

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback(({ data, from, to }: { data: ListItemType[]; from: number; to: number }) => {
    if (from === to) return;

    const fromItem = listData[from];
    const toItem = listData[to];

    // 할일 항목만 드래그 가능
    if (fromItem.type !== 'todo') return;

    // 같은 섹션 내에서만 이동 가능
    if (toItem.type === 'todo' && fromItem.section === toItem.section) {
      const section = fromItem.section;
      const sectionTodos = data
        .filter((item): item is Extract<ListItemType, { type: 'todo' }> =>
          item.type === 'todo' && item.section === section
        )
        .map(item => item.data.id);

      if (section === 'important') {
        setImportantOrder(sectionTodos);
      } else {
        setNormalOrder(sectionTodos);
      }
    }
  }, [listData]);

  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    const result = await toggleActive(id, isActive);
    if (result?.demoBlocked) {
      checkDemoAndNudge('할일 상태를 변경');
      return;
    }
    if (isActive) {
      setImportantOrder(prev => prev.filter(i => i !== id));
    } else {
      setNormalOrder(prev => prev.filter(i => i !== id));
    }
  }, [toggleActive, checkDemoAndNudge]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ListItemType>) => {
    switch (item.type) {
      case 'header':
        return item.component;

      case 'todoHeader':
        return (
          <View style={styles.header}>
            <Text style={styles.title}>오늘의 할일</Text>
          </View>
        );

      case 'empty':
        return (
          <Text style={styles.emptyText}>할일이 없습니다. + 버튼을 눌러 추가하세요.</Text>
        );

      case 'sectionHeader':
        return (
          <View style={styles.sectionHeader}>
            <Flame size={14} color={Colors.accent} fill={Colors.accent} />
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.sectionCount}>{item.count}</Text>
          </View>
        );

      case 'todo':
        return (
          <ScaleDecorator>
            <TodoItem
              id={item.data.id}
              title={item.data.title}
              time={item.data.time}
              isActive={item.data.is_active}
              isCompleted={item.data.is_completed}
              onToggleComplete={toggleCompleted}
              onToggleActive={handleToggleActive}
              onPress={handleEditTodo}
              drag={drag}
            />
          </ScaleDecorator>
        );

      case 'divider':
        return (
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
          </View>
        );

      case 'completedHeader':
        return (
          <Pressable style={styles.completedHeader} onPress={() => setShowCompleted(!showCompleted)}>
            <Text style={styles.completedTitle}>완료된 항목 ({item.count})</Text>
            {item.expanded
              ? <ChevronUp size={18} color={Colors.textMuted} />
              : <ChevronDown size={18} color={Colors.textMuted} />
            }
          </Pressable>
        );

      case 'completedTodo':
        return (
          <TodoItem
            id={item.data.id}
            title={item.data.title}
            time={item.data.time}
            isActive={item.data.is_active}
            isCompleted={item.data.is_completed}
            onToggleComplete={toggleCompleted}
            onToggleActive={handleToggleActive}
            onPress={handleEditTodo}
          />
        );

      default:
        return null;
    }
  }, [toggleCompleted, handleToggleActive, handleEditTodo, showCompleted]);

  const keyExtractor = useCallback((item: ListItemType, index: number) => {
    switch (item.type) {
      case 'todo':
      case 'completedTodo':
        return item.data.id;
      default:
        return `${item.type}-${index}`;
    }
  }, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 60,
    offset: 60 * index,
    index,
  }), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        activationDistance={20}
      />
      <Pressable style={styles.fab} onPress={() => {
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
        todoId={selectedTodoId}
        initialTitle={selectedTodoTitle}
        onEdit={handleUpdateTodo}
        onDelete={deleteTodo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.md,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.md,
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
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderPrimary,
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
  },
  completedTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
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
