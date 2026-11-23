import { useCallback, useEffect, useState } from 'react';
import { journalRepository } from '../services/storage';
import type { BulletType, JournalEntry, LogScope } from '../types/journal';
import { generateId, parseEventTimeAndContent } from '../utils/rapidInput';

export interface CreateEntryParams {
  scope: LogScope;
  dateKey: string;
  type: BulletType;
  rawText: string;
}

export function useJournal(enabled = true) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setEntries([]);
      setIsLoading(false);
      setSyncError(null);
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
        if (err.message.includes('permission') || err.message.includes('PERMISSION_DENIED')) {
          setSyncError('Firestore 접근 권한이 없습니다. 보안 규칙의 허용 이메일을 확인해 주세요.');
        } else {
          setSyncError('동기화 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.');
        }
      }
    );

    return unsubscribe;
  }, [enabled]);

  const getNextOrder = useCallback(
    (scope: LogScope, dateKey: string): number => {
      const matching = entries.filter(
        (item) => item.scope === scope && item.dateKey === dateKey
      );
      if (matching.length === 0) return 0;
      return Math.max(...matching.map((item) => item.order)) + 1;
    },
    [entries]
  );

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
        return newEntry;
      } catch {
        setSyncError('항목 저장에 실패했습니다. 네트워크와 권한 설정을 확인해 주세요.');
        return null;
      }
    },
    [getNextOrder]
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
        return newEntry;
      } catch {
        setSyncError('항목 마이그레이션에 실패했습니다.');
        return null;
      }
    },
    [getNextOrder]
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
    try {
      await journalRepository.deleteEntry(id);
    } catch {
      setSyncError('항목 삭제에 실패했습니다.');
    }
  }, []);

  const restoreEntry = useCallback(async (entry: JournalEntry): Promise<void> => {
    try {
      await journalRepository.addEntry({
        ...entry,
        updatedAt: Date.now(),
      });
    } catch {
      setSyncError('항목 복원에 실패했습니다.');
    }
  }, []);

  return {
    entries,
    isLoading,
    syncError,
    clearSyncError: useCallback(() => setSyncError(null), []),
    createEntry,
    toggleTaskStatus,
    updateEntryContent,
    migrateEntry,
    scheduleEntry,
    deleteEntry,
    restoreEntry,
  };
}
