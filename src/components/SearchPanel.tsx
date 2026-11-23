import { Search, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import type {
  JournalEntry,
  NavigationTarget,
  SearchFilter,
} from '../types/journal';
import { formatDailyHeading, formatMonthHeading } from '../utils/date';
import { BulletGlyph } from './BulletGlyph';

interface SearchPanelProps {
  entries: JournalEntry[];
  mode: 'modal' | 'page';
  onSelectResult: (target: NavigationTarget) => void;
  onClose?: () => void;
}

const FILTERS: Array<{ id: SearchFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'task', label: '할 일' },
  { id: 'open_task', label: '미완료만' },
  { id: 'event', label: '일정' },
  { id: 'note', label: '메모' },
];

function getScopeLabel(scope: JournalEntry['scope']): string {
  switch (scope) {
    case 'daily':
      return '데일리';
    case 'monthly':
      return '먼슬리';
    case 'future':
      return '퓨처';
  }
}

function formatEntryDateLabel(entry: JournalEntry): string {
  if (entry.scope === 'daily') {
    return formatDailyHeading(entry.dateKey);
  }
  return formatMonthHeading(entry.dateKey);
}

function renderHighlightedText(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark
        key={idx}
        className="bg-zinc-200/90 text-zinc-900 rounded-xs px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

export function SearchPanel({
  entries,
  mode,
  onSelectResult,
  onClose,
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    return entries
      .filter((entry) => {
        if (filter === 'task' && entry.type !== 'task') return false;
        if (
          filter === 'open_task' &&
          !(entry.type === 'task' && entry.status === 'open')
        ) {
          return false;
        }
        if (filter === 'event' && entry.type !== 'event') return false;
        if (filter === 'note' && entry.type !== 'note') return false;

        if (!q) return true;
        const haystack = [
          entry.content,
          entry.eventTime ?? '',
          entry.dateKey,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const dateCmp = b.dateKey.localeCompare(a.dateKey);
        if (dateCmp !== 0) return dateCmp;
        return b.updatedAt - a.updatedAt;
      });
  }, [entries, query, filter]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, filter]);

  const handleSelect = (entry: JournalEntry) => {
    onSelectResult({
      view: entry.scope,
      dateKey: entry.dateKey,
      highlightId: entry.id,
    });
    onClose?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
      return;
    }
    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + filteredResults.length) % filteredResults.length
      );
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const chosen = filteredResults[activeIndex];
      if (chosen) handleSelect(chosen);
    }
  };

  const innerContent = (
    <div
      className={
        mode === 'modal'
          ? 'w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 overflow-hidden flex flex-col max-h-[78vh]'
          : 'max-w-2xl mx-auto px-5 py-8 flex flex-col'
      }
    >
      {mode === 'page' && (
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            검색
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            키워드와 기호로 모든 로그를 실시간으로 찾습니다.
          </p>
        </header>
      )}

      {/* Search Input Bar */}
      <div
        className={
          mode === 'modal'
            ? 'flex items-center gap-2.5 px-4 py-3.5 border-b border-zinc-200'
            : 'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-400 transition-colors'
        }
      >
        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="할 일, 일정, 메모 검색..."
          aria-label="전체 기록 검색"
          className="flex-1 min-w-0 bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="검색어 지우기"
            className="flex items-center justify-center w-8 h-8 md:w-7 md:h-7 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {mode === 'modal' && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="검색 닫기"
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-200 font-mono text-[11px] text-zinc-400 hover:text-zinc-700"
          >
            ESC
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div
        className={`flex items-center gap-1.5 overflow-x-auto ${
          mode === 'modal'
            ? 'px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/60'
            : 'mt-4 pb-3 border-b border-zinc-100'
        }`}
        role="group"
        aria-label="기호 필터"
      >
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={active}
              className={`min-h-[36px] md:min-h-[30px] px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto pl-2 text-xs text-zinc-400 tabular-nums whitespace-nowrap shrink-0">
          {filteredResults.length}건
        </span>
      </div>

      {/* Results List */}
      <div
        className={
          mode === 'modal'
            ? 'flex-1 overflow-y-auto divide-y divide-zinc-100'
            : 'mt-2 divide-y divide-zinc-100'
        }
      >
        {entries.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm text-zinc-500">아직 작성된 기록이 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-400">
              데일리·먼슬리·퓨처 로그에 항목을 추가하면 이곳에서 검색할 수 있습니다.
            </p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm text-zinc-500">일치하는 기록이 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-400">
              다른 키워드나 필터를 선택해 보세요.
            </p>
          </div>
        ) : (
          filteredResults.map((entry, idx) => {
            const isSelected = mode === 'modal' && idx === activeIndex;
            const isDone = entry.type === 'task' && entry.status === 'done';
            const isCancelled =
              entry.type === 'task' && entry.status === 'cancelled';
            const isFaded =
              entry.type === 'task' &&
              (entry.status === 'migrated' || entry.status === 'scheduled');

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleSelect(entry)}
                onMouseEnter={() => {
                  if (mode === 'modal') setActiveIndex(idx);
                }}
                className={`w-full flex items-start gap-2 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-zinc-100/90' : 'hover:bg-zinc-50'
                }`}
              >
                <BulletGlyph type={entry.type} status={entry.status} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {entry.type === 'event' && entry.eventTime && (
                      <span className="font-mono tabular-nums text-xs leading-6 text-zinc-500">
                        {entry.eventTime}
                      </span>
                    )}
                    <span
                      className={`text-[15px] leading-6 break-words ${
                        isCancelled
                          ? 'line-through decoration-neutral-400 text-neutral-400'
                          : isDone
                            ? 'line-through text-zinc-400'
                            : isFaded
                              ? 'text-zinc-400'
                              : entry.priority
                                ? 'font-medium text-neutral-950'
                                : 'text-zinc-900'
                      }`}
                    >
                      {entry.priority && (
                        <span
                          className={`font-semibold mr-1 ${
                            isCancelled || isDone || isFaded
                              ? 'text-neutral-400'
                              : 'text-amber-600'
                          }`}
                        >
                          *
                        </span>
                      )}
                      {renderHighlightedText(entry.content, query)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 tabular-nums">
                    <span>{getScopeLabel(entry.scope)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatEntryDateLabel(entry)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="전역 검색"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
        className="fixed inset-0 z-50 bg-zinc-950/25 backdrop-blur-[1px] flex items-start justify-center pt-[10vh] px-4"
      >
        {innerContent}
      </div>
    );
  }

  return innerContent;
}
