import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { notifySlack } from "@/lib/slackNotify";
import { writeCache, readCache } from "@/lib/offlineCache";
import { enqueue } from "@/lib/syncQueue";
import type { Database } from "@/lib/database.types";
import { addMonthsISO } from "@/lib/settlement";

export type SettlementJob = Database["public"]["Tables"]["settlement_jobs"]["Row"];
type SettlementInsert = Database["public"]["Tables"]["settlement_jobs"]["Insert"];
type SettlementUpdate = Database["public"]["Tables"]["settlement_jobs"]["Update"];
export type SettlementStatus = SettlementJob["status"];
export type SettlementJobType = SettlementJob["job_type"];

interface AddSettlementPayload {
  title: string;
  unitPrice: number;
  jobType?: SettlementJobType;
  shootDate?: string | null;
  editDate?: string | null;
  deliveryDate?: string | null;
  paymentDueDate?: string | null;
  paidAtDate?: string | null;
  client?: string | null;
  status?: SettlementStatus;
  shootDone?: boolean;
  editDone?: boolean;
  deliveryDone?: boolean;
}

type LegacySettlementStatus = "in_progress" | "delivered" | "payment_pending" | "paid";

function toLegacyStatus(status: SettlementStatus): LegacySettlementStatus {
  if (status === "before_work") return "in_progress";
  if (status === "work_done") return "payment_pending";
  return status;
}

function isStatusConstraintError(error: any): boolean {
  const message = String(error?.message || "");
  return error?.code === "23514" || message.includes("settlement_jobs_status_check");
}

function isMissingJobTypeColumnError(error: any): boolean {
  const message = String(error?.message || "");
  return (
    message.includes("Could not find the 'job_type' column") ||
    message.includes("column \"job_type\"") ||
    message.includes("column 'job_type'")
  );
}

function normalizeStatus(status: string): SettlementStatus {
  if (status === "before_work" || status === "in_progress" || status === "work_done" || status === "paid") {
    return status;
  }
  if (status === "delivered" || status === "payment_pending") {
    return "work_done";
  }
  return "before_work";
}

function normalizeJobType(jobType: string | null | undefined): SettlementJobType | null {
  if (jobType === "shoot_only" || jobType === "edit_only" || jobType === "shoot_edit") {
    return jobType;
  }
  return null;
}

function normalizeJob(raw: SettlementJob): SettlementJob {
  const status = normalizeStatus(raw.status as string);
  const rawJobType = normalizeJobType((raw as any).job_type);
  const inferredJobType: SettlementJobType = raw.work_date && !(raw as any).edit_date
    ? "shoot_only"
    : !raw.work_date && Boolean((raw as any).edit_date)
      ? "edit_only"
      : "shoot_edit";
  const jobType = rawJobType ?? inferredJobType;
  const isPaid = status === "paid";
  const shootDone = jobType === "edit_only" ? false : Boolean((raw as any).shoot_done);
  const editDone = jobType === "shoot_only" ? false : Boolean((raw as any).edit_done);
  const deliveryDone = Boolean((raw as any).delivery_done);
  return {
    ...raw,
    status,
    job_type: jobType,
    work_date: raw.work_date || null,
    edit_date: (raw as any).edit_date || null,
    delivery_date: raw.delivery_date || null,
    payment_due_date: raw.payment_due_date || null,
    shoot_done: shootDone,
    edit_done: editDone,
    delivery_done: deliveryDone,
    is_paid: isPaid,
    paid_at: isPaid ? raw.paid_at : null,
  };
}

const DEMO_SETTLEMENTS: SettlementJob[] = [
  {
    id: "demo-1",
    user_id: "demo",
    title: "브랜드 숏폼 3편 제작",
    client: "A컴퍼니",
    job_type: "shoot_edit",
    work_date: "2026-02-06",
    edit_date: "2026-02-08",
    delivery_date: "2026-02-10",
    unit_price: 1200000,
    payment_due_date: "2026-03-31",
    status: "work_done",
    shoot_done: true,
    edit_done: true,
    delivery_done: true,
    is_paid: false,
    paid_at: null,
    sort_order: 0,
    created_at: "2026-02-06T12:00:00.000Z",
    updated_at: "2026-02-06T12:00:00.000Z",
  },
  {
    id: "demo-2",
    user_id: "demo",
    title: "유튜브 인트로 편집",
    client: "B스튜디오",
    job_type: "shoot_edit",
    work_date: "2026-02-01",
    edit_date: "2026-02-02",
    delivery_date: "2026-02-03",
    unit_price: 450000,
    payment_due_date: "2026-02-28",
    status: "paid",
    shoot_done: true,
    edit_done: true,
    delivery_done: true,
    is_paid: true,
    paid_at: "2026-02-07",
    sort_order: 1,
    created_at: "2026-02-01T12:00:00.000Z",
    updated_at: "2026-02-07T12:00:00.000Z",
  },
];

