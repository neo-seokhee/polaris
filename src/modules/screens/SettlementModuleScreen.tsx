import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart3, Calendar, Check, ChevronLeft, ChevronRight, ChevronsUpDown, ListChecks, Plus, Trash2, X } from "lucide-react-native";
import { BorderRadius, Colors, FontSizes, Spacing } from "@/constants/theme";
import { StatusBanners } from "@/components/StatusBanners";
import { FeatureModuleHeader } from "@/components/FeatureModuleHeader";
import { useWebLayout } from "@/contexts/WebLayoutContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useSettlementJobs, type SettlementJob, type SettlementJobType, type SettlementStatus } from "@/hooks/useSettlementJobs";
import {
  formatKRW,
  formatMonthLabel,
  getMonthRange,
  isISODateInRange,
} from "@/lib/settlement";

const STATUS_SECTIONS: Array<{ key: SettlementStatus; title: string }> = [
  { key: "before_work", title: "작업 전" },
  { key: "in_progress", title: "작업 중" },
  { key: "work_done", title: "납품 완료" },
  { key: "paid", title: "입금 완료" },
];

const STATUS_THEME: Record<SettlementStatus, { bg: string; border: string; text: string }> = {
  before_work: { bg: "#3B82F620", border: "#3B82F6", text: "#93C5FD" },
  in_progress: { bg: "#F59E0B20", border: "#F59E0B", text: "#FCD34D" },
  work_done: { bg: "#A855F720", border: "#A855F7", text: "#D8B4FE" },
  paid: { bg: "#22C55E20", border: "#22C55E", text: "#86EFAC" },
};

const CALENDAR_STAGE_THEME = {
  shoot: { label: "촬영", bg: "#3B82F620", text: "#93C5FD" },
  edit: { label: "편집", bg: "#F59E0B20", text: "#FCD34D" },
  delivery: { label: "납품", bg: "#A855F720", text: "#D8B4FE" },
  paid: { label: "입금 완료", bg: "#22C55E20", text: "#86EFAC" },
} as const;

const WORKFLOW_STEPS = [
  { key: "shoot_done", label: "촬영" },
  { key: "edit_done", label: "편집" },
] as const;

const JOB_TYPE_OPTIONS: Array<{ key: SettlementJobType; label: string }> = [
  { key: "shoot_only", label: "촬영만" },
  { key: "edit_only", label: "편집만" },
  { key: "shoot_edit", label: "촬영 + 편집" },
];

type WorkflowStepKey = typeof WORKFLOW_STEPS[number]["key"];

interface SettlementCardProps {
  job: SettlementJob;
  isOverdue: boolean;
  isCarryOver: boolean;
  sectionKey: SettlementStatus;
  onToggleWorkflowStep: (job: SettlementJob, step: WorkflowStepKey) => void;
  onMarkPaid: (job: SettlementJob) => void;
  onPress: (job: SettlementJob) => void;
}

