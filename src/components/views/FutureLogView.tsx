import { ArrowUpRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  BulletType,
  JournalEntry,
  LogScope,
  NavigationTarget,
} from '../../types/journal';
import {
  formatMonthHeading,
  getCurrentMonthKey,
  getFutureMonthKeys,
} from '../../utils/date';
import { EntryRow } from '../EntryRow';
import { RapidInput } from '../RapidInput';

interface FutureLogViewProps {
  entries: JournalEntry[];
  focusMonthKey?: string;
  highlightId?: string | null;
  onCreateEntry: (
    scope: LogScope,
    dateKey: string,
    type: BulletType,
    rawText: string,
    priority?: boolean
  ) => Promise<void>;
  onToggleTask: (entry: JournalEntry) => Promise<void>;
  onTogglePriority: (entry: JournalEntry) => Promise<void>;
  onUpdateText: (entry: JournalEntry, rawText: string) => Promise<void>;
  onMigrate: (
    entry: JournalEntry,
    targetScope: LogScope,
    targetDateKey: string
  ) => Promise<void>;
  onSchedule: (entry: JournalEntry, futureMonthKey: string) => Promise<void>;
  onDelete: (entry: JournalEntry) => Promise<void>;
  onNavigate: (target: NavigationTarget) => void;
}

export function FutureLogView({
  entries,
  focusMonthKey,
  highlightId,
  onCreateEntry,
  onToggleTask,
  onTogglePriority,
  onUpdateText,
  onMigrate,
  onSchedule,
  onDelete,
  onNavigate,
}: FutureLogViewProps) {
  const [monthSpan, setMonthSpan] = useState<6 | 12>(6);
  const currentMonthKey = getCurrentMonthKey();

  const monthKeys = useMemo(() => {
    const baseKeys = getFutureMonthKeys(monthSpan, currentMonthKey);
    const set = new Set(baseKeys);
    if (focusMonthKey && !set.has(focusMonthKey)) {
      baseKeys.push(focusMonthKey);
      baseKeys.sort();
    }
    return baseKeys;
  }, [monthSpan, currentMonthKey, focusMonthKey]);

  const entriesByMonth = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    entries
      .filter((e) => e.scope === 'future')
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      .forEach((entry) => {
        const list = map.get(entry.dateKey) ?? [];
        list.push(entry);
        map.set(entry.dateKey, list);
      });
    return map;
  }, [entries]);

  useEffect(() => {
    if (!focusMonthKey) return;
    const el = document.getElementById(`future-month-${focusMonthKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusMonthKey]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 md:px-10 md:py-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            퓨처 로그
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            다가오는 달의 일정과 목표를 미리 적어두고, 해당 월이 되면 먼슬리 로그로 옮깁니다(&gt;).
          </p>
        </div>

        <div
          className="inline-flex items-center p-1 rounded-lg bg-zinc-100 self-start sm:self-auto shrink-0"
          role="group"
          aria-label="표시 개월 수"
        >
          <button
            type="button"
            onClick={() => setMonthSpan(6)}
            className={`min-h-[36px] px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              monthSpan === 6
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            6개월
          </button>
          <button
            type="button"
            onClick={() => setMonthSpan(12)}
            className={`min-h-[36px] px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              monthSpan === 12
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            12개월
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {monthKeys.map((monthKey) => {
          const monthEntries = entriesByMonth.get(monthKey) ?? [];
          const isCurrent = monthKey === currentMonthKey;

          return (
            <section
              key={monthKey}
              id={`future-month-${monthKey}`}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-100">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-semibold text-zinc-900 tabular-nums">
                    {formatMonthHeading(monthKey)}
                  </h2>
                  {isCurrent && (
                    <span className="text-xs text-zinc-400">이번 달</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onNavigate({ view: 'monthly', dateKey: monthKey })
                  }
                  className="inline-flex items-center gap-1 min-h-[36px] px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors whitespace-nowrap"
                >
                  <span>먼슬리</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-[64px]">
                {monthEntries.length === 0 ? (
                  <p className="py-4 text-xs text-zinc-400">
                    예정된 항목이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-0.5 mb-3">
                    {monthEntries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        allEntries={entries}
                        highlighted={highlightId === entry.id}
                        onToggleTask={onToggleTask}
                        onTogglePriority={onTogglePriority}
                        onUpdateText={onUpdateText}
                        onMigrate={onMigrate}
                        onSchedule={onSchedule}
                        onDelete={onDelete}
                        onNavigate={onNavigate}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 mt-auto">
                <RapidInput
                  compact
                  placeholder={`${formatMonthHeading(monthKey)} 항목 추가...`}
                  onSubmit={(type, rawText, priority) =>
                    onCreateEntry('future', monthKey, type, rawText, priority)
                  }
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
