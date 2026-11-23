import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';

export function getTodayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getCurrentMonthKey(): string {
  return format(new Date(), 'yyyy-MM');
}

export function parseDateKey(dateKey: string): Date {
  // Handle both 'YYYY-MM-DD' and 'YYYY-MM'
  if (dateKey.length === 7) {
    return parseISO(`${dateKey}-01`);
  }
  return parseISO(dateKey);
}

export function toMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function getPrevDayKey(dateKey: string): string {
  return format(subDays(parseDateKey(dateKey), 1), 'yyyy-MM-dd');
}

export function getNextDayKey(dateKey: string): string {
  return format(addDays(parseDateKey(dateKey), 1), 'yyyy-MM-dd');
}

export function getPrevMonthKey(monthKey: string): string {
  return format(subMonths(parseDateKey(monthKey), 1), 'yyyy-MM');
}

export function getNextMonthKey(monthKey: string): string {
  return format(addMonths(parseDateKey(monthKey), 1), 'yyyy-MM');
}

export function getFutureMonthKeys(count: number, baseMonthKey?: string): string[] {
  const start = startOfMonth(baseMonthKey ? parseDateKey(baseMonthKey) : new Date());
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    keys.push(format(addMonths(start, i), 'yyyy-MM'));
  }
  return keys;
}

export interface MonthDayItem {
  date: Date;
  dateKey: string;
  dayNumber: number;
  weekdayShort: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  isToday: boolean;
}

export function getDaysInMonthList(monthKey: string): MonthDayItem[] {
  const base = parseDateKey(monthKey);
  const today = new Date();
  const days = eachDayOfInterval({
    start: startOfMonth(base),
    end: endOfMonth(base),
  });

  return days.map((date) => ({
    date,
    dateKey: format(date, 'yyyy-MM-dd'),
    dayNumber: date.getDate(),
    weekdayShort: format(date, 'EEE', { locale: ko }),
    dayOfWeek: date.getDay(),
    isToday: isSameDay(date, today),
  }));
}

export interface CalendarCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function getCalendarGrid(monthKey: string): CalendarCell[] {
  const base = parseDateKey(monthKey);
  const today = new Date();
  const start = startOfWeek(startOfMonth(base), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(base), { weekStartsOn: 0 });

  return eachDayOfInterval({ start, end }).map((date) => ({
    date,
    dateKey: format(date, 'yyyy-MM-dd'),
    dayNumber: date.getDate(),
    inCurrentMonth: isSameMonth(date, base),
    isToday: isSameDay(date, today),
  }));
}

export function formatDailyHeading(dateKey: string): string {
  return format(parseDateKey(dateKey), 'yyyy년 M월 d일', { locale: ko });
}

export function formatDailyWeekday(dateKey: string): string {
  return format(parseDateKey(dateKey), 'EEEE', { locale: ko });
}

export function formatDailyCompact(dateKey: string): string {
  return format(parseDateKey(dateKey), 'M월 d일 (EEE)', { locale: ko });
}

export function formatMonthHeading(monthKey: string): string {
  return format(parseDateKey(monthKey), 'yyyy년 M월', { locale: ko });
}

export function formatMonthShort(monthKey: string): string {
  return format(parseDateKey(monthKey), 'M월', { locale: ko });
}

export function getPastDayKeys(baseDateKey: string, count: number): string[] {
  const base = parseDateKey(baseDateKey);
  const keys: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    keys.push(format(subDays(base, i), 'yyyy-MM-dd'));
  }
  return keys;
}

export function formatMonthDay(dateKey: string): string {
  return format(parseDateKey(dateKey), 'M월 d일', { locale: ko });
}

export function isTodayKey(dateKey: string): boolean {
  return dateKey === getTodayKey();
}

export function isCurrentMonthKey(monthKey: string): boolean {
  return monthKey === getCurrentMonthKey();
}
