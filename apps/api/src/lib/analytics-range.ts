export type AnalyticsRangeInput = {
  rangeDays: number;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function parseAnalyticsRange(query: {
  range?: string;
  from?: string;
  to?: string;
}): AnalyticsRangeInput {
  const now = new Date();
  const toRaw = String(query.to ?? "").trim();
  const fromRaw = String(query.from ?? "").trim();

  if (fromRaw && toRaw) {
    const start = startOfDay(new Date(fromRaw));
    const end = endOfDay(new Date(toRaw));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return parseAnalyticsRange({ range: "7" });
    }
    const ms = end.getTime() - start.getTime();
    const rangeDays = Math.max(1, Math.ceil(ms / 86400000) + 1);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (rangeDays - 1));
    return {
      rangeDays,
      start,
      end,
      prevStart: startOfDay(prevStart),
      prevEnd: endOfDay(prevEnd),
    };
  }

  const rangeDays =
    query.range === "90" ? 90 : query.range === "30" ? 30 : 7;
  const end = endOfDay(now);
  const start = startOfDay(now);
  start.setDate(start.getDate() - (rangeDays - 1));
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = startOfDay(prevEnd);
  prevStart.setDate(prevStart.getDate() - (rangeDays - 1));

  return {
    rangeDays,
    start,
    end,
    prevStart,
    prevEnd: endOfDay(prevEnd),
  };
}
