import { CalendarCheck2, CalendarSync, RefreshCw } from 'lucide-react';
import type { CalendarConnectionStatus } from '../services/googleCalendar';

interface CalendarSyncBarProps {
  calendarStatus: CalendarConnectionStatus;
  isSyncing: boolean;
  isReconnecting: boolean;
  lastSyncedTime: string | null;
  onSync: () => Promise<void>;
  onReconnect: () => Promise<void>;
}

export function CalendarSyncBar({
  calendarStatus,
  isSyncing,
  isReconnecting,
  lastSyncedTime,
  onSync,
  onReconnect,
}: CalendarSyncBarProps) {
  return (
    <div className="max-w-6xl mx-auto px-5 pt-4 md:px-10 md:pt-5 flex items-center justify-end gap-2">
      {calendarStatus === 'connected' ? (
        <div className="flex items-center gap-2.5">
          {lastSyncedTime && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
              <CalendarCheck2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>{lastSyncedTime} 동기화됨</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={isSyncing}
            aria-label="구글 캘린더 동기화"
            className="inline-flex items-center gap-1.5 min-h-[36px] md:min-h-[32px] px-3 py-1 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
            />
            <span>{isSyncing ? '동기화 중...' : '동기화'}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void onReconnect()}
          disabled={isReconnecting}
          className={`inline-flex items-center gap-1.5 min-h-[36px] md:min-h-[32px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            calendarStatus === 'expired'
              ? 'border-amber-300 bg-amber-50/70 text-amber-800 hover:bg-amber-100/70'
              : 'border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          <CalendarSync className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isReconnecting
              ? '연결 중...'
              : calendarStatus === 'expired'
                ? '캘린더 재연결'
                : '캘린더 연결'}
          </span>
        </button>
      )}
    </div>
  );
}
