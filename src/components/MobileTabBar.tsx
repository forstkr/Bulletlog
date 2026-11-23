import {
  BookOpen,
  Calendar,
  CalendarRange,
  FileText,
  Search,
} from 'lucide-react';
import type { ActiveView } from '../types/journal';

interface MobileTabBarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
}

const TABS: Array<{
  view: ActiveView;
  label: string;
  icon: typeof BookOpen;
}> = [
  { view: 'index', label: '인덱스', icon: BookOpen },
  { view: 'future', label: '퓨처', icon: CalendarRange },
  { view: 'monthly', label: '먼슬리', icon: Calendar },
  { view: 'daily', label: '데일리', icon: FileText },
  { view: 'search', label: '검색', icon: Search },
];

export function MobileTabBar({ activeView, onSelectView }: MobileTabBarProps) {
  return (
    <nav
      aria-label="모바일 하단 탭"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-sm pb-safe"
    >
      <div className="grid grid-cols-5 h-15">
        {TABS.map(({ view, label, icon: Icon }) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onSelectView(view)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 transition-colors focus-visible:outline-none ${
                isActive ? 'text-zinc-900' : 'text-zinc-400 active:text-zinc-700'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.75} />
              <span
                className={`text-[11px] leading-none whitespace-nowrap ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
