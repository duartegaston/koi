export type AdminPeriodKey = "today" | "week" | "month" | "custom";

export type AdminPeriod = {
  key: AdminPeriodKey;
  fromDate: string;
  toDate: string;
  collectedLabel: string;
  ordersLabel: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function resolveAdminPeriod(input: { range?: string; from?: string; to?: string }): {
  period: AdminPeriod;
  error?: string;
} {
  const today = calendarDateInBuenosAires();
  if (input.from || input.to) {
    if (!input.from || !input.to || !isRealDate(input.from) || !isRealDate(input.to)) {
      return { period: presetPeriod("today", today), error: "Elegí una fecha desde y una fecha hasta." };
    }
    if (input.from > input.to) {
      return { period: presetPeriod("today", today), error: "La fecha desde tiene que ser anterior a la fecha hasta." };
    }
    if (daysBetween(input.from, input.to) > 365) {
      return { period: presetPeriod("today", today), error: "El período puede cubrir hasta un año." };
    }
    return { period: customPeriod(input.from, input.to) };
  }
  if (input.range === "week" || input.range === "month") {
    return { period: presetPeriod(input.range, today) };
  }
  return { period: presetPeriod("today", today) };
}

function presetPeriod(key: "today" | "week" | "month", today: string): AdminPeriod {
  const fromDate = key === "today" ? today : key === "week" ? addCalendarDays(today, -6) : addCalendarDays(today, -29);
  if (key === "today") {
    return { key, fromDate, toDate: today, collectedLabel: "Cobrado hoy", ordersLabel: "Pedidos de hoy" };
  }
  if (key === "week") {
    return {
      key,
      fromDate,
      toDate: today,
      collectedLabel: "Cobrado, últimos 7 días",
      ordersLabel: "Pedidos, últimos 7 días",
    };
  }
  return {
    key,
    fromDate,
    toDate: today,
    collectedLabel: "Cobrado, últimos 30 días",
    ordersLabel: "Pedidos, últimos 30 días",
  };
}

function customPeriod(fromDate: string, toDate: string): AdminPeriod {
  const span = `${formatDay(fromDate)} – ${formatDay(toDate)}`;
  return {
    key: "custom",
    fromDate,
    toDate,
    collectedLabel: `Cobrado, ${span}`,
    ordersLabel: `Pedidos, ${span}`,
  };
}

function calendarDateInBuenosAires(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function isRealDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return date.getUTCFullYear() === year && date.getUTCMonth() === (month ?? 1) - 1 && date.getUTCDate() === day;
}

function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)));
}
