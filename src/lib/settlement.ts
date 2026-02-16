export interface QuickSettlementInput {
  title: string;
  unitPrice: number;
  workDate: string;
  deliveryDate: string;
  paymentDueDate: string;
  client?: string;
}

const DATE_WORDS: Record<string, number> = {
  "오늘": 0,
  "내일": 1,
  "모레": 2,
};

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parsePriceToken(input: string): number | null {
  const normalized = input.replace(/,/g, "").trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(만|천|원)?/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const unit = match[2] ?? "";
  if (unit === "만") return Math.round(base * 10000);
  if (unit === "천") return Math.round(base * 1000);
  return Math.round(base);
}

export function parseDateToken(token: string, baseDate = new Date()): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (DATE_WORDS[trimmed] !== undefined) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + DATE_WORDS[trimmed]);
    return toISODate(next);
  }

  const normalized = trimmed.replace(/\./g, "-").replace(/\//g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [y, m, d] = normalized.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return null;
    return toISODate(date);
  }

  if (/^\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [m, d] = normalized.split("-").map(Number);
    const date = new Date(baseDate.getFullYear(), m - 1, d);
    if (Number.isNaN(date.getTime())) return null;
    return toISODate(date);
  }

  return null;
}

export function addMonthsISO(dateISO: string, months: number): string {
  const base = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(base.getTime())) return dateISO;
  const originalDay = base.getDate();
  const result = new Date(base);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, maxDay));
  return toISODate(result);
}

export function getNextMonthEnd(dateISO: string): string {
  const base = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return toISODate(new Date());
  }
  const monthEnd = new Date(base.getFullYear(), base.getMonth() + 2, 0);
  return toISODate(monthEnd);
}

export function parseQuickSettlementEntry(input: string, now = new Date()): QuickSettlementInput | null {
  const tokens = input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 0) return null;

  let title = tokens[0] ?? "";
  let unitPrice: number | null = null;
  let workDate: string | null = null;
  let deliveryDate: string | null = null;
  let paymentDueDate: string | null = null;
  let client: string | undefined;

  tokens.forEach((token, index) => {
    if (index === 0) return;
    const lower = token.toLowerCase();

    if (lower.startsWith("거래처:") || lower.startsWith("client:")) {
      client = token.split(":").slice(1).join(":").trim() || undefined;
      return;
    }

    if (lower.startsWith("납품")) {
      const parsed = parseDateToken(token.replace(/납품(일)?[:\s]*/g, ""), now);
      if (parsed) deliveryDate = parsed;
      return;
    }

    if (lower.startsWith("수금")) {
      const parsed = parseDateToken(token.replace(/수금(예정일)?[:\s]*/g, ""), now);
      if (parsed) paymentDueDate = parsed;
      return;
    }

    const parsedPrice = parsePriceToken(token);
    if (parsedPrice !== null) {
      unitPrice = parsedPrice;
      return;
    }

    const parsedDate = parseDateToken(token, now);
    if (parsedDate) {
      if (!workDate) {
        workDate = parsedDate;
      } else if (!deliveryDate) {
        deliveryDate = parsedDate;
      } else if (!paymentDueDate) {
        paymentDueDate = parsedDate;
      }
      return;
    }

    if (!client && token.length > 0 && token.length <= 24) {
      client = token;
    }
  });

  if (!title) return null;
  if (!unitPrice || unitPrice <= 0) unitPrice = null;
  if (!workDate) workDate = toISODate(now);
  if (!deliveryDate) deliveryDate = workDate;
  if (!paymentDueDate) paymentDueDate = getNextMonthEnd(deliveryDate);

  if (!unitPrice) return null;

  return {
    title,
    unitPrice,
    workDate,
    deliveryDate,
    paymentDueDate,
    client,
  };
}

export function formatKRW(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function dateToMonthKey(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

export function getMonthRange(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return {
    start,
    end,
    startISO: toISODate(start),
    endISO: toISODate(end),
  };
}

export function isISODateInRange(dateISO: string | null | undefined, start: Date, end: Date): boolean {
  if (!dateISO) return false;
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
}

export function formatMonthLabel(monthDate: Date): string {
  const y = monthDate.getFullYear();
  const m = `${monthDate.getMonth() + 1}`.padStart(2, "0");
  return `${y}.${m}`;
}
