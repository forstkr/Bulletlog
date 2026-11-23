import {
  ArrowRight,
  Calendar,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FileText,
  LogOut,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { JournalEntry, NavigationTarget } from '../../types/journal';
import {
  formatDailyHeading,
  formatDailyWeekday,
  formatMonthShort,
  getCurrentMonthKey,
  getTodayKey,
  toMonthKey,
} from '../../utils/date';
import { PWAInstallButton } from '../PWAInstallButton';

interface IndexViewProps {
  entries: JournalEntry[];
  onNavigate: (target: NavigationTarget) => void;
  userEmail?: string | null;
  onSignOut?: () => Promise<void>;
}

interface MonthSummary {
  monthKey: string;
  openTasks: number;
  totalEntries: number;
}

interface YearGroup {
  year: string;
  months: MonthSummary[];
  openTasks: number;
}

interface RecentDaySummary {
  dateKey: string;
  total: number;
  openTasks: number;
  events: number;
}

export function IndexView({
  entries,
  onNavigate,
  userEmail,
  onSignOut,
}: IndexViewProps) {
  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>({});
  const todayKey = getTodayKey();
  const currentMonthKey = getCurrentMonthKey();

  const futureStats = useMemo(() => {
    const futureEntries = entries.filter((e) => e.scope === 'future');
    const openTasks = futureEntries.filter(
      (e) => e.type === 'task' && e.status === 'open'
    ).length;
    return { total: futureEntries.length, openTasks };
  }, [entries]);

  const yearGroups = useMemo<YearGroup[]>(() => {
    const monthMap = new Map<string, MonthSummary>();

    entries.forEach((entry) => {
      if (entry.scope !== 'monthly' && entry.scope !== 'daily') return;
      const mKey = toMonthKey(entry.dateKey);
      const existing = monthMap.get(mKey) ?? {
        monthKey: mKey,
        openTasks: 0,
        totalEntries: 0,
      };
      existing.totalEntries += 1;
      if (entry.type === 'task' && entry.status === 'open') {
        existing.openTasks += 1;
      }
      monthMap.set(mKey, existing);
    });

    // Always include current month once entries exist so the tree feels anchored
    if (entries.length > 0 && !monthMap.has(currentMonthKey)) {
      monthMap.set(currentMonthKey, {
        monthKey: currentMonthKey,
        openTasks: 0,
        totalEntries: 0,
      });
    }

    const byYear = new Map<string, MonthSummary[]>();
    Array.from(monthMap.values())
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .forEach((summary) => {
        const year = summary.monthKey.slice(0, 4);
        const list = byYear.get(year) ?? [];
        list.push(summary);
        byYear.set(year, list);
      });

    return Array.from(byYear.entries())
      .sort(([yA], [yB]) => yB.localeCompare(yA))
      .map(([year, months]) => ({
        year,
        months,
        openTasks: months.reduce((acc, m) => acc + m.openTasks, 0),
      }));
  }, [entries, currentMonthKey]);

  const recentDays = useMemo<RecentDaySummary[]>(() => {
    const dayMap = new Map<string, RecentDaySummary>();
    entries.forEach((entry) => {
      if (entry.scope !== 'daily') return;
      const existing = dayMap.get(entry.dateKey) ?? {
        dateKey: entry.dateKey,
        total: 0,
        openTasks: 0,
        events: 0,
      };
      existing.total += 1;
      if (entry.type === 'task' && entry.status === 'open') {
        existing.openTasks += 1;
      }
      if (entry.type === 'event') {
        existing.events += 1;
      }
      dayMap.set(entry.dateKey, existing);
    });

    return Array.from(dayMap.values())
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
      .slice(0, 12);
  }, [entries]);

  const toggleYear = (year: string) => {
    setCollapsedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10 md:px-10 md:py-16">
        <header className="mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            인덱스
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            모든 퓨처, 먼슬리, 데일리 로그의 목차입니다.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-6 md:p-8">
          <h2 className="text-base font-semibold text-zinc-900">
            아직 작성된 기록이 없습니다
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            오늘의 데일리 로그에서 할 일(<span className="font-mono text-zinc-700">•</span>),
            일정(<span className="font-mono text-zinc-700">○</span>),
            메모(<span className="font-mono text-zinc-700">-</span>)를 기록하면
            이곳에 연도·월별 목차와 미완료 할 일 개수가 자동으로 정리됩니다.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate({ view: 'daily', dateKey: todayKey })}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              <span>오늘 데일리 로그 시작</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'monthly', dateKey: currentMonthKey })}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors whitespace-nowrap"
            >
              <span>이번 달 먼슬리</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'future' })}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors whitespace-nowrap"
            >
              <span>퓨처 로그</span>
            </button>
          </div>
        </section>

        {onSignOut && (
          <div className="md:hidden mt-10 pt-5 border-t border-zinc-100 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 truncate min-w-0">
              {userEmail ?? ''}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <PWAInstallButton compact />
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 active:bg-zinc-100 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 md:px-10 md:py-12">
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            인덱스
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            연도별 로그와 최근 데일리 기록으로 빠르게 이동합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate({ view: 'daily', dateKey: todayKey })}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
        >
          <span>오늘 기록</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Future Log shortcut */}
      <section className="mb-10">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'future' })}
          className="w-full flex items-center justify-between gap-4 px-4 py-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/70 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CalendarRange className="w-5 h-5 text-zinc-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-zinc-900">
                퓨처 로그
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                향후 월별 예정 항목 관리
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {futureStats.openTasks > 0 && (
              <span
                title="미완료 할 일"
                className="font-mono tabular-nums text-xs font-medium text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded"
              >
                • {futureStats.openTasks}
              </span>
            )}
            <span className="text-xs text-zinc-400 tabular-nums">
              {futureStats.total}건
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </div>
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Year / Month Tree */}
        <section>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">
              연도 · 월별 로그
            </h2>
            <span className="text-xs text-zinc-400">미완료 • 개수</span>
          </div>

          {yearGroups.length === 0 ? (
            <p className="py-8 text-sm text-zinc-400">
              작성된 월별·데일리 기록이 아직 없습니다.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {yearGroups.map((group) => {
                const isCollapsed = !!collapsedYears[group.year];
                return (
                  <div key={group.year}>
                    <button
                      type="button"
                      onClick={() => toggleYear(group.year)}
                      aria-expanded={!isCollapsed}
                      className="w-full flex items-center justify-between min-h-[40px] px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 tabular-nums">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                        <span>{group.year}년</span>
                      </span>
                      {group.openTasks > 0 && (
                        <span className="font-mono tabular-nums text-xs text-zinc-500">
                          • {group.openTasks}
                        </span>
                      )}
                    </button>

                    {!isCollapsed && (
                      <ul className="mt-1 ml-4 pl-3 border-l border-zinc-200 space-y-0.5">
                        {group.months.map((m) => (
                          <li key={m.monthKey}>
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate({
                                  view: 'monthly',
                                  dateKey: m.monthKey,
                                })
                              }
                              className="w-full flex items-center justify-between min-h-[42px] px-3 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100/80 hover:text-zinc-900 transition-colors"
                            >
                              <span className="flex items-center gap-2.5">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="font-medium tabular-nums">
                                  {formatMonthShort(m.monthKey)}
                                </span>
                                {m.monthKey === currentMonthKey && (
                                  <span className="text-xs text-zinc-400">
                                    이번 달
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-3 tabular-nums">
                                {m.openTasks > 0 ? (
                                  <span
                                    title={`미완료 할 일 ${m.openTasks}건`}
                                    className="font-mono text-xs font-medium text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded"
                                  >
                                    • {m.openTasks}
                                  </span>
                                ) : (
                                  <span className="text-xs text-zinc-300">
                                    완료
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Daily Logs */}
        <section>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">
              최근 데일리 로그
            </h2>
            <span className="text-xs text-zinc-400 tabular-nums">
              {recentDays.length}일
            </span>
          </div>

          {recentDays.length === 0 ? (
            <p className="py-8 text-sm text-zinc-400">
              최근 작성한 데일리 로그가 없습니다.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {recentDays.map((day) => (
                <li key={day.dateKey}>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({ view: 'daily', dateKey: day.dateKey })
                    }
                    className="w-full flex items-center justify-between gap-3 min-h-[46px] px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-sm font-medium text-zinc-800 tabular-nums truncate">
                        {formatDailyHeading(day.dateKey)}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {formatDailyWeekday(day.dateKey)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-xs tabular-nums">
                      {day.openTasks > 0 && (
                        <span className="font-mono font-medium text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                          • {day.openTasks}
                        </span>
                      )}
                      <span className="text-zinc-400">{day.total}건</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {onSignOut && (
        <div className="md:hidden mt-10 pt-5 border-t border-zinc-100 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400 truncate min-w-0">
            {userEmail ?? ''}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 active:bg-zinc-100 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
