import { RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarSyncBar } from './components/CalendarSyncBar';
import { GuideModal } from './components/GuideModal';
import { LoginScreen } from './components/LoginScreen';
import { MobileTabBar } from './components/MobileTabBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SearchPanel } from './components/SearchPanel';
import { Sidebar } from './components/Sidebar';
import { DailyLogView } from './components/views/DailyLogView';
import { FutureLogView } from './components/views/FutureLogView';
import { IndexView } from './components/views/IndexView';
import { MonthlyLogView } from './components/views/MonthlyLogView';
import { useAuth } from './hooks/useAuth';
import { useJournal } from './hooks/useJournal';
import type {
  ActiveView,
  BulletType,
  JournalEntry,
  LogScope,
  NavigationTarget,
} from './types/journal';
import { getCurrentMonthKey, getTodayKey, toMonthKey } from './utils/date';

interface ToastState {
  message: string;
}

export default function App() {
  const {
    status: authStatus,
    user,
    error: authError,
    isSigningIn,
    calendarStatus,
    isReconnectingCalendar,
    signInWithGoogle,
    reconnectCalendar,
    signOutUser,
  } = useAuth();

  const isAuthenticated = authStatus === 'authenticated';

  const {
    entries,
    isLoading: isEntriesLoading,
    syncError,
    isCalendarSyncing,
    lastCalendarSyncedTime,
    clearSyncError,
    createEntry,
    toggleTaskStatus,
    togglePriority,
    reorderEntries,
    updateEntryContent,
    migrateEntry,
    migrateMultipleEntries,
    scheduleEntry,
    deleteEntry,
    syncFromGoogleCalendar,
  } = useJournal(isAuthenticated);

  const [activeView, setActiveView] = useState<ActiveView>('daily');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    getTodayKey()
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() =>
    getCurrentMonthKey()
  );
  const [futureFocusMonthKey, setFutureFocusMonthKey] = useState<
    string | undefined
  >(undefined);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JournalEntry | null>(null);
  const [committingDeleteIds, setCommittingDeleteIds] = useState<Set<string>>(
    () => new Set()
  );

  const toastTimerRef = useRef<number | null>(null);
  const pendingDeleteRef = useRef<JournalEntry | null>(null);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const hasAutoSyncedRef = useRef(false);

  const showToast = useCallback((next: ToastState) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (pendingDeleteTimerRef.current) {
        window.clearTimeout(pendingDeleteTimerRef.current);
      }
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Auto-run inbound Google Calendar sync once Firestore entries finish loading and token is ready
  useEffect(() => {
    if (!isAuthenticated || calendarStatus !== 'connected') {
      hasAutoSyncedRef.current = false;
      return;
    }
    if (isEntriesLoading || hasAutoSyncedRef.current) {
      return;
    }
    hasAutoSyncedRef.current = true;
    void syncFromGoogleCalendar();
  }, [
    isAuthenticated,
    isEntriesLoading,
    calendarStatus,
    syncFromGoogleCalendar,
  ]);

  // Global Ctrl+K / Cmd+K shortcut for search (active only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth >= 768) {
          setSearchModalOpen((prev) => !prev);
        } else {
          setActiveView('search');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  const handleManualCalendarSync = useCallback(async () => {
    const result = await syncFromGoogleCalendar();
    if (result.status === 'auth_required') {
      showToast({
        message: '캘린더 인증이 필요합니다. 상단의 [캘린더 재연결]을 눌러 주세요.',
      });
      return;
    }
    if (result.status === 'ok') {
      const changes: string[] = [];
      if (result.createdCount > 0) changes.push(`새 일정 ${result.createdCount}건`);
      if (result.updatedCount > 0) changes.push(`업데이트 ${result.updatedCount}건`);
      showToast({
        message:
          changes.length > 0
            ? `캘린더 동기화 완료 (${changes.join(', ')})`
            : '구글 캘린더와 최신 상태입니다.',
      });
    }
  }, [syncFromGoogleCalendar, showToast]);

  const handleReconnectCalendar = useCallback(async () => {
    const connected = await reconnectCalendar();
    if (!connected) return;
    hasAutoSyncedRef.current = true;
    const result = await syncFromGoogleCalendar();
    if (result.status === 'ok') {
      const total = result.createdCount + result.updatedCount;
      showToast({
        message:
          total > 0
            ? `캘린더 연결 및 동기화 완료 (${total}건 반영)`
            : '구글 캘린더가 연결되었습니다.',
      });
    }
  }, [reconnectCalendar, syncFromGoogleCalendar, showToast]);

  const handleNavigate = useCallback((target: NavigationTarget) => {
    setActiveView(target.view);

    if (target.view === 'daily' && target.dateKey) {
      setSelectedDateKey(target.dateKey);
      setSelectedMonthKey(toMonthKey(target.dateKey));
    } else if (target.view === 'monthly' && target.dateKey) {
      setSelectedMonthKey(toMonthKey(target.dateKey));
    } else if (target.view === 'future') {
      setFutureFocusMonthKey(
        target.dateKey ? toMonthKey(target.dateKey) : undefined
      );
    }

    if (target.highlightId) {
      setHighlightId(target.highlightId);
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightId(null);
      }, 2200);
    } else {
      setHighlightId(null);
    }
  }, []);

  const handleCreateEntry = useCallback(
    async (
      scope: LogScope,
      dateKey: string,
      type: BulletType,
      rawText: string,
      priority?: boolean
    ) => {
      await createEntry({ scope, dateKey, type, rawText, priority });
    },
    [createEntry]
  );

  const handleMigrate = useCallback(
    async (
      entry: JournalEntry,
      targetScope: LogScope,
      targetDateKey: string
    ) => {
      const migrated = await migrateEntry(entry, targetScope, targetDateKey);
      if (!migrated) return;
      const label =
        targetScope === 'daily'
          ? `${targetDateKey} 데일리로 미뤘습니다.`
          : `${targetDateKey} 먼슬리로 옮겼습니다.`;
      showToast({ message: label });
    },
    [migrateEntry, showToast]
  );

  const handleMigrateMultiple = useCallback(
    async (
      items: JournalEntry[],
      targetScope: LogScope,
      targetDateKey: string
    ) => {
      const count = await migrateMultipleEntries(items, targetScope, targetDateKey);
      if (count > 0) {
        showToast({
          message: `미완료 할 일 ${count}개를 오늘로 가져왔습니다.`,
        });
      }
    },
    [migrateMultipleEntries, showToast]
  );

  const handleSchedule = useCallback(
    async (entry: JournalEntry, futureMonthKey: string) => {
      const scheduled = await scheduleEntry(entry, futureMonthKey);
      if (!scheduled) return;
      showToast({
        message: `${futureMonthKey} 퓨처 로그로 스케줄했습니다.`,
      });
    },
    [scheduleEntry, showToast]
  );

  const commitDeleteEntry = useCallback(
    async (entry: JournalEntry) => {
      setCommittingDeleteIds((prev) => {
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
      try {
        await deleteEntry(entry.id);
      } finally {
        setCommittingDeleteIds((prev) => {
          if (!prev.has(entry.id)) return prev;
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }
    },
    [deleteEntry]
  );

  const handleDelete = useCallback(
    async (entry: JournalEntry) => {
      // Consecutive delete safety: immediately finalize previous pending deletion
      if (pendingDeleteTimerRef.current !== null) {
        window.clearTimeout(pendingDeleteTimerRef.current);
        pendingDeleteTimerRef.current = null;
      }
      if (pendingDeleteRef.current && pendingDeleteRef.current.id !== entry.id) {
        const previousEntry = pendingDeleteRef.current;
        pendingDeleteRef.current = null;
        void commitDeleteEntry(previousEntry);
      }

      // Hide entry locally without calling Firestore or Google Calendar API yet
      pendingDeleteRef.current = entry;
      setPendingDelete(entry);

      // Commit real Firestore + Google Calendar deletion after 5 seconds
      pendingDeleteTimerRef.current = window.setTimeout(() => {
        pendingDeleteTimerRef.current = null;
        const target = pendingDeleteRef.current;
        pendingDeleteRef.current = null;
        setPendingDelete(null);
        if (target) {
          void commitDeleteEntry(target);
        }
      }, 5000);
    },
    [commitDeleteEntry]
  );

  const handleUndoDelete = useCallback(() => {
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    if (pendingDeleteRef.current) {
      const target = pendingDeleteRef.current;
      pendingDeleteRef.current = null;
      setPendingDelete(null);
      await commitDeleteEntry(target);
    }
    await signOutUser();
  }, [commitDeleteEntry, signOutUser]);

  const visibleEntries = useMemo(() => {
    const pendingId = pendingDelete?.id;
    if (!pendingId && committingDeleteIds.size === 0) {
      return entries;
    }
    return entries.filter(
      (item) => item.id !== pendingId && !committingDeleteIds.has(item.id)
    );
  }, [entries, pendingDelete, committingDeleteIds]);

  const openTaskCount = useMemo(
    () =>
      visibleEntries.filter((e) => e.type === 'task' && e.status === 'open')
        .length,
    [visibleEntries]
  );

  if (authStatus === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-white text-zinc-900 flex items-center justify-center px-6">
        <div className="text-center">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center mx-auto mb-3"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
          </div>
          <p className="text-xs text-zinc-400">계정 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <OfflineIndicator />
        <LoginScreen
          status={authStatus}
          error={authError}
          isSigningIn={isSigningIn}
          onSignIn={signInWithGoogle}
        />
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 flex flex-col md:flex-row">
      <OfflineIndicator />

      {/* Desktop Fixed Sidebar (>=768px) */}
      <Sidebar
        activeView={activeView}
        onSelectView={(view) => {
          setFutureFocusMonthKey(undefined);
          setActiveView(view);
        }}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenGuide={() => setGuideModalOpen(true)}
        openTaskCount={openTaskCount}
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        {/* Compact Calendar Sync / Reconnect Header Bar */}
        <CalendarSyncBar
          calendarStatus={calendarStatus}
          isSyncing={isCalendarSyncing}
          isReconnecting={isReconnectingCalendar}
          lastSyncedTime={lastCalendarSyncedTime}
          onSync={handleManualCalendarSync}
          onReconnect={handleReconnectCalendar}
          onOpenGuide={() => setGuideModalOpen(true)}
        />

        {syncError && (
          <div
            role="alert"
            className="max-w-3xl mx-auto px-5 pt-4 md:px-10"
          >
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs text-red-700">
              <span>{syncError}</span>
              <button
                type="button"
                onClick={clearSyncError}
                aria-label="오류 메시지 닫기"
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-100 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {isEntriesLoading ? (
          <div className="max-w-2xl mx-auto px-5 py-16 md:px-10">
            <div className="space-y-3 animate-pulse">
              <div className="h-7 w-40 rounded bg-zinc-100" />
              <div className="h-11 w-full rounded-lg bg-zinc-100 mt-6" />
              <div className="h-5 w-3/4 rounded bg-zinc-100 mt-6" />
              <div className="h-5 w-2/3 rounded bg-zinc-100" />
              <div className="h-5 w-1/2 rounded bg-zinc-100" />
            </div>
          </div>
        ) : (
          <>
            {activeView === 'index' && (
              <IndexView
                entries={visibleEntries}
                onNavigate={handleNavigate}
                userEmail={user?.email}
                onSignOut={handleSignOut}
              />
            )}

            {activeView === 'future' && (
              <FutureLogView
                entries={visibleEntries}
                focusMonthKey={futureFocusMonthKey}
                highlightId={highlightId}
                onCreateEntry={handleCreateEntry}
                onToggleTask={toggleTaskStatus}
                onTogglePriority={togglePriority}
                onUpdateText={updateEntryContent}
                onMigrate={handleMigrate}
                onSchedule={handleSchedule}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'monthly' && (
              <MonthlyLogView
                monthKey={selectedMonthKey}
                entries={visibleEntries}
                highlightId={highlightId}
                onChangeMonth={(nextMonth) => setSelectedMonthKey(nextMonth)}
                onCreateEntry={handleCreateEntry}
                onToggleTask={toggleTaskStatus}
                onTogglePriority={togglePriority}
                onUpdateText={updateEntryContent}
                onMigrate={handleMigrate}
                onSchedule={handleSchedule}
                onDelete={handleDelete}
                onReorder={reorderEntries}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'daily' && (
              <DailyLogView
                dateKey={selectedDateKey}
                entries={visibleEntries}
                highlightId={highlightId}
                onChangeDate={(nextDate) => {
                  setSelectedDateKey(nextDate);
                  setSelectedMonthKey(toMonthKey(nextDate));
                }}
                onCreateEntry={handleCreateEntry}
                onToggleTask={toggleTaskStatus}
                onTogglePriority={togglePriority}
                onUpdateText={updateEntryContent}
                onMigrate={handleMigrate}
                onMigrateMultiple={handleMigrateMultiple}
                onSchedule={handleSchedule}
                onDelete={handleDelete}
                onReorder={reorderEntries}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'search' && (
              <SearchPanel
                entries={visibleEntries}
                mode="page"
                onSelectResult={handleNavigate}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (<768px) */}
      <MobileTabBar
        activeView={activeView}
        onSelectView={(view) => {
          setFutureFocusMonthKey(undefined);
          setActiveView(view);
        }}
      />

      {/* Desktop Ctrl+K Search Modal */}
      {searchModalOpen && (
        <SearchPanel
          entries={visibleEntries}
          mode="modal"
          onSelectResult={handleNavigate}
          onClose={() => setSearchModalOpen(false)}
        />
      )}

      {/* Original Bullet Journal Guide Modal */}
      <GuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />

      {/* Bottom-Center Toast Stack (Deferred Delete Undo + Action Feedback) */}
      {(pendingDelete || toast) && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none px-4 max-w-[calc(100vw-2rem)]">
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-center gap-3 rounded-lg bg-zinc-900 text-white px-4 py-2.5 text-xs shadow-lg shadow-zinc-900/15"
            >
              <span className="whitespace-nowrap">{toast.message}</span>
            </div>
          )}

          {pendingDelete && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-center gap-3 rounded-lg bg-zinc-900 text-white px-4 py-2.5 text-xs shadow-lg shadow-zinc-900/15"
            >
              <span className="whitespace-nowrap">항목이 삭제되었습니다.</span>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="inline-flex items-center gap-1 rounded px-2 py-1 -mr-1 font-medium text-white bg-white/15 hover:bg-white/25 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>실행 취소</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
