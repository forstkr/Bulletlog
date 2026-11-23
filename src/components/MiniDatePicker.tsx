import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  formatMonthHeading,
  getCalendarGrid,
  getNextMonthKey,
  getPrevMonthKey,
  getTodayKey,
  toMonthKey,
} from '../utils/date';

interface MiniDatePickerProps {
  selectedDateKey: string;
  datesWithEntries: Set<string>;
  onSelect: (dateKey: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function MiniDatePicker({
  selectedDateKey,
  datesWithEntries,
  onSelect,
  onClose,
}: MiniDatePickerProps) {
  const [viewMonthKey, setViewMonthKey] = useState(() =>
    toMonthKey(selectedDateKey)
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const cells = getCalendarGrid(viewMonthKey);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="날짜 선택"
      className="absolute left-0 top-full mt-2 z-30 w-72 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-lg shadow-zinc-900/5"
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonthKey((m) => getPrevMonthKey(m))}
          aria-label="이전 달"
          className="flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-zinc-900 tabular-nums">
          {formatMonthHeading(viewMonthKey)}
        </span>
        <button
          type="button"
          onClick={() => setViewMonthKey((m) => getNextMonthKey(m))}
          aria-label="다음 달"
          className="flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-[11px] font-medium py-1 ${
              idx === 0
                ? 'text-red-500'
                : idx === 6
                  ? 'text-zinc-500'
                  : 'text-zinc-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const isSelected = cell.dateKey === selectedDateKey;
          const hasEntries = datesWithEntries.has(cell.dateKey);
          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => {
                onSelect(cell.dateKey);
                onClose();
              }}
              className={`relative flex flex-col items-center justify-center h-9 rounded-md text-xs tabular-nums transition-colors ${
                isSelected
                  ? 'bg-zinc-900 text-white font-semibold'
                  : cell.isToday
                    ? 'bg-zinc-100 text-zinc-900 font-semibold hover:bg-zinc-200'
                    : cell.inCurrentMonth
                      ? 'text-zinc-700 hover:bg-zinc-100'
                      : 'text-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <span>{cell.dayNumber}</span>
              {hasEntries && (
                <span
                  aria-hidden="true"
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white' : 'bg-zinc-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex justify-between items-center">
        <button
          type="button"
          onClick={() => {
            const today = getTodayKey();
            onSelect(today);
            onClose();
          }}
          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
        >
          오늘로 이동
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
