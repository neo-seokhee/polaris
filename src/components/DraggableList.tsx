import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';

interface DraggableListProps<T> {
  data: T[];
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onReorder: (fromIndex: number, toIndex: number) => void;
  listId?: string;
  onDragEndEvent?: (params: {
    listId?: string;
    item: T;
    fromIndex: number;
    toIndex: number;
    translationX: number;
    translationY: number;
  }) => void;
  onDragMoveEvent?: (params: {
    listId?: string;
    item: T;
    fromIndex: number;
    currentIndex: number;
    translationX: number;
    translationY: number;
  }) => void;
  shouldCommitReorder?: (params: {
    listId?: string;
    fromIndex: number;
    toIndex: number;
  }) => boolean;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  contentContainerStyle?: object;
  showsVerticalScrollIndicator?: boolean;
  scrollEnabled?: boolean;
}

const ITEM_HEIGHT = 70; // 대략적인 아이템 높이 (실제 측정으로 업데이트됨)

export function DraggableList<T>({
  data,
  renderItem,
  keyExtractor,
  onReorder,
  listId,
  onDragEndEvent,
  onDragMoveEvent,
  shouldCommitReorder,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  scrollEnabled = true,
}: DraggableListProps<T>) {
  const itemHeights = useRef<number[]>([]);
  const draggedIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const currentIndex = useSharedValue(-1);
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState(-1);

  // 아이템 높이 측정
  const handleItemLayout = useCallback((index: number, height: number) => {
    itemHeights.current[index] = height;
  }, []);

  // 드래그 완료 시 리오더 호출
  const handleReorderComplete = useCallback((from: number, to: number) => {
    if (shouldCommitReorder && !shouldCommitReorder({ listId, fromIndex: from, toIndex: to })) {
      return;
    }
    if (from !== to && from >= 0 && to >= 0 && from < data.length && to < data.length) {
      onReorder(from, to);
    }
  }, [onReorder, data.length, shouldCommitReorder, listId]);

  const handleDragEndEvent = useCallback((from: number, to: number, translationX: number, translationY: number) => {
    if (!onDragEndEvent) return;
    if (from < 0 || from >= data.length) return;
    const item = data[from];
    if (!item) return;

    onDragEndEvent({
      listId,
      item,
      fromIndex: from,
      toIndex: to,
      translationX,
      translationY,
    });
  }, [onDragEndEvent, data, listId]);

  const handleDragMoveEvent = useCallback((from: number, current: number, translationX: number, translationY: number) => {
    if (!onDragMoveEvent) return;
    if (from < 0 || from >= data.length) return;
    const item = data[from];
    if (!item) return;

    onDragMoveEvent({
      listId,
      item,
      fromIndex: from,
      currentIndex: current,
      translationX,
      translationY,
    });
  }, [onDragMoveEvent, data, listId]);

  // 현재 드래그 위치에 따른 타겟 인덱스 계산
  const calculateTargetIndex = useCallback((fromIndex: number, translationY: number) => {
    'worklet';
    const heights = itemHeights.current;
    const avgHeight = heights.length > 0
      ? heights.reduce((a, b) => a + b, 0) / heights.length
      : ITEM_HEIGHT;

    const movement = Math.round(translationY / avgHeight);
    let targetIndex = fromIndex + movement;

    // 범위 제한
    targetIndex = Math.max(0, Math.min(data.length - 1, targetIndex));

    return targetIndex;
  }, [data.length]);

  const listContent = (
    <>
      {ListHeaderComponent}
      {data.length === 0 && ListEmptyComponent ? (
        ListEmptyComponent
      ) : (
        <View style={styles.listContainer}>
          {data.map((item, index) => (
            <DraggableItem
              key={keyExtractor(item)}
              item={item}
              index={index}
              renderItem={renderItem}
              draggedIndex={draggedIndex}
              dragY={dragY}
              currentIndex={currentIndex}
              totalItems={data.length}
              onLayout={handleItemLayout}
              isDragging={draggingIdx === index}
              onDragStart={(idx) => {
                draggedIndex.value = idx;
                currentIndex.value = idx;
                setIsDraggingAny(true);
                setDraggingIdx(idx);
              }}
              onDragUpdateXY={(translationX, translationY) => {
                dragX.value = translationX;
                dragY.value = translationY;
                const target = calculateTargetIndex(draggedIndex.value, translationY);
                currentIndex.value = target;
                runOnJS(handleDragMoveEvent)(draggedIndex.value, target, translationX, translationY);
              }}
              onDragEnd={() => {
                const from = draggedIndex.value;
                const to = currentIndex.value;
                const translationX = dragX.value;
                const translationY = dragY.value;
                draggedIndex.value = -1;
                dragX.value = 0;
                dragY.value = 0;
                currentIndex.value = -1;
                setIsDraggingAny(false);
                setDraggingIdx(-1);
                runOnJS(handleDragEndEvent)(from, to, translationX, translationY);
                runOnJS(handleReorderComplete)(from, to);
              }}
            />
          ))}
        </View>
      )}
      {ListFooterComponent}
    </>
  );

  if (!scrollEnabled) {
    return <View style={contentContainerStyle}>{listContent}</View>;
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      scrollEnabled={!isDraggingAny}
    >
      {listContent}
    </ScrollView>
  );
}

