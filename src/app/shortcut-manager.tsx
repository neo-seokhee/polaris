import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, ChevronRight, Menu } from "lucide-react-native";
import { Colors, Spacing, FontSizes, BorderRadius } from "@/constants/theme";
import { useFeatureModules } from "@/contexts/FeatureModulesContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { FEATURE_MODULE_MAP } from "@/modules/featureModules";
import { MODULE_CATALOG } from "@/modules/moduleCatalog";
import type { ShortcutSlot } from "@/modules/types";
import { WindroseIcon } from "@/components/icons/WindroseIcon";

const SLOT_LABEL: Record<ShortcutSlot, string> = {
  slot1: "바로가기 1",
  slot2: "바로가기 2",
  slot4: "바로가기 4",
};

type DisplayRow =
  | { key: "slot1" | "slot2" | "slot4"; type: "editable"; slot: ShortcutSlot }
  | { key: "slot3-fixed" | "slot5-fixed"; type: "fixed"; label: string; title: string; icon: "compass" | "more" };

const DISPLAY_ROWS: DisplayRow[] = [
  { key: "slot1", type: "editable", slot: "slot1" },
  { key: "slot2", type: "editable", slot: "slot2" },
  { key: "slot3-fixed", type: "fixed", label: "바로가기 3", title: "컴파스", icon: "compass" },
  { key: "slot4", type: "editable", slot: "slot4" },
  { key: "slot5-fixed", type: "fixed", label: "바로가기 5", title: "더보기", icon: "more" },
];

export default function ShortcutManagerScreen() {
  const { shortcuts, setShortcut } = useFeatureModules();
  const { track } = useAnalytics();
  useScreenTracking("screen_shortcut_manager");
  const [pickerSlot, setPickerSlot] = useState<ShortcutSlot | null>(null);

  const selectableOptions = useMemo(() => {
    return MODULE_CATALOG
      .filter((item) => item.status === "available" && !!item.moduleId)
      .map((item) => FEATURE_MODULE_MAP[item.moduleId!])
      .filter(Boolean);
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>바로가기 관리</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionDescription}>
          하단 탭 1, 2, 4 위치는 선택할 수 있고, 3(컴파스)·5(더보기)는 고정입니다.
        </Text>
        <View style={styles.card}>
          {DISPLAY_ROWS.map((row, index) => {
            const isLast = index === DISPLAY_ROWS.length - 1;

            if (row.type === "editable") {
              const module = FEATURE_MODULE_MAP[shortcuts[row.slot]];
              const Icon = module.icon;
              return (
                <View key={row.key} style={[styles.shortcutRow, !isLast && styles.rowDivider]}>
                  <View style={styles.shortcutMeta}>
                    <Text style={styles.slotLabel}>{SLOT_LABEL[row.slot]}</Text>
                    <View style={styles.shortcutModule}>
                      <Icon color={Colors.accent} size={15} />
                      <Text style={styles.shortcutModuleText}>{module.title}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.changeButton} onPress={() => setPickerSlot(row.slot)}>
                    <Text style={styles.changeButtonText}>목록에서 선택</Text>
                    <ChevronRight size={14} color={Colors.textMuted} />
                  </Pressable>
                </View>
              );
            }

            return (
              <View key={row.key} style={[styles.shortcutRow, !isLast && styles.rowDivider]}>
                <View style={styles.shortcutMeta}>
                  <Text style={styles.slotLabel}>{row.label}</Text>
                  <View style={styles.shortcutModule}>
                    {row.icon === "compass" ? (
                      <WindroseIcon color={Colors.textSecondary} size={15} />
                    ) : (
                      <Menu color={Colors.textSecondary} size={15} />
                    )}
                    <Text style={styles.shortcutModuleText}>{row.title}</Text>
                  </View>
                </View>
                <View style={[styles.changeButton, styles.changeButtonDisabled]}>
                  <Text style={[styles.changeButtonText, styles.changeButtonTextDisabled]}>고정</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <Modal visible={!!pickerSlot} transparent animationType="fade" onRequestClose={() => setPickerSlot(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>바로가기 모듈 선택</Text>
            <Text style={styles.modalDescription}>
              {pickerSlot ? `${SLOT_LABEL[pickerSlot]}에 배치할 모듈을 선택하세요.` : ""}
            </Text>
            <View style={styles.modalList}>
              {selectableOptions.map((module) => {
                const Icon = module.icon;
                const selected = pickerSlot ? shortcuts[pickerSlot] === module.id : false;
                return (
                  <Pressable
                    key={module.id}
                    style={[
                      styles.modalItem,
                      selected && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      if (!pickerSlot) {
                        showAlert("오류", "선택할 슬롯이 없습니다.");
                        return;
                      }
                      setShortcut(pickerSlot, module.id);
                      track("shortcut_selected_from_manager", { slot: pickerSlot, module_id: module.id });
                      setPickerSlot(null);
                    }}
                  >
                    <Icon color={selected ? Colors.accent : Colors.textPrimary} size={16} />
                    <View style={styles.modalItemMeta}>
                      <Text
                        style={[
                          styles.modalItemText,
                          selected && styles.modalItemTextSelected,
                        ]}
                      >
                        {module.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.modalCloseButton} onPress={() => setPickerSlot(null)}>
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  headerPlaceholder: {
    width: 28,
  },
  content: {
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["3xl"],
    gap: Spacing.md,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    overflow: "hidden",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
  },
  shortcutRow: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  shortcutMeta: {
    gap: Spacing.sm,
    flex: 1,
  },
  slotLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  shortcutModule: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shortcutModuleText: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgCard,
  },
  changeButtonDisabled: {
    backgroundColor: Colors.bgTertiary,
    borderColor: Colors.borderPrimary,
  },
  changeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  changeButtonTextDisabled: {
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing["3xl"],
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes["2xl"],
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  modalDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  modalList: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
  },
  modalItemSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  modalItemMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  modalItemText: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  modalItemTextSelected: {
    color: Colors.accent,
    fontWeight: "600",
  },
  modalCloseButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgCard,
  },
  modalCloseButtonText: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
