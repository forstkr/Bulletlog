import { ArrowRight, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { JournalEntry } from '../types/journal';
import { formatMonthDay, getPastDayKeys } from '../utils/date';
import { BulletGlyph } from './BulletGlyph';

interface MorningReviewBannerProps {
  todayDateKey: string;
  entries: JournalEntry[];
  onMigrateOne: (entry: JournalEntry) => Promise<void>;
  onMigrateAll: (items: JournalEntry[]) => Promise<void>;
  onDeleteOne: (entry: JournalEntry) => Promise<void>;
}

export function MorningReviewBanner({
  todayDateKey,
  entries,
  onMigrateOne,
  onMigrateAll,
  onDeleteOne,
}: MorningReviewBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isMigratingAll, setIsMigratingAll] = useState(false);

  const pendingReview = useMemo(() => {
    const pastKeys = getPastDayKeys(todayDateKey, 7);

    for (const dayKey of pastKeys) {
      const openTasks = entries
        .filter(
          (e) =>
            e.scope === 'daily' &&
            e.dateKey === dayKey &&
            e.type === 'task' &&
            e.status === 'open'
        )
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);

      if (openTasks.length > 0) {
        return {
          sourceDateKey: dayKey,
          tasks: openTasks,
        };
      }
    }

    return null;
  }, [entries, todayDateKey]);

  if (!pendingReview) {
    return null;
  }

  const { sourceDateKey, tasks } = pendingReview;
  const dateLabel = formatMonthDay(sourceDateKey);

  const handleMigrateOne = async (entry: JournalEntry) => {
    if (busyId || isMigratingAll) return;
    setBusyId(entry.id);
    try {
      await onMigrateOne(entry);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteOne = async (entry: JournalEntry) => {
    if (busyId || isMigratingAll) return;
    setBusyId(entry.id);
    try {
      await onDeleteOne(entry);
    } finally {
      setBusyId(null);
    }
  };

  const handleMigrateAll = async () => {
    if (isMigratingAll || busyId) return;
    setIsMigratingAll(true);
    try {
      await onMigrateAll(tasks);
      setExpanded(false);
    } finally {
      setIsMigratingAll(false);
    }
  };

  return (
    <section
      aria-label="이전 미완료 할 일 확인"
      className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50/70 overflow-hidden transition-colors"
    >
      {/* 1-Line Minimal Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
        <p className="text-xs sm:text-[13px] text-zinc-700 tabular-nums">
          이전 미완료 할 일{' '}
          <strong className="font-semibold text-zinc-900">
            {tasks.length}개
          </strong>{' '}
          <span className="text-zinc-400">({dateLabel})</span>
        </p>

        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-h-[34px] md:min-h-[28px] px-2.5 py-1 rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
          >
            확인하기
          </button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleMigrateAll()}
              disabled={isMigratingAll || Boolean(busyId)}
              className="min-h-[34px] md:min-h-[28px] px-2.5 py-1 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {isMigratingAll ? '이동 중...' : '모두 오늘로 가져오기'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="min-h-[34px] md:min-h-[28px] px-2.5 py-1 rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {/* Expandable Pending Tasks List */}
      {expanded && (
        <div className="border-t border-zinc-200/80 bg-white divide-y divide-zinc-100">
          {tasks.map((task) => {
            const isItemBusy = busyId === task.id || isMigratingAll;
            return (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 px-3 py-2.5"
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <BulletGlyph type="task" status="open" />
                  <span
                    className={`text-[15px] leading-6 break-words ${
                      task.priority
                        ? 'font-medium text-neutral-950'
                        : 'text-zinc-800'
                    }`}
                  >
                    {task.priority && (
                      <span className="text-amber-600 font-semibold mr-1">
                        *
                      </span>
                    )}
                    {task.content}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 shrink-0 pl-9 sm:pl-2">
                  <button
                    type="button"
                    disabled={isItemBusy}
                    onClick={() => void handleMigrateOne(task)}
                    className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[28px] px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 text-xs font-medium text-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <span>오늘로 (&gt;)</span>
                    <ArrowRight className="w-3 h-3 hidden sm:inline" />
                  </button>
                  <button
                    type="button"
                    disabled={isItemBusy}
                    onClick={() => void handleDeleteOne(task)}
                    className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[28px] px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-medium text-zinc-500 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
