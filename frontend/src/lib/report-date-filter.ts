import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, isSameDay } from 'date-fns';

export const REPORT_DATE_FILTER_KEY = 'report_date_filter';

export type ReportDatePreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all_time';

export interface StoredReportDateFilter {
  from: string; // ISO
  to: string;
}

export function getStoredReportDateFilter(): { from: Date; to: Date } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REPORT_DATE_FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReportDateFilter;
    const from = parsed?.from ? new Date(parsed.from) : null;
    const to = parsed?.to ? new Date(parsed.to) : null;
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return null;
    return { from, to };
  } catch {
    return null;
  }
}

export function setStoredReportDateFilter(from: Date, to: Date): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REPORT_DATE_FILTER_KEY, JSON.stringify({
      from: from.toISOString(),
      to: to.toISOString(),
    } as StoredReportDateFilter));
  } catch {
    // ignore
  }
}

export function presetToRange(preset: string): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month':
      const last = subMonths(now, 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    case 'last_3_months':
      return { from: startOfMonth(subMonths(now, 3)), to: endOfMonth(now) };
    case 'this_year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'all_time':
      return { from: new Date(0), to: endOfMonth(now) };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export function rangeToPreset(from: Date, to: Date): ReportDatePreset {
  const now = new Date();
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const threeMonthsStart = startOfMonth(subMonths(now, 3));
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  if (isSameDay(fromDay, thisMonthStart) && isSameDay(toDay, thisMonthEnd)) return 'this_month';
  if (isSameDay(fromDay, lastMonthStart) && isSameDay(toDay, lastMonthEnd)) return 'last_month';
  if (fromDay.getTime() <= threeMonthsStart.getTime() && toDay.getTime() >= thisMonthEnd.getTime()) return 'last_3_months';
  if (isSameDay(fromDay, yearStart) && isSameDay(toDay, yearEnd)) return 'this_year';
  if (from.getTime() <= 0 || (to.getTime() - from.getTime()) > 400 * 24 * 60 * 60 * 1000) return 'all_time';

  if (fromDay.getTime() >= thisMonthStart.getTime() && toDay.getTime() <= thisMonthEnd.getTime()) return 'this_month';
  if (fromDay.getTime() >= lastMonthStart.getTime() && toDay.getTime() <= lastMonthEnd.getTime()) return 'last_month';
  if (fromDay.getTime() >= threeMonthsStart.getTime() && toDay.getTime() <= thisMonthEnd.getTime()) return 'last_3_months';
  if (fromDay.getTime() >= yearStart.getTime() && toDay.getTime() <= yearEnd.getTime()) return 'this_year';
  return 'all_time';
}