interface DraggableItemProps<T> {
  item: T;
  index: number;
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  draggedIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  currentIndex: SharedValue<number>;
  totalItems: number;
  onLayout: (index: number, height: number) => void;
  onDragStart: (index: number) => void;
  onDragUpdateXY: (translationX: number, translationY: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function DraggableItem<T>({
  item,
  index,
  renderItem,
  draggedIndex,
  dragY,
  currentIndex,
  totalItems,
  onLayout,
  onDragStart,
  onDragUpdateXY,
  onDragEnd,
  isDragging: isDraggingProp,
}: DraggableItemProps<T>) {
  const isActive = useSharedValue(false);
  const itemHeight = useSharedValue(ITEM_HEIGHT);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    itemHeight.value = height;
    onLayout(index, height);
  }, [index, onLayout, itemHeight]);

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      isActive.value = true;
      runOnJS(onDragStart)(index);
    });

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_, state) => {
      if (isActive.value) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .onUpdate((event) => {
      if (isActive.value) {
        runOnJS(onDragUpdateXY)(event.translationX, event.translationY);
      }
    })
    .onEnd(() => {
      if (isActive.value) {
        isActive.value = false;
        runOnJS(onDragEnd)();
      }
    })
    .onFinalize(() => {
      if (isActive.value) {
        isActive.value = false;
        runOnJS(onDragEnd)();
      }
    });

  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const isDragging = draggedIndex.value === index;

    if (isDragging) {
      // 드래그 중인 아이템
      return {
        transform: [
          { translateY: dragY.value },
          { scale: 1.02 },
        ],
        zIndex: 1000,
        elevation: 8,
      };
    }

    // 드래그 중이 아닌 아이템의 위치 조정
    if (draggedIndex.value >= 0) {
      const draggedFrom = draggedIndex.value;
      const draggedTo = currentIndex.value;

      // 드래그된 아이템이 위로 이동할 때 (draggedFrom > draggedTo)
      if (draggedFrom > draggedTo) {
        // 이 아이템이 draggedTo와 draggedFrom-1 사이에 있으면 아래로 이동
        if (index >= draggedTo && index < draggedFrom) {
          return {
            transform: [
              { translateY: withTiming(itemHeight.value, { duration: 200 }) },
              { scale: 1 },
            ],
            zIndex: 0,
          };
        }
      }
      // 드래그된 아이템이 아래로 이동할 때 (draggedFrom < draggedTo)
      else if (draggedFrom < draggedTo) {
        // 이 아이템이 draggedFrom+1과 draggedTo 사이에 있으면 위로 이동
        if (index > draggedFrom && index <= draggedTo) {
          return {
            transform: [
              { translateY: withTiming(-itemHeight.value, { duration: 200 }) },
              { scale: 1 },
            ],
            zIndex: 0,
          };
        }
      }
    }

    return {
      transform: [
        { translateY: withTiming(0, { duration: 200 }) },
        { scale: 1 },
      ],
      zIndex: 0,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        onLayout={handleLayout}
        style={[styles.itemContainer, animatedStyle]}
      >
        {renderItem(item, index, isDraggingProp)}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  listContainer: {
    position: 'relative',
  },
  itemContainer: {
    backgroundColor: 'transparent',
  },
});
