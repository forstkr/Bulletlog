import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  IndentDecrease,
  IndentIncrease,
  MoreHorizontal,
  Pencil,
  Star,
  Strikethrough,
  Trash2,
  X,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { EntryDragProps } from '../hooks/useListReorder';
import type { JournalEntry, LogScope, NavigationTarget } from '../types/journal';
import {
  formatDailyCompact,
  formatMonthHeading,
  formatMonthShort,
  getFutureMonthKeys,
  getNextDayKey,
  getNextMonthKey,
  toMonthKey,
} from '../utils/date';
import { BulletGlyph } from './BulletGlyph';

interface EntryRowProps {
  entry: JournalEntry;
  allEntries: JournalEntry[];
  highlighted?: boolean;
  onToggleTask: (entry: JournalEntry) => void | Promise<void>;
  onTogglePriority: (entry: JournalEntry) => void | Promise<void>;
  onSetIndent: (entry: JournalEntry, indent: 0 | 1) => void | Promise<void>;
  onToggleCancelled: (entry: JournalEntry) => void | Promise<void>;
  onUpdateText: (entry: JournalEntry, rawText: string) => void | Promise<void>;
  onMigrate: (
    entry: JournalEntry,
    targetScope: LogScope,
    targetDateKey: string
  ) => void | Promise<void>;
  onSchedule: (entry: JournalEntry, futureMonthKey: string) => void | Promise<void>;
  onDelete: (entry: JournalEntry) => void | Promise<void>;
  onNavigate?: (target: NavigationTarget) => void;
  compact?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  dragProps?: EntryDragProps;
}

type ActivePanel = 'none' | 'migrate' | 'schedule';

