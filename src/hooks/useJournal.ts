import { format } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarAuthError,
  googleCalendarService,
  isFullDateKey,
} from '../services/googleCalendar';
import { journalRepository } from '../services/storage';
import type { BulletType, JournalEntry, LogScope } from '../types/journal';
import { generateId, parseEventTimeAndContent } from '../utils/rapidInput';

export interface CreateEntryParams {
  scope: LogScope;
  dateKey: string;
  type: BulletType;
  rawText: string;
}

export interface CalendarSyncResult {
  status: 'ok' | 'auth_required' | 'error';
  createdCount: number;
  updatedCount: number;
}

export function useJournal(enabled = true) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const [lastCalendarSyncedTime, setLastCalendarSyncedTime] = useState<
    string | null
  >(null);

  const entriesRef = useRef<JournalEntry[]>(entries);
  entriesRef.current = entries;

  const calendarSyncInFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setEntries([]);
      setIsLoading(false);
      setSyncError(null);
      setLastCalendarSyncedTime(null);
      return;
    }

    setIsLoading(true);
    setSyncError(null);

    const unsubscribe = journalRepository.subscribeEntries(
      (nextEntries) => {
        setEntries(nextEntries);
        setIsLoading(false);
        setSyncError(null);
      },
      (err) => {
        setIsLoading(false);
        if (
          err.message.includes('permission') ||
          err.message.includes('PERMISSION_DENIED')
        ) {
          setSyncError(
            'Firestore 접근 권한이 없습니다. 보안 규칙의 허용 이메일을 확인해 주세요.'
          );
        } else {
          setSyncError(
            '동기화 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.'
          );
        }
      }
    );

    return unsubscribe;
  }, [enabled]);

  const getNextOrder = useCallback((scope: LogScope, dateKey: string): number => {
    const matching = entriesRef.current.filter(
      (item) => item.scope === scope && item.dateKey === dateKey
    );
    if (matching.length === 0) return 0;
    return Math.max(...matching.map((item) => item.order)) + 1;
  }, []);

  /**
   * Outbound helper: syncs a newly created ○ event entry to Google Calendar if connected.
   */
  const pushCreatedEventToCalendar = useCallback(async (entry: JournalEntry) => {
    if (
      entry.type !== 'event' ||
      !isFullDateKey(entry.dateKey) ||
      !googleCalendarService.hasAccessToken()
    ) {
      return;
    }

    try {
      const result = await googleCalendarService.createEvent(entry);
      await journalRepository.updateEntry(entry.id, {
        googleEventId: result.googleEventId,
        googleUpdatedAt: result.googleUpdatedAt,
      });
    } catch (err) {
      if (err instanceof CalendarAuthError) {
        // Service automatically marks status as 'expired' -> header shows [캘린더 재연결]
        return;
      }
      console.error('Google Calendar createEvent failed:', err);
      setSyncError('일정은 저장되었지만 구글 캘린더 반영에 실패했습니다.');
    }
  }, []);

  const createEntry = useCallback(
    async ({
      scope,
      dateKey,
      type,
      rawText,
    }: CreateEntryParams): Promise<JournalEntry | null> => {
      const trimmed = rawText.trim();
      if (!trimmed) return null;

      let content = trimmed;
      let eventTime: string | null = null;

      if (type === 'event') {
        const parsed = parseEventTimeAndContent(trimmed);
        content = parsed.content;
        eventTime = parsed.eventTime;
      }

      if (!content) return null;

      const now = Date.now();
      const newEntry: JournalEntry = {
        id: generateId(),
        scope,
        dateKey,
        type,
        status: 'open',
        content,
        eventTime,
        order: getNextOrder(scope, dateKey),
        migratedToId: null,
        googleEventId: null,
        googleUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await journalRepository.addEntry(newEntry);
        void pushCreatedEventToCalendar(newEntry);
        return newEntry;
      } catch {
        setSyncError(
          '항목 저장에 실패했습니다. 네트워크와 권한 설정을 확인해 주세요.'
        );
        return null;
      }
    },
    [getNextOrder, pushCreatedEventToCalendar]
  );

  const toggleTaskStatus = useCallback(async (entry: JournalEntry): Promise<void> => {
    if (entry.type !== 'task') return;
    try {
      if (entry.status === 'open') {
        await journalRepository.updateEntry(entry.id, { status: 'done' });
      } else if (entry.status === 'done') {
        await journalRepository.updateEntry(entry.id, { status: 'open' });
      } else {
        await journalRepository.updateEntry(entry.id, {
          status: 'open',
          migratedToId: null,
        });
      }
    } catch {
      setSyncError('상태 변경에 실패했습니다.');
    }
  }, []);

  const updateEntryContent = useCallback(
    async (
      entry: JournalEntry,
      rawText: string,
      nextType?: BulletType
    ): Promise<void> => {
      const trimmed = rawText.trim();
      if (!trimmed) return;

      const effectiveType = nextType ?? entry.type;
      let content = trimmed;
      let eventTime: string | null = null;

      if (effectiveType === 'event') {
        const parsed = parseEventTimeAndContent(trimmed);
        content = parsed.content;
        eventTime = parsed.eventTime;
      }

      if (!content) return;

      try {
        await journalRepository.updateEntry(entry.id, {
          type: effectiveType,
          content,
          eventTime,
          status: effectiveType === 'task' ? entry.status : 'open',
        });

        // Outbound Google Calendar PATCH (or POST if previously unsynced) for ○ events
        if (
          effectiveType === 'event' &&
          isFullDateKey(entry.dateKey) &&
          googleCalendarService.hasAccessToken()
        ) {
          const updatedEntry: JournalEntry = {
            ...entry,
            type: effectiveType,
            content,
            eventTime,
          };

          try {
            const calResult = entry.googleEventId
              ? await googleCalendarService.updateEvent(updatedEntry)
              : await googleCalendarService.createEvent(updatedEntry);

            await journalRepository.updateEntry(entry.id, {
              googleEventId: calResult.googleEventId,
              googleUpdatedAt: calResult.googleUpdatedAt,
            });
          } catch (calErr) {
            if (calErr instanceof CalendarAuthError) return;
            console.error('Google Calendar updateEvent failed:', calErr);
            setSyncError('수정은 저장되었지만 구글 캘린더 반영에 실패했습니다.');
          }
        }
      } catch {
        setSyncError('항목 수정에 실패했습니다.');
      }
    },
    []
  );

  const migrateEntry = useCallback(
    async (
      entry: JournalEntry,
      targetScope: LogScope,
      targetDateKey: string
    ): Promise<JournalEntry | null> => {
      const now = Date.now();
      const newEntry: JournalEntry = {
        id: generateId(),
        scope: targetScope,
        dateKey: targetDateKey,
        type: entry.type,
        status: 'open',
        content: entry.content,
        eventTime: entry.eventTime ?? null,
        order: getNextOrder(targetScope, targetDateKey),
        migratedToId: null,
        googleEventId: null,
        googleUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await journalRepository.addEntry(newEntry);
        await journalRepository.updateEntry(entry.id, {
          status: 'migrated',
          migratedToId: newEntry.id,
        });
        void pushCreatedEventToCalendar(newEntry);
        return newEntry;
      } catch {
        setSyncError('항목 마이그레이션에 실패했습니다.');
        return null;
      }
    },
    [getNextOrder, pushCreatedEventToCalendar]
  );

  const scheduleEntry = useCallback(
    async (
      entry: JournalEntry,
      futureMonthKey: string
    ): Promise<JournalEntry | null> => {
      const now = Date.now();
      const newEntry: JournalEntry = {
        id: generateId(),
        scope: 'future',
        dateKey: futureMonthKey,
        type: entry.type,
        status: 'open',
        content: entry.content,
        eventTime: entry.eventTime ?? null,
        order: getNextOrder('future', futureMonthKey),
        migratedToId: null,
        googleEventId: null,
        googleUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await journalRepository.addEntry(newEntry);
        await journalRepository.updateEntry(entry.id, {
          status: 'scheduled',
          migratedToId: newEntry.id,
        });
        return newEntry;
      } catch {
        setSyncError('스케줄 이동에 실패했습니다.');
        return null;
      }
    },
    [getNextOrder]
  );

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    const target = entriesRef.current.find((item) => item.id === id);

    try {
      await journalRepository.deleteEntry(id);

      // Outbound Google Calendar DELETE for linked ○ events
      if (
        target &&
        target.type === 'event' &&
        target.googleEventId &&
        googleCalendarService.hasAccessToken()
      ) {
        try {
          await googleCalendarService.deleteEvent(target.googleEventId);
        } catch (calErr) {
          if (calErr instanceof CalendarAuthError) return;
          console.error('Google Calendar deleteEvent failed:', calErr);
          setSyncError('항목은 삭제되었지만 구글 캘린더 일정 삭제에 실패했습니다.');
        }
      }
    } catch {
      setSyncError('항목 삭제에 실패했습니다.');
    }
  }, []);

  const restoreEntry = useCallback(
    async (entry: JournalEntry): Promise<void> => {
      const restored: JournalEntry = {
        ...entry,
        // Clear previous googleEventId so recreated calendar event does not collide with deleted ID
        googleEventId: entry.type === 'event' ? null : entry.googleEventId ?? null,
        googleUpdatedAt:
          entry.type === 'event' ? null : entry.googleUpdatedAt ?? null,
        updatedAt: Date.now(),
      };

      try {
        await journalRepository.addEntry(restored);
        void pushCreatedEventToCalendar(restored);
      } catch {
        setSyncError('항목 복원에 실패했습니다.');
      }
    },
    [pushCreatedEventToCalendar]
  );

  /**
   * Inbound: Fetch Google Calendar events (±2 months) and merge into Firestore
   * deduplicating by googleEventId and updating only when googleUpdatedAt is newer.
   */
  const syncFromGoogleCalendar = useCallback(async (): Promise<CalendarSyncResult> => {
    if (!enabled || calendarSyncInFlightRef.current) {
      return { status: 'ok', createdCount: 0, updatedCount: 0 };
    }

    if (!googleCalendarService.hasAccessToken()) {
      return { status: 'auth_required', createdCount: 0, updatedCount: 0 };
    }

    calendarSyncInFlightRef.current = true;
    setIsCalendarSyncing(true);

    try {
      const remoteEvents = await googleCalendarService.listRecentEvents();
      const currentEntries = entriesRef.current;

      const byGoogleId = new Map<string, JournalEntry>();
      const maxOrderByDateKey = new Map<string, number>();

      for (const item of currentEntries) {
        if (item.googleEventId) {
          byGoogleId.set(item.googleEventId, item);
        }
        if (item.scope === 'daily') {
          const prev = maxOrderByDateKey.get(item.dateKey) ?? -1;
          if (item.order > prev) {
            maxOrderByDateKey.set(item.dateKey, item.order);
          }
        }
      }

      let createdCount = 0;
      let updatedCount = 0;

      for (const remote of remoteEvents) {
        const existing = byGoogleId.get(remote.googleEventId);

        if (!existing) {
          const nextOrder = (maxOrderByDateKey.get(remote.dateKey) ?? -1) + 1;
          maxOrderByDateKey.set(remote.dateKey, nextOrder);

          const now = Date.now();
          const created: JournalEntry = {
            id: generateId(),
            scope: 'daily',
            dateKey: remote.dateKey,
            type: 'event',
            status: 'open',
            content: remote.content,
            eventTime: remote.eventTime,
            order: nextOrder,
            migratedToId: null,
            googleEventId: remote.googleEventId,
            googleUpdatedAt: remote.googleUpdatedAt,
            createdAt: now,
            updatedAt: now,
          };

          await journalRepository.addEntry(created);
          byGoogleId.set(remote.googleEventId, created);
          createdCount += 1;
          continue;
        }

        const remoteTs = remote.googleUpdatedAt
          ? Date.parse(remote.googleUpdatedAt)
          : 0;
        const localTs = existing.googleUpdatedAt
          ? Date.parse(existing.googleUpdatedAt)
          : 0;

        const isRemoteNewer =
          remoteTs > 0 && (Number.isNaN(localTs) || localTs === 0 || remoteTs > localTs);

        if (isRemoteNewer) {
          const hasChanges =
            existing.content !== remote.content ||
            existing.dateKey !== remote.dateKey ||
            (existing.eventTime ?? null) !== remote.eventTime ||
            (existing.googleUpdatedAt ?? null) !== remote.googleUpdatedAt;

          if (hasChanges) {
            await journalRepository.updateEntry(existing.id, {
              content: remote.content,
              dateKey: remote.dateKey,
              eventTime: remote.eventTime,
              googleUpdatedAt: remote.googleUpdatedAt,
            });
            updatedCount += 1;
          }
        }
      }

      setLastCalendarSyncedTime(format(new Date(), 'HH:mm'));
      return { status: 'ok', createdCount, updatedCount };
    } catch (err) {
      if (err instanceof CalendarAuthError) {
        return { status: 'auth_required', createdCount: 0, updatedCount: 0 };
      }
      console.error('Google Calendar inbound sync failed:', err);
      setSyncError('구글 캘린더 동기화 중 오류가 발생했습니다.');
      return { status: 'error', createdCount: 0, updatedCount: 0 };
    } finally {
      calendarSyncInFlightRef.current = false;
      setIsCalendarSyncing(false);
    }
  }, [enabled]);

  return {
    entries,
    isLoading,
    syncError,
    isCalendarSyncing,
    lastCalendarSyncedTime,
    clearSyncError: useCallback(() => setSyncError(null), []),
    createEntry,
    toggleTaskStatus,
    updateEntryContent,
    migrateEntry,
    scheduleEntry,
    deleteEntry,
    restoreEntry,
    syncFromGoogleCalendar,
  };
}
