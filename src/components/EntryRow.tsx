import {
  ArrowRight,
  CalendarClock,
  Check,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
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
}

type ActivePanel = 'none' | 'migrate' | 'schedule';

export function EntryRow({
  entry,
  allEntries,
  highlighted = false,
  onToggleTask,
  onTogglePriority,
  onUpdateText,
  onMigrate,
  onSchedule,
  onDelete,
  onNavigate,
  compact = false,
}: EntryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isComposingRef = useRef(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (activePanel === 'none') return;
    const handleOutside = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setActivePanel('none');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activePanel]);

  const startEdit = () => {
    const initial =
      entry.type === 'event' && entry.eventTime
        ? `${entry.eventTime} ${entry.content}`
        : entry.content;
    setEditValue(initial);
    setActivePanel('none');
    setMobileMenuOpen(false);
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

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isComposingRef.current || e.nativeEvent.isComposing) return;
      e.preventDefault();
      void commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const migratedTarget = entry.migratedToId
    ? allEntries.find((item) => item.id === entry.migratedToId)
    : undefined;

  const isFaded =
    entry.status === 'migrated' ||
    entry.status === 'scheduled' ||
    entry.status === 'cancelled';
  const isDone = entry.type === 'task' && entry.status === 'done';
  const canMigrateOrSchedule = entry.type === 'task' || entry.scope === 'future';

  const futureMonths = getFutureMonthKeys(12);

  const handleMigrateClick = () => {
    setMobileMenuOpen(false);
    if (entry.scope === 'future') {
      // Future Log -> directly migrate to that month's Monthly Log
      void onMigrate(entry, 'monthly', entry.dateKey);
      return;
    }
    setActivePanel((prev) => (prev === 'migrate' ? 'none' : 'migrate'));
  };

  const handleScheduleClick = () => {
    setMobileMenuOpen(false);
    setActivePanel((prev) => (prev === 'schedule' ? 'none' : 'schedule'));
  };

  const migratedTargetLabel = migratedTarget
    ? migratedTarget.scope === 'daily'
      ? formatDailyCompact(migratedTarget.dateKey)
      : migratedTarget.scope === 'monthly'
        ? `${formatMonthHeading(migratedTarget.dateKey)} 먼슬리`
        : `${formatMonthHeading(migratedTarget.dateKey)} 퓨처`
    : null;

  return (
    <div
      ref={rowRef}
      className={`group relative rounded-lg transition-colors ${
        highlighted ? 'bg-zinc-100' : 'hover:bg-zinc-50/90'
      }`}
    >
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
                  isDone
                    ? 'line-through text-zinc-400'
                    : isFaded
                      ? 'text-zinc-400'
                      : entry.priority
                        ? 'font-medium text-neutral-950'
                        : entry.type === 'note'
                          ? 'text-zinc-600'
                          : 'text-zinc-900'
                }`}
              >
                {entry.priority && (
                  <span className="text-amber-600 font-semibold mr-1">*</span>
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

        {/* Desktop hover/focus mini actions */}
        {!isEditing && (
          <div
            className={`hidden md:flex items-center gap-0.5 shrink-0 h-6 transition-opacity ${
              activePanel !== 'none'
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={() => void onTogglePriority(entry)}
              title={entry.priority ? '중요 표시 해제 (*)' : '중요 표시 (*)'}
              aria-label={entry.priority ? '중요 표시 해제' : '중요 표시'}
              aria-pressed={Boolean(entry.priority)}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                entry.priority
                  ? 'text-amber-500 hover:bg-amber-50'
                  : 'text-zinc-400 hover:text-amber-600 hover:bg-zinc-100'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${entry.priority ? 'fill-amber-400' : ''}`}
              />
            </button>
            {canMigrateOrSchedule && (
              <>
                <button
                  type="button"
                  onClick={handleMigrateClick}
                  title={
                    entry.scope === 'future'
                      ? '해당 월 먼슬리 로그로 옮기기 (>)'
                      : '미루기 (>)'
                  }
                  aria-label="미루기"
                  className={`flex items-center justify-center w-8 h-8 rounded-md font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                    activePanel === 'migrate'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  &gt;
                </button>

                <button
                  type="button"
                  onClick={handleScheduleClick}
                  title="퓨처 로그로 스케줄 (<)"
                  aria-label="퓨처 로그로 스케줄"
                  className={`flex items-center justify-center w-8 h-8 rounded-md font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                    activePanel === 'schedule'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  &lt;
                </button>
              </>
            )}

            <button
              type="button"
              onClick={startEdit}
              title="수정"
              aria-label="항목 수정"
              className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => void onDelete(entry)}
              title="삭제"
              aria-label="항목 삭제"
              className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mobile touch-friendly action toggle (40x40px hitbox) */}
        {!isEditing && (
          <div className="flex md:hidden items-center h-6 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActivePanel('none');
                setMobileMenuOpen((prev) => !prev);
              }}
              aria-label="항목 작업 열기"
              aria-expanded={mobileMenuOpen}
              className={`flex items-center justify-center w-10 h-10 -my-2 -mr-1 rounded-md transition-colors ${
                mobileMenuOpen
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-400 active:bg-zinc-100'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile expanded action bar (all >= 40x40px touch targets) */}
      {mobileMenuOpen && !isEditing && (
        <div
          className={`md:hidden grid gap-1 px-2 pb-2 pt-0.5 ${
            canMigrateOrSchedule ? 'grid-cols-5' : 'grid-cols-3'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              void onTogglePriority(entry);
            }}
            aria-pressed={Boolean(entry.priority)}
            className={`flex items-center justify-center gap-1 min-h-[40px] rounded-md border text-[11px] font-medium whitespace-nowrap ${
              entry.priority
                ? 'border-amber-200 bg-amber-50 text-amber-700 active:bg-amber-100'
                : 'border-zinc-200 bg-white text-zinc-700 active:bg-zinc-100'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 shrink-0 ${
                entry.priority ? 'fill-amber-400 text-amber-500' : ''
              }`}
            />
            <span>중요</span>
          </button>
          {canMigrateOrSchedule && (
            <>
              <button
                type="button"
                onClick={handleMigrateClick}
                className="flex items-center justify-center gap-1 min-h-[40px] rounded-md border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700 active:bg-zinc-100 whitespace-nowrap"
              >
                <span className="font-mono">&gt;</span>
                <span>{entry.scope === 'future' ? '먼슬리' : '미루기'}</span>
              </button>
              <button
                type="button"
                onClick={handleScheduleClick}
                className="flex items-center justify-center gap-1 min-h-[40px] rounded-md border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700 active:bg-zinc-100 whitespace-nowrap"
              >
                <span className="font-mono">&lt;</span>
                <span>스케줄</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center justify-center gap-1 min-h-[40px] rounded-md border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700 active:bg-zinc-100 whitespace-nowrap"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            <span>수정</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              void onDelete(entry);
            }}
            className="flex items-center justify-center gap-1 min-h-[40px] rounded-md border border-zinc-200 bg-white text-[11px] font-medium text-red-600 active:bg-red-50 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>삭제</span>
          </button>
        </div>
      )}

      {/* Migrate (>) destination panel */}
      {activePanel === 'migrate' && (
        <div className="mx-2 mb-2 mt-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
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
        <div className="mx-2 mb-2 mt-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
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