function SettlementCard({
  job,
  isOverdue,
  isCarryOver,
  sectionKey,
  onToggleWorkflowStep,
  onMarkPaid,
  onPress,
}: SettlementCardProps) {
  const dueLabel = job.payment_due_date ? `${job.payment_due_date}까지` : "입금 예정일 미지정";

  return (
    <Pressable style={[styles.jobCard, isOverdue && styles.jobCardOverdue]} onPress={() => onPress(job)}>
      <View style={styles.jobCardHeader}>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {job.title}
        </Text>
        <ChevronsUpDown size={16} color={Colors.textMuted} />
      </View>

      {!!job.client && <Text style={styles.clientText}>{job.client}</Text>}

      <Text style={styles.priceText}>{formatKRW(job.unit_price)}</Text>

      <View style={styles.dateMeta}>
        <Text style={styles.dateLine}>촬영 {job.work_date || "-"}</Text>
        <Text style={styles.dateLine}>편집 {job.edit_date || "-"}</Text>
        <Text style={styles.dateLine}>납품 {job.delivery_date || "-"}</Text>
        {sectionKey === "paid" ? (
          <Text style={styles.dateLine}>입금완료 {job.paid_at || "-"}</Text>
        ) : (
          <Text style={styles.dateLine}>입금예정 {job.payment_due_date || "-"}</Text>
        )}
      </View>

      {sectionKey === "in_progress" && (
        <View style={styles.workflowChecklistRow}>
          {WORKFLOW_STEPS.filter((step) => {
            if (step.key === "shoot_done") return job.job_type !== "edit_only";
            if (step.key === "edit_done") return job.job_type !== "shoot_only";
            return true;
          }).map((step) => {
            const checked = Boolean(job[step.key]);
            return (
              <Pressable
                key={step.key}
                style={[styles.workflowChecklistItem, checked && styles.workflowChecklistItemChecked]}
                onPress={(event) => {
                  event.stopPropagation?.();
                  onToggleWorkflowStep(job, step.key);
                }}
              >
                <View style={[styles.workflowCheckbox, checked && styles.workflowCheckboxChecked]}>
                  {checked ? <Check size={10} color={Colors.textOnDark} strokeWidth={2.8} /> : null}
                </View>
                <Text style={[styles.workflowChecklistText, checked && styles.workflowChecklistTextChecked]}>
                  {step.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {sectionKey === "work_done" && (
        <View style={styles.paymentPendingWrap}>
          <View style={styles.paymentPendingRow}>
            <Text style={styles.paymentPendingText}>
              정산 대기 · {formatKRW(job.unit_price)} · {dueLabel}
            </Text>
            <Pressable
              style={styles.paymentDoneButton}
              onPress={(event) => {
                event.stopPropagation?.();
                onMarkPaid(job);
              }}
            >
              <Text style={styles.paymentDoneButtonText}>입금 완료</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.badgeRow}>
        {isCarryOver && <Text style={styles.carryBadge}>이월</Text>}
        {isOverdue && <Text style={styles.overdueBadge}>미수</Text>}
      </View>
    </Pressable>
  );
}

function showAlert(titleText: string, message: string) {
  if (Platform.OS === "web") {
    globalThis.alert?.(`${titleText}\n${message}`);
    return;
  }
  Alert.alert(titleText, message);
}

type DateFieldKey = "workDate" | "editDate" | "paymentDueDate" | "paidAtDate";
type DateTarget = "add" | "edit";
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISODate(dateISO: string): Date {
  const parsed = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getEnabledWorkflowByJobType(jobType: SettlementJobType) {
  return {
    shoot: jobType !== "edit_only",
    edit: jobType !== "shoot_only",
  };
}

function sanitizeWorkflowForJobType(
  jobType: SettlementJobType,
  values: { shootDone: boolean; editDone: boolean; deliveryDone?: boolean }
) {
  const enabled = getEnabledWorkflowByJobType(jobType);
  return {
    shootDone: enabled.shoot ? values.shootDone : false,
    editDone: enabled.edit ? values.editDone : false,
    deliveryDone: Boolean(values.deliveryDone),
  };
}

function deriveStatusFromWorkflow(params: {
  jobType: SettlementJobType;
  shootDone: boolean;
  editDone: boolean;
  deliveryDone?: boolean;
  isPaid?: boolean;
}): SettlementStatus {
  const normalized = sanitizeWorkflowForJobType(params.jobType, {
    shootDone: params.shootDone,
    editDone: params.editDone,
    deliveryDone: params.deliveryDone,
  });
  const enabled = getEnabledWorkflowByJobType(params.jobType);
  if (params.isPaid) return "paid";
  const requiredShootDone = enabled.shoot ? normalized.shootDone : true;
  const requiredEditDone = enabled.edit ? normalized.editDone : true;

  if (requiredShootDone && requiredEditDone) return "work_done";
  if (normalized.shootDone || normalized.editDone) return "in_progress";
  return "before_work";
}

function resolveDeliveryDateFromWorkflow(params: {
  jobType: SettlementJobType;
  shootDate: string | null;
  editDate: string | null;
}): string | null {
  const enabled = getEnabledWorkflowByJobType(params.jobType);
  if (enabled.edit && params.editDate) return params.editDate;
  if (enabled.shoot && params.shootDate) return params.shootDate;
  return params.editDate || params.shootDate || null;
}

function parseUnitPriceInput(value: string): number {
  const normalized = value.replace(/[^\d]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function formatUnitPriceInput(value: string): string {
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return "";
  return Number(normalized).toLocaleString("ko-KR");
}

export function SettlementModuleScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = useMemo(() => {
    if (!isWeb) return false;
    if (typeof navigator === "undefined") return width >= 1024;
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return !isMobileUA && width >= 1024;
  }, [isWeb, width]);

  const { jobs, loading, addJob, updateJob, deleteJob } = useSettlementJobs();
  const { track } = useAnalytics();
  const { setSettlementCalendarWide } = useWebLayout();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [yearlyChartVisible, setYearlyChartVisible] = useState(false);
  const [isCalendarView, setIsCalendarView] = useState(false);
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [jobType, setJobType] = useState<SettlementJobType>("shoot_edit");
  const [workDate, setWorkDate] = useState("");
  const [editDate, setEditDate] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paidAtDate, setPaidAtDate] = useState("");
  const [shootDone, setShootDone] = useState(false);
  const [editDone, setEditDone] = useState(false);
  const [addStatus, setAddStatus] = useState<SettlementStatus>("before_work");
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null);
  const [activeDateTarget, setActiveDateTarget] = useState<DateTarget>("add");
  const [pickerDate, setPickerDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editIsFree, setEditIsFree] = useState(false);
  const [editJobType, setEditJobType] = useState<SettlementJobType>("shoot_edit");
  const [editWorkDate, setEditWorkDate] = useState("");
  const [editEditDate, setEditEditDate] = useState("");
  const [editPaymentDueDate, setEditPaymentDueDate] = useState("");
  const [editPaidAtDate, setEditPaidAtDate] = useState("");
  const [editShootDone, setEditShootDone] = useState(false);
  const [editEditDone, setEditEditDone] = useState(false);
  const [editStatus, setEditStatus] = useState<SettlementStatus>("before_work");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const addWorkflowEnabled = useMemo(() => getEnabledWorkflowByJobType(jobType), [jobType]);
  const editWorkflowEnabled = useMemo(() => getEnabledWorkflowByJobType(editJobType), [editJobType]);

  const { start, end, startISO } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const todayISO = new Date().toISOString().slice(0, 10);

  const carryOverSet = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((job) => {
      if (!job.is_paid && job.payment_due_date && job.payment_due_date < startISO && job.status !== "paid") {
        set.add(job.id);
      }
    });
    return set;
  }, [jobs, startISO]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (carryOverSet.has(job.id)) return true;
      if (!job.work_date && !job.edit_date && !job.delivery_date && !job.payment_due_date && !job.paid_at) {
        return true;
      }
      return (
        isISODateInRange(job.work_date, start, end) ||
        isISODateInRange(job.edit_date, start, end) ||
        isISODateInRange(job.delivery_date, start, end) ||
        isISODateInRange(job.payment_due_date, start, end) ||
        isISODateInRange(job.paid_at, start, end)
      );
    });
  }, [jobs, carryOverSet, start, end]);

  const jobsByStatus = useMemo(() => {
    const grouped: Record<SettlementStatus, SettlementJob[]> = {
      before_work: [],
      in_progress: [],
      work_done: [],
      paid: [],
    };

    filteredJobs.forEach((job) => {
      grouped[job.status].push(job);
    });

    grouped.before_work.sort((a, b) => (a.work_date || "").localeCompare(b.work_date || ""));
    grouped.in_progress.sort((a, b) => (a.work_date || "").localeCompare(b.work_date || ""));
    grouped.work_done.sort((a, b) => {
      const carryA = carryOverSet.has(a.id) ? 0 : 1;
      const carryB = carryOverSet.has(b.id) ? 0 : 1;
      if (carryA !== carryB) return carryA - carryB;
      return (a.payment_due_date || "").localeCompare(b.payment_due_date || "");
    });
    grouped.paid.sort((a, b) => (b.paid_at || "").localeCompare(a.paid_at || ""));

    return grouped;
  }, [filteredJobs, carryOverSet]);

  const expectedRevenue = useMemo(() => {
    return jobs
      .filter((job) => ["work_done", "paid"].includes(job.status))
      .filter((job) => isISODateInRange(job.delivery_date, start, end))
      .reduce((sum, job) => sum + job.unit_price, 0);
  }, [jobs, start, end]);

  const actualReceived = useMemo(() => {
    return jobs
      .filter((job) => job.is_paid)
      .filter((job) => isISODateInRange(job.paid_at, start, end))
      .reduce((sum, job) => sum + job.unit_price, 0);
  }, [jobs, start, end]);

  const unpaidAmount = useMemo(() => {
    return jobs
      .filter((job) => !job.is_paid)
      .filter((job) => isISODateInRange(job.payment_due_date, start, end))
      .reduce((sum, job) => sum + job.unit_price, 0);
  }, [jobs, start, end]);

  const selectedYear = useMemo(() => selectedMonth.getFullYear(), [selectedMonth]);

  const yearlyRevenueByMonth = useMemo(() => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: 0,
      count: 0,
    }));

    jobs.forEach((job) => {
      if (!job.delivery_date) return;
      const deliveryDate = fromISODate(job.delivery_date);
      if (deliveryDate.getFullYear() !== selectedYear) return;
      const monthIndex = deliveryDate.getMonth();
      monthly[monthIndex].amount += job.unit_price || 0;
      monthly[monthIndex].count += 1;
    });

    return monthly;
  }, [jobs, selectedYear]);

  const yearlyActualByMonth = useMemo(() => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: 0,
    }));

    jobs.forEach((job) => {
      if (!job.is_paid || !job.paid_at) return;
      const paidDate = fromISODate(job.paid_at);
      if (paidDate.getFullYear() !== selectedYear) return;
      const monthIndex = paidDate.getMonth();
      monthly[monthIndex].amount += job.unit_price || 0;
    });

    return monthly;
  }, [jobs, selectedYear]);

  const maxYearlyChartValue = useMemo(() => {
    return yearlyRevenueByMonth.reduce((max, row, index) => {
      const actual = yearlyActualByMonth[index]?.amount ?? 0;
      return Math.max(max, row.amount, actual);
    }, 0);
  }, [yearlyRevenueByMonth, yearlyActualByMonth]);

  const yearlyRevenueTotal = useMemo(() => {
    return yearlyRevenueByMonth.reduce((sum, row) => sum + row.amount, 0);
  }, [yearlyRevenueByMonth]);

  const yearlyActualTotal = useMemo(() => {
    return yearlyActualByMonth.reduce((sum, row) => sum + row.amount, 0);
  }, [yearlyActualByMonth]);

  const calendarViewTitle = useMemo(() => {
    return `${selectedMonth.getFullYear()}년 ${selectedMonth.getMonth() + 1}월 일정`;
  }, [selectedMonth]);

  const calendarEventsByDate = useMemo(() => {
    const grouped = new Map<string, Array<{
      id: string;
      title: string;
      stage: keyof typeof CALENDAR_STAGE_THEME;
      completed: boolean;
      status: SettlementStatus;
      job: SettlementJob;
    }>>();

    const pushEvent = (
      dateISO: string | null,
      event: {
        id: string;
        title: string;
        stage: keyof typeof CALENDAR_STAGE_THEME;
        completed: boolean;
        status: SettlementStatus;
        job: SettlementJob;
      }
    ) => {
      if (!isISODateInRange(dateISO, start, end) || !dateISO) return;
      const existing = grouped.get(dateISO) || [];
      existing.push(event);
      grouped.set(dateISO, existing);
    };

    jobs.forEach((job) => {
      const enabled = getEnabledWorkflowByJobType(job.job_type);
      if (enabled.shoot) {
        pushEvent(job.work_date, {
          id: `${job.id}-shoot`,
          title: job.title,
          stage: "shoot",
          completed: Boolean(job.shoot_done),
          status: job.status,
          job,
        });
      }
      if (enabled.edit) {
        pushEvent(job.edit_date, {
          id: `${job.id}-edit`,
          title: job.title,
          stage: "edit",
          completed: Boolean(job.edit_done),
          status: job.status,
          job,
        });
      }
      pushEvent(job.paid_at, {
        id: `${job.id}-paid`,
        title: job.title,
        stage: "paid",
        completed: Boolean(job.is_paid),
        status: job.status,
        job,
      });
    });

    grouped.forEach((events) => {
      events.sort((a, b) => `${a.title}-${a.stage}`.localeCompare(`${b.title}-${b.stage}`));
    });

    return grouped;
  }, [jobs, start, end]);

  const monthCalendarCells = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];

    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [selectedMonth]);

  const monthCalendarRows = useMemo(() => {
    const rows: Array<Array<Date | null>> = [];
    for (let index = 0; index < monthCalendarCells.length; index += 7) {
      rows.push(monthCalendarCells.slice(index, index + 7));
    }
    return rows;
  }, [monthCalendarCells]);

  const isMobileLayout = !isDesktopWeb;
  const shouldRenderCalendar = isCalendarView;
  const shouldRenderDesktopCalendar = shouldRenderCalendar && isDesktopWeb;
  const shouldRenderMobileCalendar = shouldRenderCalendar && isMobileLayout;

  const handleToggleCalendarView = useCallback(() => {
    setIsCalendarView((prev) => {
      const next = !prev;
      track("settlement_calendar_view_toggled", { is_calendar_view: next });
      return next;
    });
  }, [track]);

  const handlePrevMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      track("settlement_month_changed", { direction: "prev", year: next.getFullYear(), month: next.getMonth() + 1 });
      return next;
    });
  }, [track]);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      track("settlement_month_changed", { direction: "next", year: next.getFullYear(), month: next.getMonth() + 1 });
      return next;
    });
  }, [track]);

  const openYearlyChart = useCallback(() => {
    track("settlement_yearly_chart_opened");
    setYearlyChartVisible(true);
  }, [track]);

  const closeYearlyChart = useCallback(() => {
    track("settlement_yearly_chart_closed");
    setYearlyChartVisible(false);
  }, [track]);

  useEffect(() => {
    setSettlementCalendarWide(shouldRenderDesktopCalendar);
    return () => setSettlementCalendarWide(false);
  }, [shouldRenderDesktopCalendar, setSettlementCalendarWide]);

  useEffect(() => {
    if (!shouldRenderMobileCalendar) return;
    if (selectedCalendarDateKey) {
      const selectedDate = fromISODate(selectedCalendarDateKey);
      if (
        selectedDate.getFullYear() === selectedMonth.getFullYear() &&
        selectedDate.getMonth() === selectedMonth.getMonth()
      ) {
        return;
      }
    }

    const today = new Date();
    const fallbackDate =
      today.getFullYear() === selectedMonth.getFullYear() &&
      today.getMonth() === selectedMonth.getMonth()
        ? today
        : new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    setSelectedCalendarDateKey(toISODate(fallbackDate));
  }, [shouldRenderMobileCalendar, selectedCalendarDateKey, selectedMonth]);

  const selectedCalendarDayEvents = useMemo(() => {
    if (!selectedCalendarDateKey) return [];
    return calendarEventsByDate.get(selectedCalendarDateKey) || [];
  }, [calendarEventsByDate, selectedCalendarDateKey]);

  const priceSuggestion = useMemo(() => {
    const trimmedClient = client.trim();
    if (!trimmedClient) return null;
    const match = jobs
      .filter((job) => (job.client || "").trim() === trimmedClient)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return match?.unit_price ?? null;
  }, [jobs, client]);

  const openDetailModal = useCallback(() => {
    setTitle("");
    setClient("");
    setUnitPrice("");
    setIsFree(false);
    setJobType("shoot_edit");
    setWorkDate("");
    setEditDate("");
    setPaymentDueDate("");
    setPaidAtDate("");
    setShootDone(false);
    setEditDone(false);
    setAddStatus("before_work");
    setDetailModalVisible(true);
    track("settlement_add_modal_opened");
  }, [track]);

  const handleAddJobTypeChange = useCallback((nextType: SettlementJobType) => {
    setJobType(nextType);
    const sanitized = sanitizeWorkflowForJobType(nextType, {
      shootDone,
      editDone,
    });
    setShootDone(sanitized.shootDone);
    setEditDone(sanitized.editDone);

    if (nextType === "shoot_only") {
      setEditDate("");
    } else if (nextType === "edit_only") {
      setWorkDate("");
    }

    const nextStatus = deriveStatusFromWorkflow({
      jobType: nextType,
      shootDone: sanitized.shootDone,
      editDone: sanitized.editDone,
      isPaid: addStatus === "paid",
    });
    setAddStatus(nextStatus);
    if (nextStatus !== "paid") {
      setPaidAtDate("");
    }
  }, [shootDone, editDone, addStatus]);

  const handleAddQuickStatusUpdate = useCallback((nextStatus: SettlementStatus) => {
    let nextShoot = shootDone;
    let nextEdit = editDone;
    const enabled = getEnabledWorkflowByJobType(jobType);

    if (nextStatus === "before_work") {
      nextShoot = false;
      nextEdit = false;
    } else if (nextStatus === "in_progress") {
      const current = sanitizeWorkflowForJobType(jobType, {
        shootDone: nextShoot,
        editDone: nextEdit,
      });
      nextShoot = current.shootDone;
      nextEdit = current.editDone;
      if (!nextShoot && !nextEdit) {
        if (enabled.shoot) {
          nextShoot = true;
        } else if (enabled.edit) {
          nextEdit = true;
        }
      }
    } else if (nextStatus === "work_done" || nextStatus === "paid") {
      nextShoot = enabled.shoot;
      nextEdit = enabled.edit;
    }

    const normalized = sanitizeWorkflowForJobType(jobType, {
      shootDone: nextShoot,
      editDone: nextEdit,
    });
    setShootDone(normalized.shootDone);
    setEditDone(normalized.editDone);
    setAddStatus(nextStatus);
    if (nextStatus === "paid") {
      setPaidAtDate((prev) => prev || todayISO);
    } else {
      setPaidAtDate("");
    }
  }, [shootDone, editDone, jobType, todayISO]);

  const handleAddWorkflowToggle = useCallback((step: WorkflowStepKey) => {
    if (step === "shoot_done" && !addWorkflowEnabled.shoot) return;
    if (step === "edit_done" && !addWorkflowEnabled.edit) return;

    const nextShoot = step === "shoot_done" ? !shootDone : shootDone;
    const nextEdit = step === "edit_done" ? !editDone : editDone;
    const normalized = sanitizeWorkflowForJobType(jobType, {
      shootDone: nextShoot,
      editDone: nextEdit,
    });
    const nextStatus = deriveStatusFromWorkflow({
      jobType,
      shootDone: normalized.shootDone,
      editDone: normalized.editDone,
      isPaid: false,
    });
    setShootDone(normalized.shootDone);
    setEditDone(normalized.editDone);
    setAddStatus(nextStatus);
    if (nextStatus !== "paid") {
      setPaidAtDate("");
    }
  }, [addWorkflowEnabled.shoot, addWorkflowEnabled.edit, shootDone, editDone, jobType]);

  const handleEditJobTypeChange = useCallback((nextType: SettlementJobType) => {
    setEditJobType(nextType);

    const sanitized = sanitizeWorkflowForJobType(nextType, {
      shootDone: editShootDone,
      editDone: editEditDone,
    });
    setEditShootDone(sanitized.shootDone);
    setEditEditDone(sanitized.editDone);

    if (nextType === "shoot_only") {
      setEditEditDate("");
    } else if (nextType === "edit_only") {
      setEditWorkDate("");
    }

    const nextStatus = deriveStatusFromWorkflow({
      jobType: nextType,
      shootDone: sanitized.shootDone,
      editDone: sanitized.editDone,
      isPaid: editStatus === "paid",
    });
    setEditStatus(nextStatus);
    if (nextStatus !== "paid") {
      setEditPaidAtDate("");
    }
  }, [editShootDone, editEditDone, editStatus]);

  const getDateFieldValue = useCallback((target: DateTarget, field: DateFieldKey) => {
    if (target === "add") {
      if (field === "workDate") return workDate;
      if (field === "editDate") return editDate;
      if (field === "paidAtDate") return paidAtDate;
      return paymentDueDate;
    }
    if (field === "workDate") return editWorkDate;
    if (field === "editDate") return editEditDate;
    if (field === "paidAtDate") return editPaidAtDate;
    return editPaymentDueDate;
  }, [workDate, editDate, paymentDueDate, paidAtDate, editWorkDate, editEditDate, editPaymentDueDate, editPaidAtDate]);

  const setDateFieldValue = useCallback((target: DateTarget, field: DateFieldKey, value: string) => {
    if (target === "add") {
      if (field === "workDate") setWorkDate(value);
      if (field === "editDate") setEditDate(value);
      if (field === "paymentDueDate") setPaymentDueDate(value);
      if (field === "paidAtDate") setPaidAtDate(value);
      return;
    }
    if (field === "workDate") setEditWorkDate(value);
    if (field === "editDate") setEditEditDate(value);
    if (field === "paymentDueDate") setEditPaymentDueDate(value);
    if (field === "paidAtDate") setEditPaidAtDate(value);
  }, []);

  const openDatePicker = useCallback((target: DateTarget, field: DateFieldKey) => {
    const value = getDateFieldValue(target, field);
    if (Platform.OS === "web") {
      const baseDate = value ? fromISODate(value) : new Date();
      setCalendarMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
      setActiveDateTarget(target);
      setActiveDateField(field);
      setCalendarVisible(true);
      return;
    }

    setPickerDate(value ? fromISODate(value) : new Date());
    setActiveDateTarget(target);
    setActiveDateField(field);
  }, [getDateFieldValue]);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed" || !selectedDate || !activeDateField) {
      setActiveDateField(null);
      return;
    }

    const nextValue = toISODate(selectedDate);
    setDateFieldValue(activeDateTarget, activeDateField, nextValue);

    setActiveDateField(null);
  }, [activeDateField, activeDateTarget, setDateFieldValue]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];

    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [calendarMonth]);

  const selectedDateForField = useMemo(() => {
    if (!activeDateField) return null;
    const value = getDateFieldValue(activeDateTarget, activeDateField);
    if (!value) return null;
    return fromISODate(value);
  }, [activeDateField, activeDateTarget, getDateFieldValue]);

  const calendarMonthLabel = useMemo(() => {
    return `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
  }, [calendarMonth]);

  const handleWebCalendarPick = useCallback((date: Date) => {
    if (!activeDateField) return;
    const nextValue = toISODate(date);
    setDateFieldValue(activeDateTarget, activeDateField, nextValue);
    setCalendarVisible(false);
    setActiveDateField(null);
  }, [activeDateField, activeDateTarget, setDateFieldValue]);

  const handleAddUnitIncrement = useCallback((amount: number) => {
    setIsFree(false);
    setUnitPrice((prev) => {
      const next = Math.max(0, parseUnitPriceInput(prev) + amount);
      return formatUnitPriceInput(String(next));
    });
  }, []);

  const handleUnitPriceChange = useCallback((text: string) => {
    setUnitPrice(formatUnitPriceInput(text));
  }, []);

  const handleEditUnitPriceChange = useCallback((text: string) => {
    setEditUnitPrice(formatUnitPriceInput(text));
  }, []);

  const handleManualAdd = useCallback(async () => {
    const parsedPrice = isFree ? 0 : parseUnitPriceInput(unitPrice);

    if (!title.trim()) {
      track("settlement_job_create_validation_failed", { reason: "empty_title" });
      showAlert("입력 필요", "작업명을 입력해 주세요.");
      return;
    }
    if (!isFree && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      track("settlement_job_create_validation_failed", { reason: "invalid_price" });
      showAlert("입력 필요", "단가를 숫자로 입력해 주세요.");
      return;
    }
    const sanitizedWorkflow = sanitizeWorkflowForJobType(jobType, {
      shootDone,
      editDone,
    });
    const normalizedStatus =
      addStatus === "paid"
        ? "paid"
        : deriveStatusFromWorkflow({
            jobType,
            shootDone: sanitizedWorkflow.shootDone,
            editDone: sanitizedWorkflow.editDone,
            isPaid: false,
          });
    const nextShootDate = addWorkflowEnabled.shoot ? (workDate.trim() || null) : null;
    const nextEditDate = addWorkflowEnabled.edit ? (editDate.trim() || null) : null;
    const nextDeliveryDate = resolveDeliveryDateFromWorkflow({
      jobType,
      shootDate: nextShootDate,
      editDate: nextEditDate,
    });

    const result = await addJob({
      title: title.trim(),
      unitPrice: parsedPrice,
      jobType,
      shootDate: nextShootDate,
      editDate: nextEditDate,
      deliveryDate: nextDeliveryDate,
      paymentDueDate: paymentDueDate.trim() || null,
      paidAtDate: normalizedStatus === "paid" ? (paidAtDate.trim() || todayISO) : null,
      client: client.trim() || null,
      shootDone: sanitizedWorkflow.shootDone,
      editDone: sanitizedWorkflow.editDone,
      deliveryDone: false,
      status: normalizedStatus,
    });

    if ((result as any)?.demoBlocked) {
      track("settlement_job_create_blocked_demo");
      showAlert("데모 모드", "데모 모드에서는 저장되지 않습니다.");
      return;
    }
    if ((result as any)?.error) {
      track("settlement_job_create_submit_failed");
      showAlert("저장 실패", `정산 작업을 추가하지 못했습니다.\n${(result as any).error}`);
      return;
    }
    track("settlement_job_create_submitted");

    setDetailModalVisible(false);
    setTitle("");
    setClient("");
    setUnitPrice("");
    setIsFree(false);
    setJobType("shoot_edit");
    setWorkDate("");
    setEditDate("");
    setPaymentDueDate("");
    setPaidAtDate("");
    setShootDone(false);
    setEditDone(false);
    setAddStatus("before_work");
  }, [title, client, unitPrice, isFree, jobType, shootDone, editDone, addStatus, addWorkflowEnabled.shoot, addWorkflowEnabled.edit, workDate, editDate, paymentDueDate, paidAtDate, todayISO, addJob, track]);

  const openEditModal = useCallback((job: SettlementJob) => {
    const currentJobType = job.job_type || "shoot_edit";
    const normalizedWorkflow = sanitizeWorkflowForJobType(currentJobType, {
      shootDone: Boolean(job.shoot_done),
      editDone: Boolean(job.edit_done),
    });
    setEditingJobId(job.id);
    setEditTitle(job.title);
    setEditClient(job.client || "");
    setEditUnitPrice(formatUnitPriceInput(String(job.unit_price || 0)));
    setEditIsFree((job.unit_price || 0) === 0);
    setEditJobType(currentJobType);
    setEditWorkDate(job.work_date || "");
    setEditEditDate(job.edit_date || "");
    setEditPaymentDueDate(job.payment_due_date || "");
    setEditPaidAtDate(job.paid_at || "");
    setEditShootDone(normalizedWorkflow.shootDone);
    setEditEditDone(normalizedWorkflow.editDone);
    setEditStatus(
      deriveStatusFromWorkflow({
        jobType: currentJobType,
        shootDone: normalizedWorkflow.shootDone,
        editDone: normalizedWorkflow.editDone,
        isPaid: job.status === "paid" || job.is_paid,
      })
    );
    setEditModalVisible(true);
    track("settlement_edit_modal_opened", { status: job.status, job_type: job.job_type });
  }, [track]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingJobId) return;
    const parsedPrice = editIsFree ? 0 : parseUnitPriceInput(editUnitPrice);

    if (!editTitle.trim()) {
      track("settlement_job_update_validation_failed", { reason: "empty_title" });
      showAlert("입력 필요", "작업명을 입력해 주세요.");
      return;
    }
    if (!editIsFree && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      track("settlement_job_update_validation_failed", { reason: "invalid_price" });
      showAlert("입력 필요", "단가를 숫자로 입력해 주세요.");
      return;
    }
    const normalizedWorkflow = sanitizeWorkflowForJobType(editJobType, {
      shootDone: editShootDone,
      editDone: editEditDone,
    });
    const nextWorkDate = editWorkflowEnabled.shoot ? (editWorkDate.trim() || null) : null;
    const nextEditDate = editWorkflowEnabled.edit ? (editEditDate.trim() || null) : null;
    const nextDeliveryDate = resolveDeliveryDateFromWorkflow({
      jobType: editJobType,
      shootDate: nextWorkDate,
      editDate: nextEditDate,
    });

    const normalizedStatus =
      editStatus === "paid"
        ? "paid"
        : deriveStatusFromWorkflow({
            jobType: editJobType,
            shootDone: normalizedWorkflow.shootDone,
            editDone: normalizedWorkflow.editDone,
            isPaid: false,
          });

    const result = await updateJob(editingJobId, {
      title: editTitle.trim(),
      client: editClient.trim() || null,
      job_type: editJobType,
      unit_price: parsedPrice,
      work_date: nextWorkDate,
      edit_date: nextEditDate,
      delivery_date: nextDeliveryDate,
      payment_due_date: editPaymentDueDate.trim() || null,
      shoot_done: normalizedWorkflow.shootDone,
      edit_done: normalizedWorkflow.editDone,
      delivery_done: false,
      status: normalizedStatus,
      is_paid: normalizedStatus === "paid",
      paid_at: normalizedStatus === "paid" ? (editPaidAtDate.trim() || new Date().toISOString().slice(0, 10)) : null,
    });

    if ((result as any)?.error) {
      track("settlement_job_update_submit_failed");
      showAlert("수정 실패", `작업을 수정하지 못했습니다.\n${(result as any).error}`);
      return;
    }
    track("settlement_job_update_submitted");

    setEditModalVisible(false);
    setEditingJobId(null);
  }, [
    editingJobId,
    editTitle,
    editClient,
    editUnitPrice,
    editIsFree,
    editJobType,
    editWorkflowEnabled.shoot,
    editWorkflowEnabled.edit,
    editWorkDate,
    editEditDate,
    editPaymentDueDate,
    editPaidAtDate,
    editShootDone,
    editEditDone,
    editStatus,
    updateJob,
    track,
  ]);

  const handleDeleteEdit = useCallback(async () => {
    if (!editingJobId) return;

    const proceed =
      Platform.OS === "web"
        ? globalThis.confirm?.("이 작업을 삭제할까요?") ?? false
        : await new Promise<boolean>((resolve) =>
            Alert.alert("삭제 확인", "이 작업을 삭제할까요?", [
              { text: "취소", style: "cancel", onPress: () => resolve(false) },
              { text: "삭제", style: "destructive", onPress: () => resolve(true) },
            ])
          );

    if (!proceed) {
      track("settlement_job_delete_cancelled");
      return;
    }

    const result = await deleteJob(editingJobId);
    if ((result as any)?.error) {
      track("settlement_job_delete_submit_failed");
      showAlert("삭제 실패", `작업을 삭제하지 못했습니다.\n${(result as any).error}`);
      return;
    }
    track("settlement_job_delete_submitted");

    setEditModalVisible(false);
    setEditingJobId(null);
  }, [editingJobId, deleteJob, track]);

  const handleToggleWorkflowStep = useCallback(async (job: SettlementJob, step: WorkflowStepKey) => {
    if (step === "shoot_done" && job.job_type === "edit_only") return;
    if (step === "edit_done" && job.job_type === "shoot_only") return;

    const nextShootDone = step === "shoot_done" ? !job.shoot_done : Boolean(job.shoot_done);
    const nextEditDone = step === "edit_done" ? !job.edit_done : Boolean(job.edit_done);
    const nextWorkflow = sanitizeWorkflowForJobType(job.job_type, {
      shootDone: nextShootDone,
      editDone: nextEditDone,
    });
    const nextStatus = deriveStatusFromWorkflow({
      jobType: job.job_type,
      shootDone: nextWorkflow.shootDone,
      editDone: nextWorkflow.editDone,
      isPaid: false,
    });

    const result = await updateJob(job.id, {
      shoot_done: nextWorkflow.shootDone,
      edit_done: nextWorkflow.editDone,
      delivery_done: false,
      status: nextStatus,
      is_paid: false,
      paid_at: null,
    });

    if ((result as any)?.error) {
      track("settlement_workflow_toggle_failed", { step });
      showAlert("저장 실패", `작업 단계를 업데이트하지 못했습니다.\n${(result as any).error}`);
      return;
    }
    track("settlement_workflow_toggled", { step, status: nextStatus });
  }, [updateJob, track]);

  const handleMarkPaid = useCallback(async (job: SettlementJob) => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await updateJob(job.id, {
      status: "paid",
      is_paid: true,
      paid_at: today,
    });
    if ((result as any)?.error) {
      track("settlement_mark_paid_failed");
      showAlert("저장 실패", `입금 완료 처리에 실패했습니다.\n${(result as any).error}`);
      return;
    }
    track("settlement_mark_paid", { had_paid_at: Boolean(job.paid_at) });
  }, [updateJob, track]);

  const handleQuickStatusUpdate = useCallback(async (nextStatus: SettlementStatus) => {
    if (!editingJobId || statusUpdating) return;
    if (nextStatus === editStatus) return;

    const previous = editStatus;
    const prevShoot = editShootDone;
    const prevEdit = editEditDone;
    const prevPaidAt = editPaidAtDate;
    let nextShoot = editShootDone;
    let nextEdit = editEditDone;
    const enabled = getEnabledWorkflowByJobType(editJobType);

    if (nextStatus === "before_work") {
      nextShoot = false;
      nextEdit = false;
    } else if (nextStatus === "in_progress") {
      const current = sanitizeWorkflowForJobType(editJobType, {
        shootDone: nextShoot,
        editDone: nextEdit,
      });
      nextShoot = current.shootDone;
      nextEdit = current.editDone;
      if (!nextShoot && !nextEdit) {
        if (enabled.shoot) {
          nextShoot = true;
        } else if (enabled.edit) {
          nextEdit = true;
        }
      }
    } else if (nextStatus === "work_done" || nextStatus === "paid") {
      nextShoot = enabled.shoot;
      nextEdit = enabled.edit;
    }

    const normalizedWorkflow = sanitizeWorkflowForJobType(editJobType, {
      shootDone: nextShoot,
      editDone: nextEdit,
    });
    nextShoot = normalizedWorkflow.shootDone;
    nextEdit = normalizedWorkflow.editDone;

    setEditStatus(nextStatus);
    setEditShootDone(nextShoot);
    setEditEditDone(nextEdit);
    setStatusUpdating(true);
    const nextPaidAt = nextStatus === "paid" ? (editPaidAtDate || new Date().toISOString().slice(0, 10)) : "";
    setEditPaidAtDate(nextPaidAt);

    const result = await updateJob(editingJobId, {
      job_type: editJobType,
      status: nextStatus,
      shoot_done: nextShoot,
      edit_done: nextEdit,
      delivery_done: false,
      is_paid: nextStatus === "paid",
      paid_at: nextStatus === "paid" ? nextPaidAt : null,
    });

    setStatusUpdating(false);

    if ((result as any)?.error) {
      setEditStatus(previous);
      setEditShootDone(prevShoot);
      setEditEditDone(prevEdit);
      setEditPaidAtDate(prevPaidAt);
      track("settlement_status_quick_change_failed", { status: nextStatus });
      showAlert("상태 저장 실패", `상태를 변경하지 못했습니다.\n${(result as any).error}`);
      return;
    }
    track("settlement_status_quick_changed", { status: nextStatus });
  }, [editingJobId, statusUpdating, editStatus, editShootDone, editEditDone, editPaidAtDate, editJobType, updateJob, track]);

  const handleEditWorkflowToggle = useCallback(async (step: WorkflowStepKey) => {
    if (!editingJobId || statusUpdating) return;
    if (step === "shoot_done" && !editWorkflowEnabled.shoot) return;
    if (step === "edit_done" && !editWorkflowEnabled.edit) return;

    const nextShoot = step === "shoot_done" ? !editShootDone : editShootDone;
    const nextEdit = step === "edit_done" ? !editEditDone : editEditDone;
    const nextWorkflow = sanitizeWorkflowForJobType(editJobType, {
      shootDone: nextShoot,
      editDone: nextEdit,
    });
    const nextStatus = deriveStatusFromWorkflow({
      jobType: editJobType,
      shootDone: nextWorkflow.shootDone,
      editDone: nextWorkflow.editDone,
      isPaid: false,
    });

    const prevStatus = editStatus;
    const prevShoot = editShootDone;
    const prevEdit = editEditDone;
    const prevPaidAt = editPaidAtDate;

    setEditShootDone(nextWorkflow.shootDone);
    setEditEditDone(nextWorkflow.editDone);
    setEditStatus(nextStatus);
    if (nextStatus !== "paid") {
      setEditPaidAtDate("");
    }
    setStatusUpdating(true);

    const result = await updateJob(editingJobId, {
      job_type: editJobType,
      shoot_done: nextWorkflow.shootDone,
      edit_done: nextWorkflow.editDone,
      delivery_done: false,
      status: nextStatus,
      is_paid: false,
      paid_at: null,
    });

    setStatusUpdating(false);

    if ((result as any)?.error) {
      setEditStatus(prevStatus);
      setEditShootDone(prevShoot);
      setEditEditDone(prevEdit);
      setEditPaidAtDate(prevPaidAt);
      track("settlement_edit_workflow_toggle_failed", { step });
      showAlert("저장 실패", `단계 체크를 업데이트하지 못했습니다.\n${(result as any).error}`);
      return;
    }
    track("settlement_edit_workflow_toggled", { step, status: nextStatus });
  }, [editingJobId, statusUpdating, editShootDone, editEditDone, editStatus, editPaidAtDate, editWorkflowEnabled.shoot, editWorkflowEnabled.edit, editJobType, updateJob, track]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBanners />
      <FeatureModuleHeader
        title="영상 발주 관리"
        rightAction={(
          <Pressable style={styles.graphHeaderButton} onPress={openYearlyChart}>
            <BarChart3 size={18} color={Colors.textPrimary} />
          </Pressable>
        )}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.monthHeader}>
          <Pressable
            style={styles.monthButton}
            onPress={handlePrevMonth}
          >
            <ChevronLeft size={16} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthTitle}>
            {shouldRenderCalendar ? calendarViewTitle : `${formatMonthLabel(selectedMonth)} 발주 대시보드`}
          </Text>
          <Pressable
            style={styles.monthButton}
            onPress={handleNextMonth}
          >
            <ChevronRight size={16} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {!shouldRenderCalendar && (
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>총 예상 매출</Text>
              <Text style={styles.kpiValue}>{formatKRW(expectedRevenue)}</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiSplitCard]}>
              <View style={styles.kpiSplitItem}>
                <Text style={styles.kpiLabel}>실제 입금액</Text>
                <Text style={styles.kpiValue}>{formatKRW(actualReceived)}</Text>
              </View>
              <View style={styles.kpiSplitDivider} />
              <View style={styles.kpiSplitItem}>
                <Text style={styles.kpiLabel}>미수금</Text>
                <Text style={[styles.kpiValue, styles.kpiDanger]}>{formatKRW(unpaidAmount)}</Text>
              </View>
            </View>
          </View>
        )}

        {shouldRenderDesktopCalendar ? (
          <View style={styles.monthCalendarCard}>
            <View style={styles.monthCalendarWeekdayRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={`month-week-${label}`} style={styles.monthCalendarWeekdayText}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.monthCalendarGrid}>
              {monthCalendarRows.map((row, rowIndex) => (
                <View key={`month-row-${rowIndex}`} style={styles.monthCalendarGridRow}>
                  {row.map((cell, colIndex) => {
                    if (!cell) {
                      return (
                        <View
                          key={`month-empty-${rowIndex}-${colIndex}`}
                          style={[styles.monthCalendarCellEmpty, colIndex === 6 && styles.monthCalendarCellLastCol]}
                        />
                      );
                    }
                    const dateKey = toISODate(cell);
                    const eventsForDay = calendarEventsByDate.get(dateKey) || [];
                    const isToday = isSameDate(cell, new Date());
                    return (
                      <View
                        key={dateKey}
                        style={[
                          styles.monthCalendarCell,
                          colIndex === 6 && styles.monthCalendarCellLastCol,
                          isToday && styles.monthCalendarCellToday,
                        ]}
                      >
                        <View style={styles.monthCalendarCellHeader}>
                          <Text style={[styles.monthCalendarCellDayText, isToday && styles.monthCalendarCellDayTextToday]}>
                            {cell.getDate()}
                          </Text>
                          {eventsForDay.length > 0 ? (
                            <Text style={styles.monthCalendarCellCount}>{eventsForDay.length}건</Text>
                          ) : null}
                        </View>
                        <ScrollView
                          style={styles.monthCalendarJobsScroll}
                          contentContainerStyle={styles.monthCalendarJobsWrap}
                          showsVerticalScrollIndicator
                          nestedScrollEnabled
                        >
                          {eventsForDay.slice(0, 3).map((event) => (
                            <Pressable
                              key={event.id}
                              onPress={() => openEditModal(event.job)}
                              style={styles.monthCalendarJobChip}
                            >
                              <View style={styles.monthCalendarJobHeaderRow}>
                                <View
                                  style={
                                    event.stage === "shoot"
                                      ? styles.monthCalendarStageTagShoot
                                      : event.stage === "edit"
                                        ? styles.monthCalendarStageTagEdit
                                        : event.stage === "delivery"
                                          ? styles.monthCalendarStageTagDelivery
                                          : styles.monthCalendarStageTagPaid
                                  }
                                >
                                  <Text
                                    style={
                                      event.stage === "shoot"
                                        ? styles.monthCalendarStageTagTextShoot
                                        : event.stage === "edit"
                                          ? styles.monthCalendarStageTagTextEdit
                                          : event.stage === "delivery"
                                            ? styles.monthCalendarStageTagTextDelivery
                                            : styles.monthCalendarStageTagTextPaid
                                    }
                                  >
                                    {CALENDAR_STAGE_THEME[event.stage].label}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[
                                  styles.monthCalendarJobText,
                                  event.completed && event.stage !== "paid" && styles.monthCalendarJobTextCompleted,
                                ]}
                              >
                                {event.title}
                              </Text>
                            </Pressable>
                          ))}
                          {eventsForDay.length > 3 ? (
                            <Text style={styles.monthCalendarMoreText}>+{eventsForDay.length - 3}개 더</Text>
                          ) : null}
                        </ScrollView>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ) : shouldRenderMobileCalendar ? (
          <View style={styles.mobileCalendarWrap}>
            <View style={styles.monthCalendarCard}>
              <View style={styles.monthCalendarWeekdayRow}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text key={`mobile-month-week-${label}`} style={styles.monthCalendarWeekdayText}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.monthCalendarGrid}>
                {monthCalendarRows.map((row, rowIndex) => (
                  <View key={`mobile-row-${rowIndex}`} style={styles.monthCalendarGridRow}>
                    {row.map((cell, colIndex) => {
                      if (!cell) {
                        return (
                          <View
                            key={`mobile-month-empty-${rowIndex}-${colIndex}`}
                            style={[styles.mobileMonthCalendarCellEmpty, colIndex === 6 && styles.monthCalendarCellLastCol]}
                          />
                        );
                      }
                      const dateKey = toISODate(cell);
                      const eventsForDay = calendarEventsByDate.get(dateKey) || [];
                      const dayStageBadges = Array.from(new Set(eventsForDay.map((event) => event.stage)));
                      const visibleDayStageBadges = dayStageBadges.slice(0, 2);
                      const hiddenBadgeCount = Math.max(0, dayStageBadges.length - visibleDayStageBadges.length);
                      const isToday = isSameDate(cell, new Date());
                      const selected = selectedCalendarDateKey === dateKey;
                      return (
                        <Pressable
                          key={`mobile-${dateKey}`}
                          style={[
                            styles.mobileMonthCalendarCell,
                            colIndex === 6 && styles.monthCalendarCellLastCol,
                            selected && styles.mobileMonthCalendarCellSelected,
                          ]}
                          onPress={() => setSelectedCalendarDateKey(dateKey)}
                        >
                          <Text style={[styles.monthCalendarCellDayText, isToday && styles.monthCalendarCellDayTextToday]}>
                            {cell.getDate()}
                          </Text>
                          {visibleDayStageBadges.length > 0 ? (
                            <View style={styles.mobileMonthStageRow}>
                              {visibleDayStageBadges.map((stage) => (
                                <View
                                  key={`${dateKey}-${stage}`}
                                  style={
                                    stage === "shoot"
                                      ? styles.mobileMonthStageTagShoot
                                      : stage === "edit"
                                        ? styles.mobileMonthStageTagEdit
                                        : styles.mobileMonthStageTagPaid
                                  }
                                >
                                  <Text
                                    style={
                                      stage === "shoot"
                                        ? styles.mobileMonthStageTextShoot
                                        : stage === "edit"
                                          ? styles.mobileMonthStageTextEdit
                                          : styles.mobileMonthStageTextPaid
                                    }
                                  >
                                    {stage === "shoot" ? "촬영" : stage === "edit" ? "편집" : "입금"}
                                  </Text>
                                </View>
                              ))}
                              {hiddenBadgeCount > 0 ? (
                                <View style={styles.mobileMonthStageTagOverflow}>
                                  <Text style={styles.mobileMonthStageTextOverflow}>{`+${hiddenBadgeCount}`}</Text>
                                </View>
                              ) : null}
                            </View>
                          ) : (
                            <View style={styles.mobileMonthStageRowEmpty} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.mobileSelectedDayCard}>
              <Text style={styles.mobileSelectedDayTitle}>
                {selectedCalendarDateKey
                  ? (() => {
                      const selectedDate = fromISODate(selectedCalendarDateKey);
                      return `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${WEEKDAY_LABELS[selectedDate.getDay()]})`;
                    })()
                  : "날짜를 선택해 주세요"}
              </Text>
              <Text style={styles.mobileSelectedDayCount}>{selectedCalendarDayEvents.length}건</Text>
              {selectedCalendarDayEvents.length === 0 ? (
                <Text style={styles.emptySection}>해당 날짜 일정 없음</Text>
              ) : (
                <View style={styles.mobileSelectedDayList}>
                  {selectedCalendarDayEvents.map((event) => (
                    <Pressable
                      key={`mobile-event-${event.id}`}
                      onPress={() => openEditModal(event.job)}
                      style={styles.mobileSelectedDayItem}
                    >
                      <View
                        style={
                          event.stage === "shoot"
                            ? styles.monthCalendarStageTagShoot
                            : event.stage === "edit"
                              ? styles.monthCalendarStageTagEdit
                              : styles.monthCalendarStageTagPaid
                        }
                      >
                        <Text
                          style={
                            event.stage === "shoot"
                              ? styles.monthCalendarStageTagTextShoot
                              : event.stage === "edit"
                                ? styles.monthCalendarStageTagTextEdit
                                : styles.monthCalendarStageTagTextPaid
                          }
                        >
                          {CALENDAR_STAGE_THEME[event.stage].label}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.mobileSelectedDayItemTitle,
                          event.completed && event.stage !== "paid" && styles.monthCalendarJobTextCompleted,
                        ]}
                      >
                        {event.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          STATUS_SECTIONS.map((section) => {
            const sectionJobs = jobsByStatus[section.key];
            return (
              <View key={section.key} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{sectionJobs.length}</Text>
                </View>

                {sectionJobs.length === 0 ? (
                  <Text style={styles.emptySection}>항목 없음</Text>
                ) : (
                  sectionJobs.map((job) => (
                    <SettlementCard
                      key={job.id}
                      job={job}
                      sectionKey={section.key}
                      isCarryOver={carryOverSet.has(job.id)}
                      isOverdue={!job.is_paid && (job.payment_due_date ? job.payment_due_date < todayISO : false)}
                      onToggleWorkflowStep={handleToggleWorkflowStep}
                      onMarkPaid={handleMarkPaid}
                      onPress={openEditModal}
                    />
                  ))
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={[styles.calendarViewFab, { bottom: Spacing["3xl"] + 64 }]}
        onPress={handleToggleCalendarView}
        accessibilityLabel={isCalendarView ? "리스트 뷰로 전환" : "캘린더 뷰로 전환"}
      >
        {isCalendarView ? (
          <ListChecks size={24} color={Colors.textOnDark} />
        ) : (
          <Calendar size={24} color={Colors.textOnDark} />
        )}
      </Pressable>

      <Pressable style={[styles.fab, { bottom: Spacing["3xl"] }]} onPress={openDetailModal}>
        <Plus size={24} color={Colors.textOnDark} strokeWidth={2.5} />
      </Pressable>

      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrap}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>상세 입력</Text>
                <Pressable onPress={() => setDetailModalVisible(false)}>
                  <X size={20} color={Colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.statusFlowRow}>
                {STATUS_SECTIONS.map((option, index) => {
                  const selected = addStatus === option.key;
                  const theme = STATUS_THEME[option.key];
                  return (
                    <View key={`add-status-${option.key}`} style={styles.statusFlowItem}>
                      <Pressable
                        style={[
                          styles.statusFlowChip,
                          {
                            backgroundColor: theme.bg,
                            borderColor: selected ? theme.border : Colors.borderPrimary,
                          },
                          selected && styles.statusFlowChipSelected,
                        ]}
                        onPress={() => handleAddQuickStatusUpdate(option.key)}
                      >
                        <Text
                          style={[
                            styles.statusFlowText,
                            { color: selected ? theme.text : Colors.textSecondary },
                            selected && styles.statusFlowTextSelected,
                          ]}
                        >
                          {option.title}
                        </Text>
                      </Pressable>
                      {index < STATUS_SECTIONS.length - 1 && <View style={styles.statusFlowConnector} />}
                    </View>
                  );
                })}
              </View>

              <View style={styles.jobTypeRow}>
                {JOB_TYPE_OPTIONS.map((option) => {
                  const selected = jobType === option.key;
                  return (
                    <Pressable
                      key={`add-type-${option.key}`}
                      style={[styles.jobTypeChip, selected && styles.jobTypeChipSelected]}
                      onPress={() => handleAddJobTypeChange(option.key)}
                    >
                      <Text style={[styles.jobTypeChipText, selected && styles.jobTypeChipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="작업명"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
              <TextInput
                value={client}
                onChangeText={setClient}
                placeholder="거래처명"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
              {!!priceSuggestion && client.trim().length > 0 && (
                <Pressable
                  style={styles.suggestion}
                  onPress={() => {
                    setIsFree(priceSuggestion === 0);
                    setUnitPrice(formatUnitPriceInput(String(priceSuggestion)));
                  }}
                >
                  <Text style={styles.suggestionText}>이전 동일 거래처 단가 {formatKRW(priceSuggestion)} 적용</Text>
                </Pressable>
              )}
              <View style={styles.priceRow}>
                <TextInput
                  value={unitPrice}
                  onChangeText={handleUnitPriceChange}
                  placeholder="단가 (숫자)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.input, styles.priceInput, isFree && styles.inputDisabled]}
                  editable={!isFree}
                />
                <Pressable
                  style={styles.freeToggle}
                  onPress={() => {
                    setIsFree((prev) => {
                      const next = !prev;
                      setUnitPrice(next ? formatUnitPriceInput("0") : "");
                      return next;
                    });
                  }}
                >
                  <View style={[styles.checkbox, isFree && styles.checkboxChecked]}>
                    {isFree && <Check size={12} color={Colors.textOnDark} strokeWidth={2.6} />}
                  </View>
                  <Text style={styles.freeToggleText}>무상</Text>
                </Pressable>
              </View>
              <View style={styles.priceQuickRow}>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(-1000000)}>
                  <Text style={styles.priceQuickButtonText}>-100만</Text>
                </Pressable>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(-500000)}>
                  <Text style={styles.priceQuickButtonText}>-50만</Text>
                </Pressable>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(-100000)}>
                  <Text style={styles.priceQuickButtonText}>-10만</Text>
                </Pressable>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(-50000)}>
                  <Text style={styles.priceQuickButtonText}>-5만</Text>
                </Pressable>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(50000)}>
                  <Text style={styles.priceQuickButtonText}>+5만</Text>
                </Pressable>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(100000)}>
                  <Text style={styles.priceQuickButtonText}>+10만</Text>
                </Pressable>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(500000)}>
                  <Text style={styles.priceQuickButtonText}>+50만</Text>
                </Pressable>
                <Pressable style={styles.priceQuickButton} onPress={() => handleAddUnitIncrement(1000000)}>
                  <Text style={styles.priceQuickButtonText}>+100만</Text>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>촬영일</Text>
                <Pressable
                  style={[styles.dateFieldButton, !addWorkflowEnabled.shoot && styles.dateButtonDisabled]}
                  onPress={() => {
                    if (!addWorkflowEnabled.shoot) return;
                    openDatePicker("add", "workDate");
                  }}
                  disabled={!addWorkflowEnabled.shoot}
                >
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{workDate || "선택"}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.stepCheckButton,
                    shootDone && styles.stepCheckButtonChecked,
                    !addWorkflowEnabled.shoot && styles.stepCheckButtonDisabled,
                  ]}
                  onPress={() => handleAddWorkflowToggle("shoot_done")}
                  disabled={!addWorkflowEnabled.shoot}
                >
                  <View style={[styles.workflowCheckbox, shootDone && styles.workflowCheckboxChecked]}>
                    {shootDone ? <Check size={10} color={Colors.textOnDark} strokeWidth={2.8} /> : null}
                  </View>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>편집일</Text>
                <Pressable
                  style={[styles.dateFieldButton, !addWorkflowEnabled.edit && styles.dateButtonDisabled]}
                  onPress={() => {
                    if (!addWorkflowEnabled.edit) return;
                    openDatePicker("add", "editDate");
                  }}
                  disabled={!addWorkflowEnabled.edit}
                >
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{editDate || "선택"}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.stepCheckButton,
                    editDone && styles.stepCheckButtonChecked,
                    !addWorkflowEnabled.edit && styles.stepCheckButtonDisabled,
                  ]}
                  onPress={() => handleAddWorkflowToggle("edit_done")}
                  disabled={!addWorkflowEnabled.edit}
                >
                  <View style={[styles.workflowCheckbox, editDone && styles.workflowCheckboxChecked]}>
                    {editDone ? <Check size={10} color={Colors.textOnDark} strokeWidth={2.8} /> : null}
                  </View>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>입금예정</Text>
                <Pressable style={styles.dateFieldButton} onPress={() => openDatePicker("add", "paymentDueDate")}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{paymentDueDate || "선택"}</Text>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>입금완료</Text>
                <Pressable style={styles.dateFieldButton} onPress={() => openDatePicker("add", "paidAtDate")}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{paidAtDate || "선택"}</Text>
                </Pressable>
              </View>

              <Pressable style={styles.submitButton} onPress={handleManualAdd}>
                <Text style={styles.submitButtonText}>작업 추가</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setEditModalVisible(false);
          setEditingJobId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrap}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>작업 수정</Text>
                <Pressable
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditingJobId(null);
                  }}
                >
                  <X size={20} color={Colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.statusFlowRow}>
                {STATUS_SECTIONS.map((option, index) => {
                  const selected = editStatus === option.key;
                  const theme = STATUS_THEME[option.key];
                  return (
                    <View key={option.key} style={styles.statusFlowItem}>
                      <Pressable
                        style={[
                          styles.statusFlowChip,
                          {
                            backgroundColor: theme.bg,
                            borderColor: selected ? theme.border : Colors.borderPrimary,
                          },
                          selected && styles.statusFlowChipSelected,
                          statusUpdating && styles.statusFlowChipDisabled,
                        ]}
                        onPress={() => handleQuickStatusUpdate(option.key)}
                        disabled={statusUpdating}
                      >
                        <Text
                          style={[
                            styles.statusFlowText,
                            { color: selected ? theme.text : Colors.textSecondary },
                            selected && styles.statusFlowTextSelected,
                          ]}
                        >
                          {option.title}
                        </Text>
                      </Pressable>
                      {index < STATUS_SECTIONS.length - 1 && <View style={styles.statusFlowConnector} />}
                    </View>
                  );
                })}
              </View>

              <View style={styles.jobTypeRow}>
                {JOB_TYPE_OPTIONS.map((option) => {
                  const selected = editJobType === option.key;
                  return (
                    <Pressable
                      key={`edit-type-${option.key}`}
                      style={[styles.jobTypeChip, selected && styles.jobTypeChipSelected]}
                      onPress={() => handleEditJobTypeChange(option.key)}
                    >
                      <Text style={[styles.jobTypeChipText, selected && styles.jobTypeChipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="작업명"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
              <TextInput
                value={editClient}
                onChangeText={setEditClient}
                placeholder="거래처명"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />

              <View style={styles.priceRow}>
                <TextInput
                  value={editUnitPrice}
                  onChangeText={handleEditUnitPriceChange}
                  placeholder="단가 (숫자)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.input, styles.priceInput, editIsFree && styles.inputDisabled]}
                  editable={!editIsFree}
                />
                <Pressable
                  style={styles.freeToggle}
                  onPress={() => {
                    setEditIsFree((prev) => {
                      const next = !prev;
                      setEditUnitPrice(next ? formatUnitPriceInput("0") : "");
                      return next;
                    });
                  }}
                >
                  <View style={[styles.checkbox, editIsFree && styles.checkboxChecked]}>
                    {editIsFree && <Check size={12} color={Colors.textOnDark} strokeWidth={2.6} />}
                  </View>
                  <Text style={styles.freeToggleText}>무상</Text>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>촬영일</Text>
                <Pressable
                  style={[styles.dateFieldButton, !editWorkflowEnabled.shoot && styles.dateButtonDisabled]}
                  onPress={() => {
                    if (!editWorkflowEnabled.shoot) return;
                    openDatePicker("edit", "workDate");
                  }}
                  disabled={!editWorkflowEnabled.shoot}
                >
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{editWorkDate || "선택"}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.stepCheckButton,
                    editShootDone && styles.stepCheckButtonChecked,
                    !editWorkflowEnabled.shoot && styles.stepCheckButtonDisabled,
                  ]}
                  onPress={() => handleEditWorkflowToggle("shoot_done")}
                  disabled={statusUpdating || !editWorkflowEnabled.shoot}
                >
                  <View style={[styles.workflowCheckbox, editShootDone && styles.workflowCheckboxChecked]}>
                    {editShootDone ? <Check size={10} color={Colors.textOnDark} strokeWidth={2.8} /> : null}
                  </View>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>편집일</Text>
                <Pressable
                  style={[styles.dateFieldButton, !editWorkflowEnabled.edit && styles.dateButtonDisabled]}
                  onPress={() => {
                    if (!editWorkflowEnabled.edit) return;
                    openDatePicker("edit", "editDate");
                  }}
                  disabled={!editWorkflowEnabled.edit}
                >
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{editEditDate || "선택"}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.stepCheckButton,
                    editEditDone && styles.stepCheckButtonChecked,
                    !editWorkflowEnabled.edit && styles.stepCheckButtonDisabled,
                  ]}
                  onPress={() => handleEditWorkflowToggle("edit_done")}
                  disabled={statusUpdating || !editWorkflowEnabled.edit}
                >
                  <View style={[styles.workflowCheckbox, editEditDone && styles.workflowCheckboxChecked]}>
                    {editEditDone ? <Check size={10} color={Colors.textOnDark} strokeWidth={2.8} /> : null}
                  </View>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>입금예정</Text>
                <Pressable style={styles.dateFieldButton} onPress={() => openDatePicker("edit", "paymentDueDate")}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{editPaymentDueDate || "선택"}</Text>
                </Pressable>
              </View>

              <View style={styles.dateFieldRow}>
                <Text style={styles.dateFieldLabel}>입금완료</Text>
                <Pressable style={styles.dateFieldButton} onPress={() => openDatePicker("edit", "paidAtDate")}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{editPaidAtDate || "선택"}</Text>
                </Pressable>
              </View>

              <View style={styles.editActionRow}>
                <Pressable style={styles.deleteButton} onPress={handleDeleteEdit}>
                  <Trash2 size={14} color={Colors.error} />
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </Pressable>
                <Pressable style={[styles.submitButton, styles.saveButton]} onPress={handleSaveEdit}>
                  <Text style={styles.submitButtonText}>저장</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {Platform.OS !== "web" && activeDateField && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      )}

      <Modal
        visible={Platform.OS === "web" && calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCalendarVisible(false);
          setActiveDateField(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.webCalendarCard}>
            <View style={styles.webCalendarHeader}>
              <Pressable
                style={styles.monthButton}
                onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <ChevronLeft size={16} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.webCalendarTitle}>{calendarMonthLabel}</Text>
              <Pressable
                style={styles.monthButton}
                onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <ChevronRight size={16} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={styles.weekdayText}>{label}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {calendarCells.map((cell, index) => {
                if (!cell) {
                  return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
                }
                const isToday = isSameDate(cell, new Date());
                const isSelected = selectedDateForField ? isSameDate(cell, selectedDateForField) : false;
                return (
                  <Pressable
                    key={toISODate(cell)}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => handleWebCalendarPick(cell)}
                  >
                    <Text style={[styles.dayCellText, isToday && styles.dayCellToday, isSelected && styles.dayCellTextSelected]}>
                      {cell.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.webCalendarClose}
              onPress={() => {
                setCalendarVisible(false);
                setActiveDateField(null);
              }}
            >
              <Text style={styles.webCalendarCloseText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={yearlyChartVisible}
        transparent
        animationType="fade"
        onRequestClose={closeYearlyChart}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.yearlyChartCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>연간 매출 추이</Text>
                <Text style={styles.chartSubTitle}>{selectedYear}년 월별 매출/실입금</Text>
              </View>
              <Pressable onPress={closeYearlyChart}>
                <X size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.chartCanvas}>
              {yearlyRevenueByMonth.map((item, index) => {
                const actual = yearlyActualByMonth[index]?.amount ?? 0;
                const expectedRatio = maxYearlyChartValue > 0 ? item.amount / maxYearlyChartValue : 0;
                const actualRatio = maxYearlyChartValue > 0 ? actual / maxYearlyChartValue : 0;
                const expectedHeight = item.amount > 0 ? Math.max(8, Math.round(expectedRatio * 120)) : 2;
                const actualHeight = actual > 0 ? Math.max(8, Math.round(actualRatio * 120)) : 2;

                return (
                  <View key={item.month} style={styles.chartColumn}>
                    <View style={styles.chartBarPair}>
                      <View style={styles.chartBarTrack}>
                        <View style={[styles.chartBarFill, { height: expectedHeight }]} />
                      </View>
                      <View style={styles.chartBarTrack}>
                        <View style={[styles.chartBarFillActual, { height: actualHeight }]} />
                      </View>
                    </View>
                    <Text style={styles.chartMonthLabel}>{item.month}월</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.chartSummaryRow}>
              <View style={styles.chartSummaryItem}>
                <Text style={styles.chartSummaryLabel}>연간 매출</Text>
                <Text style={styles.chartSummaryValue}>{formatKRW(yearlyRevenueTotal)}</Text>
              </View>
              <View style={styles.kpiSplitDivider} />
              <View style={styles.chartSummaryItem}>
                <Text style={styles.chartSummaryLabel}>연간 실입금</Text>
                <Text style={[styles.chartSummaryValue, styles.chartSummaryValueActual]}>{formatKRW(yearlyActualTotal)}</Text>
              </View>
            </View>

            <View style={styles.chartLegendRow}>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, styles.chartLegendExpected]} />
                <Text style={styles.chartLegendText}>매출</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, styles.chartLegendActual]} />
                <Text style={styles.chartLegendText}>실입금</Text>
              </View>
            </View>

            <View style={styles.chartList}>
              {yearlyRevenueByMonth.map((item, index) => (
                <View key={`row-${item.month}`} style={styles.chartListRow}>
                  <Text style={styles.chartListMonth}>{item.month}월</Text>
                  <View style={styles.chartListValuesWrap}>
                    <Text style={styles.chartListValue}>매출 {formatKRW(item.amount)}</Text>
                    <Text style={[styles.chartListValue, styles.chartListValueActual]}>
                      입금 {formatKRW(yearlyActualByMonth[index]?.amount ?? 0)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable style={styles.webCalendarClose} onPress={() => setYearlyChartVisible(false)}>
              <Text style={styles.webCalendarCloseText}>닫기</Text>
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
  loadingWrap: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["2xl"],
    paddingBottom: 180,
    gap: Spacing["2xl"],
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
  },
  graphHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
  },
  monthTitle: {
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  kpiRow: {
    gap: Spacing.sm,
  },
  kpiCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    gap: 2,
  },
  kpiLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  kpiValue: {
    fontSize: FontSizes["2xl"],
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  kpiDanger: {
    color: "#FF6B6B",
  },
  kpiSplitCard: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: Spacing["2xl"],
  },
  kpiSplitItem: {
    flex: 1,
    gap: 2,
  },
  kpiSplitDivider: {
    width: 1,
    backgroundColor: Colors.borderPrimary,
    marginHorizontal: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  monthCalendarCard: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  monthCalendarWeekdayRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
    paddingBottom: Spacing.xs,
  },
  monthCalendarWeekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  monthCalendarGrid: {
    width: "100%",
  },
  monthCalendarGridRow: {
    flexDirection: "row",
    width: "100%",
  },
  mobileCalendarWrap: {
    gap: Spacing.sm,
  },
  mobileMonthCalendarCellEmpty: {
    flex: 1,
    minWidth: 0,
    height: 68,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgSecondary,
  },
  mobileMonthCalendarCell: {
    flex: 1,
    minWidth: 0,
    height: 68,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  mobileMonthCalendarCellSelected: {
    backgroundColor: Colors.accentBg,
  },
  mobileMonthStageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 14,
    marginTop: 1,
  },
  mobileMonthStageRowEmpty: {
    minHeight: 14,
  },
  mobileMonthStageTagShoot: {
    borderRadius: 999,
    backgroundColor: CALENDAR_STAGE_THEME.shoot.bg,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  mobileMonthStageTagEdit: {
    borderRadius: 999,
    backgroundColor: CALENDAR_STAGE_THEME.edit.bg,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  mobileMonthStageTagPaid: {
    borderRadius: 999,
    backgroundColor: CALENDAR_STAGE_THEME.paid.bg,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  mobileMonthStageTagOverflow: {
    borderRadius: 999,
    backgroundColor: Colors.bgTertiary,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  mobileMonthStageTextShoot: {
    fontSize: 8,
    lineHeight: 10,
    color: CALENDAR_STAGE_THEME.shoot.text,
    fontWeight: "700",
  },
  mobileMonthStageTextEdit: {
    fontSize: 8,
    lineHeight: 10,
    color: CALENDAR_STAGE_THEME.edit.text,
    fontWeight: "700",
  },
  mobileMonthStageTextPaid: {
    fontSize: 8,
    lineHeight: 10,
    color: CALENDAR_STAGE_THEME.paid.text,
    fontWeight: "700",
  },
  mobileMonthStageTextOverflow: {
    fontSize: 8,
    lineHeight: 10,
    color: Colors.textMuted,
    fontWeight: "700",
  },
  mobileSelectedDayCard: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  mobileSelectedDayTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  mobileSelectedDayCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  mobileSelectedDayList: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  mobileSelectedDayItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  mobileSelectedDayItemTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  monthCalendarCellEmpty: {
    flex: 1,
    minWidth: 0,
    height: 132,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgSecondary,
  },
  monthCalendarCell: {
    flex: 1,
    minWidth: 0,
    height: 132,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgCard,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  monthCalendarCellLastCol: {
    borderRightWidth: 0,
  },
  monthCalendarCellToday: {
    backgroundColor: Colors.accentBg,
  },
  monthCalendarCellHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthCalendarCellDayText: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  monthCalendarCellDayTextToday: {
    color: Colors.accent,
  },
  monthCalendarCellCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  monthCalendarJobsWrap: {
    gap: 4,
    paddingBottom: 2,
  },
  monthCalendarJobsScroll: {
    flex: 1,
  },
  monthCalendarJobChip: {
    gap: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  monthCalendarJobHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  monthCalendarJobTextCompleted: {
    textDecorationLine: "line-through",
    textDecorationStyle: "solid",
    opacity: 0.72,
  },
  monthCalendarJobText: {
    fontSize: FontSizes.xs,
    lineHeight: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  monthCalendarStageTagShoot: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: CALENDAR_STAGE_THEME.shoot.bg,
  },
  monthCalendarStageTagEdit: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: CALENDAR_STAGE_THEME.edit.bg,
  },
  monthCalendarStageTagDelivery: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: CALENDAR_STAGE_THEME.delivery.bg,
  },
  monthCalendarStageTagPaid: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: CALENDAR_STAGE_THEME.paid.bg,
  },
  monthCalendarStageTagTextShoot: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    color: CALENDAR_STAGE_THEME.shoot.text,
  },
  monthCalendarStageTagTextEdit: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    color: CALENDAR_STAGE_THEME.edit.text,
  },
  monthCalendarStageTagTextDelivery: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    color: CALENDAR_STAGE_THEME.delivery.text,
  },
  monthCalendarStageTagTextPaid: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    color: CALENDAR_STAGE_THEME.paid.text,
  },
  monthCalendarMoreText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  emptySection: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    paddingVertical: Spacing.md,
    textAlign: "center",
  },
  jobCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  jobCardOverdue: {
    borderColor: "#FF6B6B",
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  jobTitle: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  clientText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  priceText: {
    fontSize: FontSizes.base,
    color: Colors.accent,
    fontWeight: "700",
  },
  dateMeta: {
    gap: 1,
  },
  dateLine: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  workflowChecklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  workflowChecklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgSecondary,
  },
  workflowChecklistItemChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  workflowCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgCard,
  },
  workflowCheckboxChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  workflowChecklistText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  workflowChecklistTextChecked: {
    color: Colors.accent,
  },
  paymentPendingWrap: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    padding: Spacing.sm,
    backgroundColor: Colors.bgSecondary,
  },
  paymentPendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  paymentPendingText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  paymentDoneButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentDoneButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textOnDark,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  carryBadge: {
    fontSize: FontSizes.xs,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
  },
  overdueBadge: {
    fontSize: FontSizes.xs,
    color: "#FF6B6B",
    borderWidth: 1,
    borderColor: "#FF6B6B",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: Spacing["3xl"],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  calendarViewFab: {
    position: "absolute",
    right: Spacing["3xl"],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.textSecondary,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.25)',
    elevation: 4,
    zIndex: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  modalWrap: {
    width: "100%",
    maxWidth: 460,
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing["3xl"],
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  input: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  jobTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  jobTypeChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  jobTypeChipSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  jobTypeChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  jobTypeChipTextSelected: {
    color: Colors.accent,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  priceInput: {
    flex: 1,
  },
  freeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgSecondary,
  },
  freeToggleText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  priceQuickRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  priceQuickButton: {
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  priceQuickButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dateButtonDisabled: {
    opacity: 0.45,
  },
  dateButtonText: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  dateFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dateFieldLabel: {
    width: 44,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  dateFieldButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  stepCheckButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCheckButtonChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  stepCheckButtonDisabled: {
    opacity: 0.45,
  },
  suggestion: {
    backgroundColor: Colors.accentBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  suggestionText: {
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: "600",
  },
  submitButton: {
    marginTop: Spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accent,
  },
  submitButtonText: {
    fontSize: FontSizes.base,
    color: Colors.textOnDark,
    fontWeight: "700",
  },
  statusFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
  },
  statusFlowItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusFlowChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    borderWidth: 1.5,
    borderColor: Colors.borderPrimary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 8,
  },
  statusFlowChipSelected: {
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 2,
  },
  statusFlowChipDisabled: {
    opacity: 0.6,
  },
  statusFlowText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  statusFlowTextSelected: {
    fontWeight: "700",
  },
  statusFlowConnector: {
    width: 10,
    height: 2,
    borderRadius: 999,
    backgroundColor: Colors.borderPrimary,
    marginHorizontal: 4,
  },
  editActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: "rgba(255,82,82,0.08)",
  },
  deleteButtonText: {
    fontSize: FontSizes.base,
    color: Colors.error,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
  },
  webCalendarCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing["3xl"],
    gap: Spacing.md,
  },
  yearlyChartCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing["3xl"],
    gap: Spacing.md,
  },
  chartSubTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chartCanvas: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.xs,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 160,
  },
  chartColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  chartBarPair: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    width: "100%",
  },
  chartBarTrack: {
    width: 9,
    height: 122,
    justifyContent: "flex-end",
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgTertiary,
    overflow: "hidden",
  },
  chartBarFill: {
    width: "100%",
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
  },
  chartBarFillActual: {
    width: "100%",
    backgroundColor: Colors.successAlt,
    borderRadius: BorderRadius.full,
  },
  chartMonthLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  chartSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  chartSummaryItem: {
    flex: 1,
    gap: 2,
  },
  chartSummaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  chartSummaryValue: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  chartSummaryValueActual: {
    color: Colors.successAlt,
  },
  chartLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  chartLegendExpected: {
    backgroundColor: Colors.accent,
  },
  chartLegendActual: {
    backgroundColor: Colors.successAlt,
  },
  chartLegendText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  chartList: {
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  chartListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSecondary,
    backgroundColor: Colors.bgSecondary,
  },
  chartListMonth: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  chartListValuesWrap: {
    alignItems: "flex-end",
    gap: 2,
  },
  chartListValue: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  chartListValueActual: {
    color: Colors.successAlt,
  },
  webCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webCalendarTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
  },
  dayCellSelected: {
    backgroundColor: Colors.accent,
  },
  dayCellText: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  dayCellToday: {
    color: Colors.accent,
    fontWeight: "700",
  },
  dayCellTextSelected: {
    color: Colors.textOnDark,
    fontWeight: "700",
  },
  webCalendarClose: {
    marginTop: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSecondary,
  },
  webCalendarCloseText: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