export function EntryRow({
  entry,
  allEntries,
  highlighted = false,
  onToggleTask,
  onTogglePriority,
  onSetIndent,
  onToggleCancelled,
  onUpdateText,
  onMigrate,
  onSchedule,
  onDelete,
  onNavigate,
  compact = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  dragProps,
}: EntryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [trayOpen, setTrayOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const isComposingRef = useRef(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!trayOpen && activePanel === 'none') return;

    const handleOutside = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setTrayOpen(false);
        setActivePanel('none');
      }
    };

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTrayOpen(false);
        setActivePanel('none');
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [trayOpen, activePanel]);

  const startEdit = () => {
    const initial =
      entry.type === 'event' && entry.eventTime
        ? `${entry.eventTime} ${entry.content}`
        : entry.content;
    setEditValue(initial);
    setActivePanel('none');
    setTrayOpen(false);
    setIsEditing(true);
  };

  const commitEdit = async () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      await onUpdateText(entry, trimmed);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const isIndented = entry.indent === 1;
  const reorderEnabled = Boolean(onMoveUp || onMoveDown);

  const triggerMoveWithFocus = (
    direction: 'up' | 'down',
    focusTarget: 'input' | 'row'
  ) => {
    if (direction === 'up' && canMoveUp && onMoveUp) {
      onMoveUp();
    } else if (direction === 'down' && canMoveDown && onMoveDown) {
      onMoveDown();
    } else {
      return;
    }

    window.requestAnimationFrame(() => {
      if (focusTarget === 'input') {
        editInputRef.current?.focus();
      } else {
        rowRef.current?.focus();
      }
    });
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const nextIndent: 0 | 1 = e.shiftKey ? 0 : isIndented ? 0 : 1;
      void onSetIndent(entry, nextIndent);
      return;
    }
    if (
      reorderEnabled &&
      e.altKey &&
      (e.key === 'ArrowUp' || e.key === 'ArrowDown')
    ) {
      e.preventDefault();
      e.stopPropagation();
      triggerMoveWithFocus(e.key === 'ArrowUp' ? 'up' : 'down', 'input');
      return;
    }
    if (e.key === 'Enter') {
      if (isComposingRef.current || e.nativeEvent.isComposing) return;
      e.preventDefault();
      void commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) return;

    if (e.key === 'Tab' && e.target === rowRef.current) {
      e.preventDefault();
      const nextIndent: 0 | 1 = e.shiftKey ? 0 : isIndented ? 0 : 1;
      void onSetIndent(entry, nextIndent);
      return;
    }

    if (
      reorderEnabled &&
      e.altKey &&
      (e.key === 'ArrowUp' || e.key === 'ArrowDown')
    ) {
      e.preventDefault();
      triggerMoveWithFocus(e.key === 'ArrowUp' ? 'up' : 'down', 'row');
    }
  };

  const migratedTarget = entry.migratedToId
    ? allEntries.find((item) => item.id === entry.migratedToId)
    : undefined;

  const isDone = entry.type === 'task' && entry.status === 'done';
  const isCancelled = entry.type === 'task' && entry.status === 'cancelled';
  const isMigratedOrScheduled =
    entry.status === 'migrated' || entry.status === 'scheduled';
  const canMigrateOrSchedule = entry.type === 'task' || entry.scope === 'future';

  const futureMonths = getFutureMonthKeys(12);

  const handleMigrateClick = () => {
    setTrayOpen(false);
    if (entry.scope === 'future') {
      // Future Log -> directly migrate to that month's Monthly Log
      void onMigrate(entry, 'monthly', entry.dateKey);
      return;
    }
    setActivePanel((prev) => (prev === 'migrate' ? 'none' : 'migrate'));
  };

  const handleScheduleClick = () => {
    setTrayOpen(false);
    setActivePanel((prev) => (prev === 'schedule' ? 'none' : 'schedule'));
  };

  const migratedTargetLabel = migratedTarget
    ? migratedTarget.scope === 'daily'
      ? formatDailyCompact(migratedTarget.dateKey)
      : migratedTarget.scope === 'monthly'
        ? `${formatMonthHeading(migratedTarget.dateKey)} 먼슬리`
        : `${formatMonthHeading(migratedTarget.dateKey)} 퓨처`
    : null;

  const isDraggable =
    Boolean(dragProps?.draggable) &&
    !isEditing &&
    !trayOpen &&
    activePanel === 'none';

  const isMenuActive = trayOpen || activePanel !== 'none';

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      onKeyDown={handleRowKeyDown}
      draggable={isDraggable}
      onDragStart={isDraggable ? dragProps?.onDragStart : undefined}
      onDragOver={dragProps?.onDragOver}
      onDragLeave={dragProps?.onDragLeave}
      onDrop={dragProps?.onDrop}
      onDragEnd={dragProps?.onDragEnd}
      className={`group relative rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300 ${
        highlighted ? 'bg-zinc-100' : 'hover:bg-zinc-50/90'
      } ${dragProps?.isDragging ? 'opacity-40' : ''} ${
        isDraggable ? 'md:cursor-grab md:active:cursor-grabbing' : ''
      }`}
    >
      {/* Thin horizontal drop guideline for desktop HTML5 drag-and-drop */}
      {dragProps?.dropPosition === 'before' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 right-1.5 -top-[1px] h-0.5 rounded-full bg-zinc-900 z-10"
        />
      )}
      {dragProps?.dropPosition === 'after' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 right-1.5 -bottom-[1px] h-0.5 rounded-full bg-zinc-900 z-10"
        />
      )}

      {/* 1-level indent wrapper (pl-7 matches parent BulletGlyph w-7) */}
      <div className={isIndented ? 'pl-7' : ''}>
        <div
          className={`flex items-start gap-2 ${
            compact ? 'py-1.5 px-1' : 'py-2 px-1.5'
          }`}
        >
          <BulletGlyph
            type={entry.type}
            status={entry.status}
            interactive={entry.type === 'task'}
            onClick={() => void onToggleTask(entry)}
          />

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1.5 -my-1">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    isComposingRef.current = false;
                  }}
                  className="flex-1 min-w-0 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[15px] leading-6 text-zinc-900 focus:border-zinc-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void commitEdit()}
                  aria-label="수정 저장"
                  className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 shrink-0 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  aria-label="수정 취소"
                  className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 shrink-0 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDoubleClick={startEdit}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 break-words"
              >
                {entry.type === 'event' && entry.eventTime && (
                  <span className="font-mono tabular-nums text-xs leading-6 font-medium text-zinc-500">
                    {entry.eventTime}
                  </span>
                )}
                <span
                  className={`text-[15px] leading-6 ${
                    isCancelled
                      ? 'line-through decoration-neutral-400 text-neutral-400'
                      : isDone
                        ? 'line-through text-zinc-400'
                        : isMigratedOrScheduled
                          ? 'text-zinc-400'
                          : entry.priority
                            ? 'font-medium text-neutral-950'
                            : entry.type === 'note'
                              ? 'text-zinc-600'
                              : 'text-zinc-900'
                  }`}
                >
                  {entry.priority && (
                    <span
                      className={`font-semibold mr-1 ${
                        isCancelled || isDone || isMigratedOrScheduled
                          ? 'text-neutral-400'
                          : 'text-amber-600'
                      }`}
                    >
                      *
                    </span>
                  )}
                  {entry.content}
                </span>
                {migratedTarget && migratedTargetLabel && onNavigate && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({
                        view: migratedTarget.scope,
                        dateKey: migratedTarget.dateKey,
                        highlightId: migratedTarget.id,
                      })
                    }
                    className="text-xs leading-6 text-zinc-400 hover:text-zinc-700 hover:underline transition-colors whitespace-nowrap"
                  >
                    {entry.status === 'scheduled' ? '← ' : '→ '}
                    {migratedTargetLabel}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Unified minimal ⋯ trigger button (desktop & mobile) */}
          {!isEditing && (
            <div className="flex items-center h-6 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activePanel !== 'none') {
                    setActivePanel('none');
                    setTrayOpen(true);
                  } else {
                    setTrayOpen((prev) => !prev);
                  }
                }}
                aria-label="항목 작업 메뉴"
                aria-expanded={isMenuActive}
                title="항목 작업 메뉴"
                className={`flex items-center justify-center w-10 h-10 -my-2 -mr-1 md:w-8 md:h-8 md:-my-1 md:-mr-0.5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                  isMenuActive
                    ? 'bg-zinc-100 text-zinc-900 opacity-100'
                    : 'text-zinc-400 active:bg-zinc-100 md:opacity-25 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:hover:bg-zinc-100 md:hover:text-zinc-800'
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Unified Minimal Expandable Action Tray */}
      {trayOpen && !isEditing && (
        <div
          role="toolbar"
          aria-label="항목 작업"
          className="mx-1.5 mb-2 mt-0.5 rounded-lg border border-zinc-200/80 bg-zinc-50/90 p-1.5"
        >
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setTrayOpen(false);
                void onTogglePriority(entry);
              }}
              aria-pressed={Boolean(entry.priority)}
              className={`inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
                entry.priority
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/70'
                  : 'border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 shrink-0 ${
                  entry.priority ? 'fill-amber-400 text-amber-500' : ''
                }`}
              />
              <span>중요</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTrayOpen(false);
                void onSetIndent(entry, isIndented ? 0 : 1);
              }}
              aria-pressed={isIndented}
              title="들여쓰기 토글 (Tab / Shift+Tab)"
              className={`inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
                isIndented
                  ? 'border-zinc-300 bg-zinc-200/70 text-zinc-900 hover:bg-zinc-200'
                  : 'border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {isIndented ? (
                <>
                  <IndentDecrease className="w-3.5 h-3.5 shrink-0" />
                  <span>내어쓰기</span>
                </>
              ) : (
                <>
                  <IndentIncrease className="w-3.5 h-3.5 shrink-0" />
                  <span>들여쓰기</span>
                </>
              )}
            </button>

            {reorderEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setTrayOpen(false);
                    onMoveUp?.();
                  }}
                  disabled={!canMoveUp}
                  title="위로 이동 (Alt+↑)"
                  className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200/90 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors whitespace-nowrap"
                >
                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  <span>위로</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTrayOpen(false);
                    onMoveDown?.();
                  }}
                  disabled={!canMoveDown}
                  title="아래로 이동 (Alt+↓)"
                  className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200/90 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors whitespace-nowrap"
                >
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  <span>아래로</span>
                </button>
              </>
            )}

            {canMigrateOrSchedule && (
              <>
                <button
                  type="button"
                  onClick={handleMigrateClick}
                  className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200/90 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
                >
                  <span className="font-mono text-[13px] leading-none">&gt;</span>
                  <span>{entry.scope === 'future' ? '먼슬리' : '미루기'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleScheduleClick}
                  className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200/90 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
                >
                  <span className="font-mono text-[13px] leading-none">&lt;</span>
                  <span>스케줄</span>
                </button>
              </>
            )}

            {entry.type === 'task' && (
              <button
                type="button"
                onClick={() => {
                  setTrayOpen(false);
                  void onToggleCancelled(entry);
                }}
                aria-pressed={isCancelled}
                title={
                  isCancelled
                    ? '안 함(취소선) 해제하고 미완료로 되돌리기'
                    : '안 하기로 결정함 (취소선)'
                }
                className={`inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
                  isCancelled
                    ? 'border-zinc-300 bg-zinc-200/70 text-zinc-900 hover:bg-zinc-200'
                    : 'border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Strikethrough className="w-3.5 h-3.5 shrink-0" />
                <span>{isCancelled ? '안 함 해제' : '안 함'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200/90 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>수정</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTrayOpen(false);
                void onDelete(entry);
              }}
              className="inline-flex items-center gap-1 min-h-[36px] md:min-h-[30px] px-2.5 py-1 rounded-md border border-zinc-200/90 bg-white text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>삭제</span>
            </button>
          </div>
        </div>
      )}

      {/* Migrate (>) destination panel */}
      {activePanel === 'migrate' && (
        <div className="mx-1.5 mb-2 mt-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              어디로 미룰까요?
            </span>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              aria-label="닫기"
              className="flex items-center justify-center w-8 h-8 md:w-6 md:h-6 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {entry.scope === 'daily' && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const tomorrowKey = getNextDayKey(entry.dateKey);
                  setActivePanel('none');
                  void onMigrate(entry, 'daily', tomorrowKey);
                }}
                className="flex-1 min-w-[130px] min-h-[40px] px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-left text-xs font-medium text-zinc-800 transition-colors"
              >
                내일 데일리 ({formatDailyCompact(getNextDayKey(entry.dateKey))})
              </button>
              <button
                type="button"
                onClick={() => {
                  const monthKey = toMonthKey(entry.dateKey);
                  setActivePanel('none');
                  void onMigrate(entry, 'monthly', monthKey);
                }}
                className="flex-1 min-w-[130px] min-h-[40px] px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-left text-xs font-medium text-zinc-800 transition-colors"
              >
                이번 달 먼슬리 ({formatMonthShort(toMonthKey(entry.dateKey))})
              </button>
            </div>
          )}

          {entry.scope === 'monthly' && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextMonth = getNextMonthKey(entry.dateKey);
                  setActivePanel('none');
                  void onMigrate(entry, 'monthly', nextMonth);
                }}
                className="flex-1 min-w-[150px] min-h-[40px] px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-left text-xs font-medium text-zinc-800 transition-colors"
              >
                다음 달 먼슬리 ({formatMonthHeading(getNextMonthKey(entry.dateKey))})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Schedule (<) Future Log month selector */}
      {activePanel === 'schedule' && (
        <div className="mx-1.5 mb-2 mt-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <CalendarClock className="w-3.5 h-3.5 text-zinc-400" />
              퓨처 로그 월 선택
            </span>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              aria-label="닫기"
              className="flex items-center justify-center w-8 h-8 md:w-6 md:h-6 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {futureMonths.map((monthKey) => (
              <button
                key={monthKey}
                type="button"
                onClick={() => {
                  setActivePanel('none');
                  void onSchedule(entry, monthKey);
                }}
                className="min-h-[40px] md:min-h-[34px] px-2 py-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 text-xs font-medium text-zinc-700 tabular-nums transition-colors whitespace-nowrap"
              >
                {monthKey.replace('-', '.')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
