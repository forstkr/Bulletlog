import {
  BookOpen,
  Calendar,
  CalendarRange,
  FileText,
  HelpCircle,
  LogOut,
  Search,
} from 'lucide-react';
import type { ActiveView } from '../types/journal';
import { formatDailyCompact, getTodayKey } from '../utils/date';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: Exclude<ActiveView, 'search'>) => void;
  onOpenSearch: () => void;
  onOpenGuide: () => void;
  openTaskCount: number;
  userEmail?: string | null;
  onSignOut: () => Promise<void>;
}

const NAV_ITEMS: Array<{
  view: Exclude<ActiveView, 'search'>;
  label: string;
  icon: typeof BookOpen;
}> = [
  { view: 'index', label: '인덱스', icon: BookOpen },
  { view: 'future', label: '퓨처 로그', icon: CalendarRange },
  { view: 'monthly', label: '먼슬리 로그', icon: Calendar },
  { view: 'daily', label: '데일리 로그', icon: FileText },
];

export function Sidebar({
  activeView,
  onSelectView,
  onOpenSearch,
  onOpenGuide,
  openTaskCount,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const todayLabel = formatDailyCompact(getTodayKey());

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-zinc-200/80 bg-zinc-50/60 h-screen sticky top-0 select-none">
      <div className="px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={() => onSelectView('index')}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
        >
          <span className="block text-[17px] font-semibold tracking-tight text-zinc-900 whitespace-nowrap">
            Bulletlog
          </span>
        </button>
      </div>

      <div className="px-3 mb-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Search className="w-4 h-4 text-zinc-400" />
            <span>검색</span>
          </span>
          <kbd className="font-mono text-[11px] text-zinc-400 whitespace-nowrap">
            Ctrl K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5" aria-label="주요 로그 탐색">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onSelectView(view)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                isActive
                  ? 'bg-zinc-900 text-white font-medium'
                  : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-zinc-400'
                  }`}
                />
                <span>{label}</span>
              </span>
              {view === 'index' && openTaskCount > 0 && (
                <span
                  className={`font-mono tabular-nums text-xs ${
                    isActive ? 'text-zinc-300' : 'text-zinc-400'
                  }`}
                >
                  • {openTaskCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-200/70 space-y-3">
        <button
          type="button"
          onClick={onOpenGuide}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        >
          <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>사용법</span>
        </button>

        <PWAInstallButton />

        <div className="px-1 text-xs text-zinc-400">
          <div className="tabular-nums">{todayLabel}</div>
          <div className="mt-1 font-mono text-[11px] text-zinc-400">
            • 할 일 · ○ 일정 · - 메모
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between gap-2 px-1">
          <span
            title={userEmail ?? ''}
            className="text-[11px] text-zinc-400 truncate min-w-0"
          >
            {userEmail ?? ''}
          </span>
          <button
            type="button"
            onClick={() => void onSignOut()}
            title="로그아웃"
            aria-label="로그아웃"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors shrink-0 whitespace-nowrap"
          >
            <LogOut className="w-3 h-3" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
