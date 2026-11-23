import { RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarSyncBar } from './components/CalendarSyncBar';
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
  undoEntry?: JournalEntry;
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
    updateEntryContent,
    migrateEntry,
    scheduleEntry,
    deleteEntry,
    restoreEntry,
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
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimerRef = useRef<number | null>(null);
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
      rawText: string
    ) => {
      await createEntry({ scope, dateKey, type, rawText });
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

  const handleDelete = useCallback(
    async (entry: JournalEntry) => {
      await deleteEntry(entry.id);
      showToast({
        message: '항목을 삭제했습니다.',
        undoEntry: entry,
      });
    },
    [deleteEntry, showToast]
  );

  const handleUndoDelete = useCallback(async () => {
    if (!toast?.undoEntry) return;
    const entryToRestore = toast.undoEntry;
    setToast(null);
    await restoreEntry(entryToRestore);
  }, [toast, restoreEntry]);

  const openTaskCount = useMemo(
    () =>
      entries.filter((e) => e.type === 'task' && e.status === 'open').length,
    [entries]
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
        openTaskCount={openTaskCount}
        userEmail={user?.email}
        onSignOut={signOutUser}
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
                entries={entries}
                onNavigate={handleNavigate}
                userEmail={user?.email}
                onSignOut={signOutUser}
              />
            )}

            {activeView === 'future' && (
              <FutureLogView
                entries={entries}
                focusMonthKey={futureFocusMonthKey}
                highlightId={highlightId}
                onCreateEntry={handleCreateEntry}
                onToggleTask={toggleTaskStatus}
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
                entries={entries}
                highlightId={highlightId}
                onChangeMonth={(nextMonth) => setSelectedMonthKey(nextMonth)}
                onCreateEntry={handleCreateEntry}
                onToggleTask={toggleTaskStatus}
                onUpdateText={updateEntryContent}
                onMigrate={handleMigrate}
                onSchedule={handleSchedule}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'daily' && (
              <DailyLogView
                dateKey={selectedDateKey}
                entries={entries}
                highlightId={highlightId}
                onChangeDate={(nextDate) => {
                  setSelectedDateKey(nextDate);
                  setSelectedMonthKey(toMonthKey(nextDate));
                }}
                onCreateEntry={handleCreateEntry}
                onToggleTask={toggleTaskStatus}
                onUpdateText={updateEntryContent}
                onMigrate={handleMigrate}
                onSchedule={handleSchedule}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'search' && (
              <SearchPanel
                entries={entries}
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
          entries={entries}
          mode="modal"
          onSelectResult={handleNavigate}
          onClose={() => setSearchModalOpen(false)}
        />
      )}

      {/* Subtle Action / Undo Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-50 flex items-center gap-3 rounded-lg bg-zinc-900 text-white px-4 py-2.5 text-xs shadow-lg shadow-zinc-900/15"
        >
          <span className="whitespace-nowrap">{toast.message}</span>
          {toast.undoEntry && (
            <button
              type="button"
              onClick={() => void handleUndoDelete()}
              className="inline-flex items-center gap-1 font-medium text-zinc-200 hover:text-white underline underline-offset-2 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>실행 취소</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
