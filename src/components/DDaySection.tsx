import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Modal, Keyboard, Platform, Pressable, ScrollView, TouchableOpacity, Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Pencil, Plus, X, Trash2 } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { useDDays } from "@/hooks/useDDays";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import type { Affirmation } from "@/hooks/useAffirmation";

interface DDaySectionProps {
  affirmationText: string;
  affirmations: Affirmation[];
  onAddAffirmation: (text: string) => Promise<void | { demoBlocked?: boolean }>;
  onUpdateAffirmation: (id: string, text: string) => Promise<void | { demoBlocked?: boolean }>;
  onDeleteAffirmation: (id: string) => Promise<void | { demoBlocked?: boolean }>;
}

export function DDaySection({
  affirmationText,
  affirmations,
  onAddAffirmation,
  onUpdateAffirmation,
  onDeleteAffirmation,
}: DDaySectionProps) {
  const { ddays, canAddMore, isDemoMode, addDDay, updateDDay, deleteDDay, calculateDDay } = useDDays();
  const { checkDemoAndNudge } = useDemoNudge();

  // D-Day 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 통합 편집 모달 상태
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTab, setEditTab] = useState<'affirmation' | 'dday'>('affirmation');
  const [editingAffirmationId, setEditingAffirmationId] = useState<string | null>(null);
  const [editingAffirmationText, setEditingAffirmationText] = useState("");
  const [newAffirmationText, setNewAffirmationText] = useState("");
  const [showAddAffirmation, setShowAddAffirmation] = useState(false);

  // 통합 편집 모달 열기
  const handleOpenEditModal = () => {
    if (isDemoMode) {
      checkDemoAndNudge('확언 / D-Day를 수정');
      return;
    }
    setEditingAffirmationId(null);
    setEditingAffirmationText("");
    setNewAffirmationText("");
    setShowAddAffirmation(false);
    setEditTab('affirmation');
    setEditModalVisible(true);
  };

  // 확언 추가
  const handleAddAffirmation = async () => {
    if (newAffirmationText.trim()) {
      await onAddAffirmation(newAffirmationText.trim());
      setNewAffirmationText("");
      setShowAddAffirmation(false);
    }
  };

  // 확언 수정 시작
  const handleStartEditAffirmation = (id: string, text: string) => {
    setEditingAffirmationId(id);
    setEditingAffirmationText(text);
  };

  // 확언 수정 완료
  const handleSaveAffirmationEdit = async () => {
    if (editingAffirmationId && editingAffirmationText.trim()) {
      await onUpdateAffirmation(editingAffirmationId, editingAffirmationText.trim());
    }
    setEditingAffirmationId(null);
    setEditingAffirmationText("");
  };

  // 확언 수정 취소
  const handleCancelAffirmationEdit = () => {
    setEditingAffirmationId(null);
    setEditingAffirmationText("");
  };

  // 확언 삭제
  const handleDeleteAffirmation = (id: string) => {
    Alert.alert(
      "확언 삭제",
      "이 확언을 삭제할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => onDeleteAffirmation(id),
        },
      ]
    );
  };

  const handleOpenAddModal = () => {
    if (isDemoMode) {
      checkDemoAndNudge('D-Day를 추가');
      return;
    }
    setEditingId(null);
    setTitle("");
    setTargetDate(new Date());
    setModalVisible(true);
  };

  const handleOpenEditDDayModal = (id: string, ddayTitle: string, date: string) => {
    setEditingId(id);
    setTitle(ddayTitle);
    setTargetDate(new Date(date));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    Keyboard.dismiss();
    const dateStr = targetDate.toISOString().split('T')[0];

    if (editingId) {
      await updateDDay(editingId, title.trim(), dateStr);
    } else {
      await addDDay(title.trim(), dateStr);
    }
    setModalVisible(false);
  };

  const handleDelete = async () => {
    if (editingId) {
      await deleteDDay(editingId);
      setModalVisible(false);
    }
  };

  const formatDDay = (days: number) => {
    if (days === 0) return 'D-Day';
    if (days > 0) return `D-${days}`;
    return `D+${Math.abs(days)}`;
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 통합 편집 모달 렌더링
  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => { Keyboard.dismiss(); setEditModalVisible(false); }}
    >
      <GestureHandlerRootView style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>확언 / D-Day 수정</Text>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setEditModalVisible(false); }}>
              <X size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tab, editTab === 'affirmation' && styles.tabActive]}
              onPress={() => setEditTab('affirmation')}
            >
              <Text style={[styles.tabText, editTab === 'affirmation' && styles.tabTextActive]}>확언</Text>
              {editTab === 'affirmation' && <View style={styles.tabIndicator} />}
            </Pressable>
            <Pressable
              style={[styles.tab, editTab === 'dday' && styles.tabActive]}
              onPress={() => setEditTab('dday')}
            >
              <Text style={[styles.tabText, editTab === 'dday' && styles.tabTextActive]}>D-Day</Text>
              {editTab === 'dday' && <View style={styles.tabIndicator} />}
            </Pressable>
          </View>

          <ScrollView style={styles.editScrollView} showsVerticalScrollIndicator={false}>
            {editTab === 'affirmation' && (
            <View style={styles.editSection}>
              <View style={styles.affirmationList}>
                {affirmations.map((affirmation) => (
                  <View key={affirmation.id} style={styles.affirmationItem}>
                    {editingAffirmationId === affirmation.id ? (
                      <View style={styles.affirmationEditRow}>
                        <TextInput
                          style={styles.affirmationEditInput}
                          value={editingAffirmationText}
                          onChangeText={setEditingAffirmationText}
                          autoFocus
                          multiline
                        />
                        <View style={styles.affirmationEditActions}>
                          <TouchableOpacity onPress={handleCancelAffirmationEdit}>
                            <X size={20} color={Colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleSaveAffirmationEdit}>
                            <Text style={styles.saveText}>저장</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.affirmationContent}
                        onPress={() => handleStartEditAffirmation(affirmation.id, affirmation.text)}
                      >
                        <Text style={styles.affirmationText} numberOfLines={2}>
                          {affirmation.text}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          onPress={() => handleDeleteAffirmation(affirmation.id)}
                        >
                          <Trash2 size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </Pressable>
                    )}
                  </View>
                ))}

                {showAddAffirmation ? (
                  <View style={styles.addAffirmationInputContainer}>
                    <TextInput
                      style={styles.addAffirmationInput}
                      placeholder="새 확언을 입력하세요"
                      placeholderTextColor={Colors.textMuted}
                      value={newAffirmationText}
                      onChangeText={setNewAffirmationText}
                      autoFocus
                      multiline
                    />
                    <View style={styles.addAffirmationActions}>
                      <TouchableOpacity onPress={() => {
                        setShowAddAffirmation(false);
                        setNewAffirmationText("");
                      }}>
                        <X size={20} color={Colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleAddAffirmation}>
                        <Text style={styles.saveText}>추가</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addAffirmationButton}
                    onPress={() => setShowAddAffirmation(true)}
                  >
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={styles.addAffirmationText}>확언 추가</Text>
                  </Pressable>
                )}
              </View>
            </View>
            )}

            {editTab === 'dday' && (
            <View style={styles.editSection}>
              <View style={styles.ddayList}>
                {ddays.map((dday) => {
                  const days = calculateDDay(dday.target_date);
                  return (
                    <Pressable
                      key={dday.id}
                      style={styles.ddayEditItem}
                      onPress={() => {
                        setEditModalVisible(false);
                        handleOpenEditDDayModal(dday.id, dday.title, dday.target_date);
                      }}
                    >
                      <View style={styles.ddayEditInfo}>
                        <Text style={styles.ddayEditTitle}>{dday.title}</Text>
                        <Text style={styles.ddayEditDate}>{formatDate(new Date(dday.target_date))}</Text>
                      </View>
                      <Text style={days <= 7 && days >= 0 ? styles.ddayUrgent : styles.dday}>
                        {formatDDay(days)}
                      </Text>
                    </Pressable>
                  );
                })}
                {canAddMore && (
                  <Pressable
                    style={styles.addDDayButton}
                    onPress={() => {
                      setEditModalVisible(false);
                      handleOpenAddModal();
                    }}
                  >
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={styles.addDDayText}>D-Day 추가</Text>
                  </Pressable>
                )}
              </View>
            </View>
            )}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.editModalSaveButton, pressed && styles.buttonPressed]}
            onPress={() => { Keyboard.dismiss(); setEditModalVisible(false); }}
          >
            <Text style={styles.saveButtonText}>완료</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <GestureHandlerRootView style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{editingId ? 'D-Day 수정' : 'D-Day 추가'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>제목</Text>
              <TextInput
                style={styles.input}
                placeholder="D-Day 제목"
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>날짜</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(targetDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setTargetDate(date);
              }}
            />
          )}

          <View style={styles.actions}>
            {editingId && (
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
                onPress={handleDelete}
              >
                <Trash2 size={20} color={Colors.error} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                !editingId && styles.saveButtonFull,
                pressed && styles.buttonPressed
              ]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>저장</Text>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );

  if (ddays.length === 0) {
    return (
      <>
        <View style={styles.rowContainer}>
          <Pressable style={styles.emptyContainer} onPress={handleOpenAddModal}>
            <Plus size={14} color={Colors.textMuted} />
            <Text style={styles.emptyText}>D-Day 추가</Text>
          </Pressable>
          <Pressable style={styles.editButton} onPress={handleOpenEditModal}>
            <Pencil size={14} color={Colors.textMuted} />
          </Pressable>
        </View>
        {renderModal()}
        {renderEditModal()}
      </>
    );
  }

  return (
    <>
      <View style={styles.rowContainer}>
        <View style={styles.container}>
          {ddays.map((dday, index) => {
            const days = calculateDDay(dday.target_date);
            const isUrgent = days <= 7 && days >= 0;

            return (
              <View key={dday.id} style={styles.itemWrapper}>
                {index > 0 && <Text style={styles.separator}>·</Text>}
                <Pressable
                  style={styles.item}
                  onPress={() => handleOpenEditDDayModal(dday.id, dday.title, dday.target_date)}
                >
                  <Text style={styles.label}>{dday.title}</Text>
                  <Text style={isUrgent ? styles.ddayUrgent : styles.dday}>
                    {formatDDay(days)}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          {canAddMore && (
            <Pressable style={styles.addButton} onPress={handleOpenAddModal}>
              <Plus size={14} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
          <Pressable style={styles.editButton} onPress={handleOpenEditModal}>
            <Pencil size={14} color={Colors.textMuted} />
          </Pressable>
      </View>
      {renderModal()}
      {renderEditModal()}
    </>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  editButton: {
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  dday: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ddayUrgent: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.accent,
  },
  separator: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  addButton: {
    padding: Spacing.xl,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    padding: Spacing['4xl'],
    gap: Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  form: {
    gap: Spacing['2xl'],
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  dateButton: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
  },
  dateText: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  deleteButton: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  saveButtonFull: {
    flex: 1,
  },
  saveButtonText: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textOnDark,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  editModalSaveButton: {
    backgroundColor: Colors.accent,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 탭 바 스타일
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: FontSizes.base,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
  },
  // 통합 편집 모달 스타일
  editScrollView: {
    maxHeight: 400,
  },
  editSection: {
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  // 확언 목록 스타일
  affirmationList: {
    gap: Spacing.md,
  },
  affirmationItem: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  affirmationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing['2xl'],
  },
  affirmationText: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginRight: Spacing.md,
  },
  deleteIconButton: {
    padding: Spacing.md,
  },
  affirmationEditRow: {
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  affirmationEditInput: {
    backgroundColor: Colors.bgPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    minHeight: 60,
  },
  affirmationEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  saveText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  addAffirmationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    borderStyle: 'dashed',
    padding: Spacing['2xl'],
  },
  addAffirmationText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  addAffirmationInputContainer: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  addAffirmationInput: {
    backgroundColor: Colors.bgPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    minHeight: 60,
  },
  addAffirmationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  // D-Day 목록 스타일
  ddayList: {
    gap: Spacing.md,
  },
  ddayEditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
  },
  ddayEditInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  ddayEditTitle: {
    fontSize: FontSizes.base,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  ddayEditDate: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  addDDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    borderStyle: 'dashed',
    padding: Spacing['2xl'],
  },
  addDDayText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
});
