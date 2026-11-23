import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Strikethrough,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { JournalEntry, LogScope } from '../types/journal';
import {
  formatDailyCompact,
  formatMonthHeading,
  formatMonthShort,
  getFutureMonthKeys,
  getNextMonthKey,
} from '../utils/date';
import { BulletGlyph } from './BulletGlyph';

interface MonthlyMigrationModalProps {
  isOpen: boolean;
  monthKey: string;
  tasks: JournalEntry[];
  onClose: () => void;
  onMigrate: (
    entry: JournalEntry,
    targetScope: LogScope,
    targetDateKey: string
  ) => Promise<void>;
  onSchedule: (entry: JournalEntry, futureMonthKey: string) => Promise<void>;
  onToggleCancelled: (entry: JournalEntry) => Promise<void>;
  onDelete: (entry: JournalEntry) => Promise<void>;
}

export function MonthlyMigrationModal({
  isOpen,
  monthKey,
  tasks,
  onClose,
  onMigrate,
  onSchedule,
  onToggleCancelled,
  onDelete,
}: MonthlyMigrationModalProps) {
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const nextMonthKey = useMemo(() => getNextMonthKey(monthKey), [monthKey]);

  // Future months: +2 through +6 months from the current viewed month
  const futureMonthChoices = useMemo(() => {
    const startMonth = getNextMonthKey(nextMonthKey);
    return getFutureMonthKeys(5, startMonth);
  }, [nextMonthKey]);

  useEffect(() => {
    if (!isOpen) {
      setSchedulingId(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (schedulingId) {
          setSchedulingId(null);
        } else {
          onClose();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, schedulingId]);

  if (!isOpen) return null;

  const runAction = async (id: string, action: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await action();
      setSchedulingId((prev) => (prev === id ? null : prev));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="monthly-migration-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-40 bg-zinc-950/30 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6"
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 overflow-hidden">
        {/* Fixed Header */}
        <header className="shrink-0 border-b border-zinc-200 bg-white px-5 pt-5 pb-4 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="monthly-migration-title"
                  className="text-lg font-semibold tracking-tight text-zinc-900 tabular-nums"
                >
                  {formatMonthHeading(monthKey)} 월말 정리
                </h2>
                {tasks.length > 0 && (
                  <span className="font-mono tabular-nums text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200/80 rounded-md px-2 py-0.5">
                    남은 할 일 {tasks.length}개
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-zinc-500">
                이번 달에 끝내지 못한 일들입니다. 각 항목마다 &lsquo;이 일이 정말 내
                시간과 에너지를 쓸 가치가 있나요?&rsquo; 스스로 물어보고 결정해
                보세요.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="월말 정리 닫기"
              className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {tasks.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center mb-4 text-zinc-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-zinc-900 leading-relaxed max-w-sm">
                이번 달 미완료 할 일을 모두 정리했습니다! 홀가분하게 새 달을
                시작해 보세요.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 min-h-[40px] md:min-h-[36px] px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
              >
                닫기
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task) => {
                const isItemBusy = busyId === task.id;
                const isScheduling = schedulingId === task.id;
                const sourceLabel =
                  task.scope === 'monthly'
                    ? `${formatMonthShort(monthKey)} 월간`
                    : formatDailyCompact(task.dateKey);

                return (
                  <li
                    key={task.id}
                    className="rounded-xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 transition-colors"
                  >
                    {/* Task Title & Source Meta */}
                    <div className="flex items-start gap-2">
                      <BulletGlyph type="task" status="open" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span
                            className={`text-[15px] leading-6 break-words ${
                              task.priority
                                ? 'font-medium text-neutral-950'
                                : 'text-zinc-900'
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
                        <div className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                          {sourceLabel}
                        </div>
                      </div>
                    </div>

                    {/* 4 Decision Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isItemBusy}
                        onClick={() =>
                          void runAction(task.id, () =>
                            onMigrate(task, 'monthly', nextMonthKey)
                          )
                        }
                        title={`${formatMonthHeading(nextMonthKey)} 먼슬리 로그로 옮기기`}
                        className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 text-xs font-medium text-zinc-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        <span>다음 달로 (&gt;)</span>
                        <ArrowRight className="w-3 h-3 hidden sm:inline" />
                      </button>

                      <button
                        type="button"
                        disabled={isItemBusy}
                        onClick={() =>
                          setSchedulingId((prev) =>
                            prev === task.id ? null : task.id
                          )
                        }
                        aria-expanded={isScheduling}
                        className={`inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border text-xs font-medium disabled:opacity-50 transition-colors whitespace-nowrap ${
                          isScheduling
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                      >
                        <CalendarClock className="w-3 h-3" />
                        <span>퓨처 로그 (&lt;)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isItemBusy}
                        onClick={() =>
                          void runAction(task.id, () => onToggleCancelled(task))
                        }
                        className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        <Strikethrough className="w-3 h-3" />
                        <span>안 함 (취소선)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isItemBusy}
                        onClick={() =>
                          void runAction(task.id, () => onDelete(task))
                        }
                        className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors whitespace-nowrap ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>삭제</span>
                      </button>
                    </div>

                    {/* Inline Future Log Month Picker (+2 ~ +6 months) */}
                    {isScheduling && (
                      <div className="mt-2.5 rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-2.5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-medium text-zinc-600">
                            어느 달 퓨처 로그로 보낼까요? (2~6개월 뒤)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSchedulingId(null)}
                            aria-label="월 선택 닫기"
                            className="flex items-center justify-center w-6 h-6 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                          {futureMonthChoices.map((futureKey) => (
                            <button
                              key={futureKey}
                              type="button"
                              disabled={isItemBusy}
                              onClick={() =>
                                void runAction(task.id, () =>
                                  onSchedule(task, futureKey)
                                )
                              }
                              className="min-h-[36px] md:min-h-[32px] px-2 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white hover:border-zinc-900 text-xs font-medium text-zinc-700 tabular-nums transition-colors whitespace-nowrap"
                            >
                              {futureKey.replace('-', '.')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