const TABLE = "settlement_jobs";

export function useSettlementJobs() {
  const { user, isDemoMode } = useAuth();
  const { isOnline, syncVersion } = useNetwork();
  const { track } = useAnalytics();
  const [jobs, setJobs] = useState<SettlementJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (isDemoMode) {
      setJobs(DEMO_SETTLEMENTS);
      setLoading(false);
      return;
    }
    if (!user) return;

    try {
      setLoading(true);

      if (isOnline) {
        const { data, error } = await supabase
          .from(TABLE)
          .select("*")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) throw error;
        const normalized = (data || []).map(normalizeJob);
        setJobs(normalized);
        writeCache(user.id, TABLE, data || []);
        track("settlement_jobs_loaded", { count: normalized.length });
      } else {
        const cached = await readCache<SettlementJob[]>(user.id, TABLE);
        const normalized = (cached || []).map(normalizeJob);
        setJobs(normalized);
      }
    } catch (err: any) {
      const message = err.message || "정산 데이터를 불러오지 못했습니다.";
      setError(message);
      const cached = await readCache<SettlementJob[]>(user.id, TABLE);
      if (cached) setJobs(cached.map(normalizeJob));
      track("settlement_jobs_load_failed");
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, user, isOnline, track]);

  const nextSortOrder = useMemo(() => {
    const max = jobs.reduce((acc, job) => Math.max(acc, job.sort_order ?? 0), 0);
    return max + 1;
  }, [jobs]);

  const addJob = useCallback(
    async (payload: AddSettlementPayload) => {
      if (isDemoMode) return { demoBlocked: true, error: null as string | null };
      if (!user) return { error: "User not authenticated" };

      const status = payload.status ?? "before_work";
      const jobType = payload.jobType ?? "shoot_edit";
      const shootDate = payload.shootDate?.trim() || null;
      const editDate = payload.editDate?.trim() || null;
      const deliveryDate = payload.deliveryDate?.trim() || null;
      const paymentDueDate = payload.paymentDueDate?.trim() || null;
      const paidAtDate = payload.paidAtDate?.trim() || null;
      const shootDone = Boolean(payload.shootDone);
      const editDone = Boolean(payload.editDone);
      const deliveryDone = Boolean(payload.deliveryDone);
      const isPaid = status === "paid";

      if (isOnline) {
        try {
          const insertWithStatus = async (dbStatus: string, includeJobType: boolean) => {
            const insertData: SettlementInsert = {
              user_id: user.id,
              title: payload.title,
              client: payload.client ?? null,
              unit_price: Math.max(0, Math.round(payload.unitPrice)),
              work_date: shootDate,
              edit_date: editDate,
              delivery_date: deliveryDate,
              payment_due_date: paymentDueDate,
              status: dbStatus as SettlementInsert["status"],
              shoot_done: shootDone,
              edit_done: editDone,
              delivery_done: deliveryDone,
              is_paid: isPaid,
              paid_at: isPaid ? (paidAtDate || new Date().toISOString().slice(0, 10)) : null,
              sort_order: nextSortOrder,
            };
            if (includeJobType) {
              insertData.job_type = jobType;
            }
            return supabase.from(TABLE).insert(insertData).select("*").single();
          };

          let includeJobType = true;
          let { data, error } = await insertWithStatus(status, includeJobType);

          if (error && includeJobType && isMissingJobTypeColumnError(error)) {
            includeJobType = false;
            const fallback = await insertWithStatus(status, includeJobType);
            data = fallback.data;
            error = fallback.error;
          }

          if (error && isStatusConstraintError(error)) {
            const legacyStatus = toLegacyStatus(status);
            if (legacyStatus !== status) {
              const fallback = await insertWithStatus(legacyStatus, includeJobType);
              data = fallback.data;
              error = fallback.error;
              if (error && includeJobType && isMissingJobTypeColumnError(error)) {
                includeJobType = false;
                const legacyFb = await insertWithStatus(legacyStatus, includeJobType);
                data = legacyFb.data;
                error = legacyFb.error;
              }
            }
          }

          if (error) throw error;
          const normalized = normalizeJob(data as SettlementJob);
          setJobs((prev) => [...prev, normalized]);
          track("settlement_job_created", {
            status: normalized.status,
            has_client: Boolean(normalized.client),
            job_type: normalized.job_type,
            unit_price: normalized.unit_price,
          });
          notifySlack(
            "settlement_job_created",
            { userId: user.id },
            `${normalized.title} · ${normalized.client || "거래처 미지정"} · ${normalized.unit_price.toLocaleString("ko-KR")}원 · ${normalized.status}`
          );
          return { data: normalized, error: null as string | null };
        } catch (err: any) {
          const message = err.message || "정산 작업 생성에 실패했습니다.";
          setError(message);
          track("settlement_job_create_failed");
          return { error: message };
        }
      } else {
        // 오프라인
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const optimistic: SettlementJob = {
          id: tempId,
          user_id: user.id,
          title: payload.title,
          client: payload.client ?? null,
          job_type: jobType,
          work_date: shootDate,
          edit_date: editDate,
          delivery_date: deliveryDate,
          unit_price: Math.max(0, Math.round(payload.unitPrice)),
          payment_due_date: paymentDueDate,
          status,
          shoot_done: shootDone,
          edit_done: editDone,
          delivery_done: deliveryDone,
          is_paid: isPaid,
          paid_at: isPaid ? (paidAtDate || new Date().toISOString().slice(0, 10)) : null,
          sort_order: nextSortOrder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setJobs((prev) => [...prev, normalizeJob(optimistic)]);
        await enqueue(user.id, {
          table: TABLE,
          type: "insert",
          rowId: tempId,
          data: {
            user_id: user.id,
            title: payload.title,
            client: payload.client ?? null,
            job_type: jobType,
            unit_price: Math.max(0, Math.round(payload.unitPrice)),
            work_date: shootDate,
            edit_date: editDate,
            delivery_date: deliveryDate,
            payment_due_date: paymentDueDate,
            status,
            shoot_done: shootDone,
            edit_done: editDone,
            delivery_done: deliveryDone,
            is_paid: isPaid,
            paid_at: isPaid ? (paidAtDate || new Date().toISOString().slice(0, 10)) : null,
            sort_order: nextSortOrder,
          },
        });
        track("settlement_job_created");
        return { data: normalizeJob(optimistic), error: null as string | null };
      }
    },
    [isDemoMode, user, nextSortOrder, track, isOnline]
  );

  const updateJob = useCallback(async (id: string, updates: SettlementUpdate) => {
    if (isDemoMode) return { demoBlocked: true, error: null as string | null };

    const prevJob = jobs.find((job) => job.id === id);

    // Optimistic
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...updates } : job)));

    if (isOnline) {
      try {
        let patch = updates;
        let { error } = await supabase.from(TABLE).update(patch).eq("id", id);

        if (
          error &&
          Object.prototype.hasOwnProperty.call(updates, "job_type") &&
          isMissingJobTypeColumnError(error)
        ) {
          const rest = { ...(updates as SettlementUpdate & { job_type?: SettlementJobType }) };
          delete rest.job_type;
          patch = rest as SettlementUpdate;
          const retry = await supabase.from(TABLE).update(patch).eq("id", id);
          error = retry.error;
        }

        if (error) throw error;
        track("settlement_job_updated");
        const nextStatus = typeof updates.status === "string" ? (updates.status as SettlementStatus) : null;
        if (nextStatus && prevJob && prevJob.status !== nextStatus && user?.id) {
          notifySlack("settlement_job_status_changed", { userId: user.id }, `${prevJob.title} · ${prevJob.status} → ${nextStatus}`);
        }
        return { error: null as string | null };
      } catch (err: any) {
        const message = err.message || "정산 작업 수정에 실패했습니다.";
        setError(message);
        return { error: message };
      }
    } else {
      await enqueue(user!.id, {
        table: TABLE,
        type: "update",
        rowId: id,
        data: updates as unknown as Record<string, unknown>,
      });
      track("settlement_job_updated");
      return { error: null as string | null };
    }
  }, [isDemoMode, jobs, track, user, isOnline]);

  const moveStatus = useCallback(async (id: string, status: SettlementStatus) => {
    if (isDemoMode) return { demoBlocked: true, error: null as string | null };

    const prevJob = jobs.find((job) => job.id === id);
    const paidAt = status === "paid" ? new Date().toISOString().slice(0, 10) : null;

    // Optimistic
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, status, is_paid: status === "paid", paid_at: paidAt } : job
      )
    );

    if (isOnline) {
      const updateWithStatus = async (dbStatus: string) => {
        return supabase.from(TABLE).update({ status: dbStatus as SettlementUpdate["status"], is_paid: status === "paid", paid_at: paidAt }).eq("id", id);
      };

      try {
        let { error } = await updateWithStatus(status);
        if (error && isStatusConstraintError(error)) {
          const legacyStatus = toLegacyStatus(status);
          if (legacyStatus !== status) {
            const fallback = await updateWithStatus(legacyStatus);
            error = fallback.error;
          }
        }
        if (error) throw error;
        track("settlement_job_status_changed", { status });
        if (prevJob && prevJob.status !== status && user?.id) {
          notifySlack("settlement_job_status_changed", { userId: user.id }, `${prevJob.title} · ${prevJob.status} → ${status}`);
        }
        return { error: null as string | null };
      } catch (err: any) {
        const message = err.message || "상태 변경에 실패했습니다.";
        setError(message);
        return { error: message };
      }
    } else {
      await enqueue(user!.id, {
        table: TABLE,
        type: "update",
        rowId: id,
        data: { status, is_paid: status === "paid", paid_at: paidAt },
      });
      track("settlement_job_status_changed", { status });
      return { error: null as string | null };
    }
  }, [isDemoMode, jobs, track, user, isOnline]);

  const reorderByStatus = useCallback(async (status: SettlementStatus, orderedIds: string[]) => {
    if (isDemoMode) return { demoBlocked: true, error: null as string | null };

    // Optimistic
    setJobs((prev) =>
      prev.map((job) => {
        const index = orderedIds.indexOf(job.id);
        if (index < 0) return job;
        return { ...job, sort_order: index, status };
      })
    );

    if (isOnline) {
      try {
        const updateMany = async (dbStatus: string) => {
          return Promise.all(
            orderedIds.map((id, index) =>
              supabase.from(TABLE).update({ sort_order: index, status: dbStatus as SettlementUpdate["status"] }).eq("id", id)
            )
          );
        };

        let results = await updateMany(status);
        let firstError = results.find((r) => !!r.error)?.error;
        if (firstError && isStatusConstraintError(firstError)) {
          const legacyStatus = toLegacyStatus(status);
          if (legacyStatus !== status) {
            results = await updateMany(legacyStatus);
            firstError = results.find((r) => !!r.error)?.error;
          }
        }
        if (firstError) throw firstError;
        track("settlement_jobs_reordered", { status, count: orderedIds.length });
        return { error: null as string | null };
      } catch (err: any) {
        const message = err.message || "정렬 저장에 실패했습니다.";
        setError(message);
        return { error: message };
      }
    } else {
      for (let i = 0; i < orderedIds.length; i++) {
        await enqueue(user!.id, {
          table: TABLE,
          type: "update",
          rowId: orderedIds[i],
          data: { sort_order: i, status },
        });
      }
      track("settlement_jobs_reordered", { status, count: orderedIds.length });
      return { error: null as string | null };
    }
  }, [isDemoMode, track, user, isOnline]);

  const duplicateNextMonth = useCallback(async (id: string) => {
    const source = jobs.find((job) => job.id === id);
    if (!source) return { error: "복제할 항목을 찾을 수 없습니다." };

    const shiftMonth = (dateISO: string | null | undefined) =>
      dateISO ? addMonthsISO(dateISO, 1) : null;

    const result = await addJob({
      title: source.title,
      unitPrice: source.unit_price,
      jobType: source.job_type,
      client: source.client,
      shootDate: shiftMonth(source.work_date),
      editDate: shiftMonth((source as any).edit_date),
      deliveryDate: shiftMonth(source.delivery_date),
      paymentDueDate: shiftMonth(source.payment_due_date),
      status: "before_work",
    });
    if (!(result as any)?.error && !(result as any)?.demoBlocked) {
      track("settlement_job_duplicated");
    }
    return result;
  }, [jobs, addJob, track]);

  const deleteJob = useCallback(async (id: string) => {
    if (isDemoMode) return { demoBlocked: true, error: null as string | null };

    setJobs((prev) => prev.filter((job) => job.id !== id));

    if (isOnline) {
      try {
        const { error } = await supabase.from(TABLE).delete().eq("id", id);
        if (error) throw error;
        track("settlement_job_deleted");
        return { error: null as string | null };
      } catch (err: any) {
        const message = err.message || "삭제에 실패했습니다.";
        setError(message);
        return { error: message };
      }
    } else {
      await enqueue(user!.id, {
        table: TABLE,
        type: "delete",
        rowId: id,
      });
      track("settlement_job_deleted");
      return { error: null as string | null };
    }
  }, [isDemoMode, track, user, isOnline]);

  useEffect(() => {
    if (isDemoMode) {
      setJobs(DEMO_SETTLEMENTS);
      setLoading(false);
      return;
    }
    if (!user) return;

    fetchJobs();

    if (!isOnline) return;

    const channel = supabase
      .channel("public:settlement_jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settlement_jobs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = normalizeJob(payload.new as SettlementJob);
            setJobs((prev) => (prev.some((job) => job.id === incoming.id) ? prev : [...prev, incoming]));
          } else if (payload.eventType === "UPDATE") {
            const incoming = normalizeJob(payload.new as SettlementJob);
            setJobs((prev) => prev.map((job) => (job.id === incoming.id ? incoming : job)));
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as SettlementJob;
            setJobs((prev) => prev.filter((job) => job.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode, user, fetchJobs, isOnline, syncVersion]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
    addJob,
    updateJob,
    moveStatus,
    reorderByStatus,
    duplicateNextMonth,
    deleteJob,
  };
}
