import {
  ArrowUpRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useListReorder } from '../../hooks/useListReorder';
import type {
  BulletType,
  JournalEntry,
  LogScope,
  NavigationTarget,
} from '../../types/journal';
import {
  formatDailyHeading,
  formatDailyWeekday,
  formatMonthShort,
  getNextDayKey,
  getPrevDayKey,
  getTodayKey,
  isTodayKey,
  toMonthKey,
} from '../../utils/date';
import { EntryRow } from '../EntryRow';
import { MiniDatePicker } from '../MiniDatePicker';
import { MorningReviewBanner } from '../MorningReviewBanner';
import { RapidInput } from '../RapidInput';

interface DailyLogViewProps {
  dateKey: string;
  entries: JournalEntry[];
  highlightId?: string | null;
  onChangeDate: (nextDateKey: string) => void;
  onCreateEntry: (
    scope: LogScope,
    dateKey: string,
    type: BulletType,
    rawText: string,
    priority?: boolean,
    indent?: 0 | 1
  ) => Promise<void>;
  onToggleTask: (entry: JournalEntry) => Promise<void>;
  onTogglePriority: (entry: JournalEntry) => Promise<void>;
  onSetIndent: (entry: JournalEntry, indent: 0 | 1) => Promise<void>;
  onToggleCancelled: (entry: JournalEntry) => Promise<void>;
  onUpdateText: (entry: JournalEntry, rawText: string) => Promise<void>;
  onMigrate: (
    entry: JournalEntry,
    targetScope: LogScope,
    targetDateKey: string
  ) => Promise<void>;
  onMigrateMultiple: (
    items: JournalEntry[],
    targetScope: LogScope,
    targetDateKey: string
  ) => Promise<void>;
  onSchedule: (entry: JournalEntry, futureMonthKey: string) => Promise<void>;
  onDelete: (entry: JournalEntry) => Promise<void>;
  onReorder: (orderedEntries: JournalEntry[]) => Promise<void>;
  onNavigate: (target: NavigationTarget) => void;
}

export function DailyLogView({
  dateKey,
  entries,
  highlightId,
  onChangeDate,
  onCreateEntry,
  onToggleTask,
  onTogglePriority,
  onSetIndent,
  onToggleCancelled,
  onUpdateText,
  onMigrate,
  onMigrateMultiple,
  onSchedule,
  onDelete,
  onReorder,
  onNavigate,
}: DailyLogViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.scope === 'daily' && e.dateKey === dateKey)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    [entries, dateKey]
  );

  const { moveItem, getDragProps } = useListReorder(dayEntries, onReorder);

  const datesWithEntries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.scope === 'daily') set.add(e.dateKey);
    });
    return set;
  }, [entries]);

  const openTaskCount = useMemo(
    () =>
      dayEntries.filter((e) => e.type === 'task' && e.status === 'open').length,
    [dayEntries]
  );

  const monthKey = toMonthKey(dateKey);
  const isToday = isTodayKey(dateKey);

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 md:px-10 md:py-12">
      {/* Date Navigation Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeDate(getPrevDayKey(dateKey))}
              aria-label="이전 날"
              className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDate(getNextDayKey(dateKey))}
              aria-label="다음 날"
              className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => onChangeDate(getTodayKey())}
                className="ml-1 min-h-[40px] md:min-h-[32px] px-3 py-1 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap"
              >
                오늘
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate({ view: 'monthly', dateKey: monthKey })}
            className="inline-flex items-center gap-1 min-h-[40px] md:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors whitespace-nowrap"
          >
            <span>{formatMonthShort(monthKey)} 먼슬리</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clickable Date Heading + Mini Date Picker */}
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setPickerOpen((prev) => !prev)}
            aria-expanded={pickerOpen}
            aria-label="달력에서 날짜 선택"
            className="group flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-left rounded-lg -mx-2 px-2 py-1 hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          >
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
              {formatDailyHeading(dateKey)}
            </h1>
            <span className="text-base md:text-lg font-normal text-zinc-400">
              {formatDailyWeekday(dateKey)}
            </span>
            {isToday && (
              <span className="text-xs font-medium text-zinc-500">· 오늘</span>
            )}
            <CalendarIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors self-center ml-0.5" />
          </button>

          {pickerOpen && (
            <MiniDatePicker
              selectedDateKey={dateKey}
              datesWithEntries={datesWithEntries}
              onSelect={onChangeDate}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        {dayEntries.length > 0 && (
          <div className="mt-2 text-xs text-zinc-400 tabular-nums">
            전체 {dayEntries.length}건
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            미완료 할 일 {openTaskCount}건
          </div>
        )}
      </header>

      {/* Morning Routine Banner — only when viewing today */}
      {isToday && (
        <MorningReviewBanner
          todayDateKey={dateKey}
          entries={entries}
          onMigrateOne={(entry) => onMigrate(entry, 'daily', dateKey)}
          onMigrateAll={(items) => onMigrateMultiple(items, 'daily', dateKey)}
          onDeleteOne={onDelete}
        />
      )}

      {/* Top Rapid Input — stays visible above mobile virtual keyboard */}
      <section className="mb-8" aria-label="빠른 입력">
        <RapidInput
          showHints
          onSubmit={(type, rawText, priority, indent) =>
            onCreateEntry('daily', dateKey, type, rawText, priority, indent)
          }
        />
      </section>

      {/* Entries List or Clean Empty State */}
      <section aria-label="데일리 기록 목록">
        {dayEntries.length === 0 ? (
          <div className="py-14 px-4 text-center border-t border-zinc-100">
            <p className="text-sm font-medium text-zinc-600">
              이 날짜에는 아직 기록이 없습니다.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              <code className="font-mono text-zinc-500">. </code>할 일,{' '}
              <code className="font-mono text-zinc-500">* </code>중요 할 일,{' '}
              <code className="font-mono text-zinc-500">o 14:30 </code>일정,{' '}
              <code className="font-mono text-zinc-500">- </code>메모 형식으로
              빠르게 적어 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {dayEntries.map((entry, index) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                allEntries={entries}
                highlighted={highlightId === entry.id}
                onToggleTask={onToggleTask}
                onTogglePriority={onTogglePriority}
                onSetIndent={onSetIndent}
                onToggleCancelled={onToggleCancelled}
                onUpdateText={onUpdateText}
                onMigrate={onMigrate}
                onSchedule={onSchedule}
                onDelete={onDelete}
                onNavigate={onNavigate}
                canMoveUp={index > 0}
                canMoveDown={index < dayEntries.length - 1}
                onMoveUp={() => moveItem(index, 'up')}
                onMoveDown={() => moveItem(index, 'down')}
                dragProps={getDragProps(entry)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
