import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useListReorder } from '../../hooks/useListReorder';
import type {
  BulletType,
  JournalEntry,
  LogScope,
  NavigationTarget,
} from '../../types/journal';
import {
  formatMonthHeading,
  getCurrentMonthKey,
  getDaysInMonthList,
  getNextMonthKey,
  getPrevMonthKey,
  isCurrentMonthKey,
  toMonthKey,
} from '../../utils/date';
import { EntryRow } from '../EntryRow';
import { RapidInput } from '../RapidInput';

interface MonthlyLogViewProps {
  monthKey: string;
  entries: JournalEntry[];
  highlightId?: string | null;
  onChangeMonth: (nextMonthKey: string) => void;
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
  onSchedule: (entry: JournalEntry, futureMonthKey: string) => Promise<void>;
  onDelete: (entry: JournalEntry) => Promise<void>;
  onReorder: (orderedEntries: JournalEntry[]) => Promise<void>;
  onNavigate: (target: NavigationTarget) => void;
}

type MobileTab = 'calendar' | 'tasks';

export function MonthlyLogView({
  monthKey,
  entries,
  highlightId,
  onChangeMonth,
  onCreateEntry,
  onToggleTask,
  onTogglePriority,
  onSetIndent,
  onToggleCancelled,
  onUpdateText,
  onMigrate,
  onSchedule,
  onDelete,
  onReorder,
  onNavigate,
}: MonthlyLogViewProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('calendar');
  const days = useMemo(() => getDaysInMonthList(monthKey), [monthKey]);

  // All daily events in this month grouped by 'YYYY-MM-DD'
  const dailyEventsByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    entries
      .filter(
        (e) =>
          e.scope === 'daily' &&
          e.type === 'event' &&
          toMonthKey(e.dateKey) === monthKey
      )
      .sort((a, b) => {
        if (a.eventTime && b.eventTime) {
          return a.eventTime.localeCompare(b.eventTime);
        }
        if (a.eventTime && !b.eventTime) return -1;
        if (!a.eventTime && b.eventTime) return 1;
        return a.order - b.order;
      })
      .forEach((event) => {
        const list = map.get(event.dateKey) ?? [];
        list.push(event);
        map.set(event.dateKey, list);
      });
    return map;
  }, [entries, monthKey]);

  // Monthly-scoped events (without specific day) so all event(○) items are shown in timeline
  const monthlyEvents = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.scope === 'monthly' &&
            e.type === 'event' &&
            e.dateKey === monthKey
        )
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    [entries, monthKey]
  );

  // Monthly-scoped entries for the right column (tasks, notes, and any monthly items)
  const monthlyTaskEntries = useMemo(
    () =>
      entries
        .filter((e) => e.scope === 'monthly' && e.dateKey === monthKey)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    [entries, monthKey]
  );

  const { moveItem, getDragProps } = useListReorder(
    monthlyTaskEntries,
    onReorder
  );

  const totalMonthEventsCount = useMemo(() => {
    let count = monthlyEvents.length;
    dailyEventsByDate.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [dailyEventsByDate, monthlyEvents]);

  const openMonthlyTasksCount = useMemo(
    () =>
      monthlyTaskEntries.filter(
        (e) => e.type === 'task' && e.status === 'open'
      ).length,
    [monthlyTaskEntries]
  );

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 md:px-10 md:py-12">
      {/* Month navigation header */}
      <header className="mb-6 md:mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeMonth(getPrevMonthKey(monthKey))}
            aria-label="이전 달"
            className="flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h1 className="px-2 text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums whitespace-nowrap">
            {formatMonthHeading(monthKey)}
          </h1>

          <button
            type="button"
            onClick={() => onChangeMonth(getNextMonthKey(monthKey))}
            aria-label="다음 달"
            className="flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {!isCurrentMonthKey(monthKey) && (
            <button
              type="button"
              onClick={() => onChangeMonth(getCurrentMonthKey())}
              className="min-h-[40px] md:min-h-[34px] px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 font-medium hover:bg-zinc-50 transition-colors whitespace-nowrap"
            >
              이번 달
            </button>
          )}
          <span className="hidden sm:inline tabular-nums">
            일정 {totalMonthEventsCount} · 월간 미완료 {openMonthlyTasksCount}
          </span>
        </div>
      </header>

      {/* Mobile tab switcher (일정 | 할 일) */}
      <div
        className="md:hidden grid grid-cols-2 p-1 mb-6 rounded-lg bg-zinc-100"
        role="tablist"
        aria-label="먼슬리 로그 보기 전환"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'calendar'}
          onClick={() => setMobileTab('calendar')}
          className={`min-h-[40px] rounded-md text-sm font-medium transition-colors tabular-nums ${
            mobileTab === 'calendar'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-500'
          }`}
        >
          일정 ({totalMonthEventsCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'tasks'}
          onClick={() => setMobileTab('tasks')}
          className={`min-h-[40px] rounded-md text-sm font-medium transition-colors tabular-nums ${
            mobileTab === 'tasks'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-500'
          }`}
        >
          할 일 ({monthlyTaskEntries.length})
        </button>
      </div>

      {/* Desktop 2-column layout / Mobile single active tab */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-10 lg:gap-12 items-start">
        {/* Left: Monthly Event Timeline (1st ~ Last day) */}
        <section
          className={mobileTab === 'calendar' ? 'block' : 'hidden md:block'}
          aria-label="월간 일정 타임라인"
        >
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">일정 타임라인</h2>
            <span className="text-xs text-zinc-400">날짜 클릭 시 데일리로 이동</span>
          </div>

          {monthlyEvents.length > 0 && (
            <div className="mb-3 rounded-lg bg-zinc-50 border border-zinc-200/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-zinc-400 mb-1.5">
                날짜 미지정 월간 일정
              </div>
              <ul className="space-y-1">
                {monthlyEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start gap-2 text-sm leading-5 text-zinc-800"
                  >
                    <span className="w-4 h-5 flex items-center justify-center shrink-0">
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full border-[1.5px] border-neutral-700"
                      />
                    </span>
                    {ev.eventTime && (
                      <span className="font-mono tabular-nums text-xs leading-5 text-zinc-500 shrink-0">
                        {ev.eventTime}
                      </span>
                    )}
                    <span className="break-words">{ev.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="divide-y divide-zinc-100">
            {days.map((day) => {
              const dayEvents = dailyEventsByDate.get(day.dateKey) ?? [];
              const isSunday = day.dayOfWeek === 0;
              const isSaturday = day.dayOfWeek === 6;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() =>
                    onNavigate({ view: 'daily', dateKey: day.dateKey })
                  }
                  className={`w-full flex items-start gap-3 min-h-[42px] md:min-h-[34px] px-2 py-2 md:py-1.5 text-left rounded-md transition-colors hover:bg-zinc-50 active:bg-zinc-100 ${
                    day.isToday ? 'bg-zinc-100/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 w-14 shrink-0 h-5 tabular-nums">
                    <span
                      className={`font-mono text-xs w-5 text-right ${
                        day.isToday
                          ? 'font-bold text-zinc-900'
                          : isSunday
                            ? 'text-red-500'
                            : isSaturday
                              ? 'text-zinc-500'
                              : 'text-zinc-500'
                      }`}
                    >
                      {String(day.dayNumber).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-xs ${
                        day.isToday
                          ? 'font-semibold text-zinc-900'
                          : isSunday
                            ? 'text-red-400'
                            : isSaturday
                              ? 'text-zinc-400'
                              : 'text-zinc-400'
                      }`}
                    >
                      {day.weekdayShort}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {dayEvents.length > 0 ? (
                      <div className="space-y-1">
                        {dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-start gap-1.5 text-sm leading-5 text-zinc-800"
                          >
                            <span className="w-4 h-5 flex items-center justify-center shrink-0">
                              <span
                                aria-hidden="true"
                                className="w-2.5 h-2.5 rounded-full border-[1.5px] border-neutral-700"
                              />
                            </span>
                            {ev.eventTime && (
                              <span className="font-mono tabular-nums text-xs leading-5 text-zinc-500 shrink-0">
                                {ev.eventTime}
                              </span>
                            )}
                            <span className="truncate">{ev.content}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="sr-only">일정 없음</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: Monthly Tasks & Notes */}
        <section
          className={mobileTab === 'tasks' ? 'block' : 'hidden md:block'}
          aria-label="월간 할 일"
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">월간 할 일</h2>
            <span className="text-xs text-zinc-400 tabular-nums">
              미완료 {openMonthlyTasksCount}건
            </span>
          </div>

          <div className="mb-5">
            <RapidInput
              showHints
              placeholder="이번 달 할 일 또는 메모 입력..."
              onSubmit={(type, rawText, priority, indent) =>
                onCreateEntry('monthly', monthKey, type, rawText, priority, indent)
              }
            />
          </div>

          {monthlyTaskEntries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-400">
                이번 달 월간 할 일이 아직 없습니다.
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                위 입력창에서 이번 달 목표나 메모를 빠르게 기록해 보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {monthlyTaskEntries.map((entry, index) => (
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
                  canMoveDown={index < monthlyTaskEntries.length - 1}
                  onMoveUp={() => moveItem(index, 'up')}
                  onMoveDown={() => moveItem(index, 'down')}
                  dragProps={getDragProps(entry)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
