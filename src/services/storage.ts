import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { JournalEntry, JournalEntryPatch } from '../types/journal';

export type EntriesCallback = (entries: JournalEntry[]) => void;
export type ErrorCallback = (error: Error) => void;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

function buildFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): Error {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
  };
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error:', serialized);
  return new Error(serialized);
}

/**
 * Storage adapter interface shared between LocalStorageRepository (Phase 1)
 * and FirestoreRepository (Phase 2).
 */
export interface JournalRepository {
  subscribeEntries(
    callback: EntriesCallback,
    onError?: ErrorCallback
  ): () => void;
  addEntry(entry: JournalEntry): Promise<JournalEntry>;
  updateEntry(id: string, patch: JournalEntryPatch): Promise<void>;
  deleteEntry(id: string): Promise<void>;
}

const ENTRIES_COLLECTION = 'entries';
const STORAGE_KEY = 'minimal_bujo_entries_v1';

function isValidEntry(candidate: unknown): candidate is JournalEntry {
  if (!candidate || typeof candidate !== 'object') return false;
  const item = candidate as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    (item.scope === 'future' ||
      item.scope === 'monthly' ||
      item.scope === 'daily') &&
    typeof item.dateKey === 'string' &&
    (item.type === 'task' || item.type === 'event' || item.type === 'note') &&
    typeof item.status === 'string' &&
    typeof item.content === 'string' &&
    typeof item.order === 'number' &&
    typeof item.createdAt === 'number' &&
    typeof item.updatedAt === 'number'
  );
}

function sanitizeForFirestore(entry: JournalEntry): JournalEntry {
  return {
    id: entry.id,
    scope: entry.scope,
    dateKey: entry.dateKey,
    type: entry.type,
    status: entry.status,
    content: entry.content.slice(0, 2000),
    priority: Boolean(entry.priority),
    indent: entry.indent === 1 ? 1 : 0,
    eventTime: entry.eventTime ?? null,
    order: entry.order,
    migratedToId: entry.migratedToId ?? null,
    googleEventId: entry.googleEventId ?? null,
    googleUpdatedAt: entry.googleUpdatedAt ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function sanitizePatchForFirestore(
  patch: JournalEntryPatch
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {
    updatedAt: patch.updatedAt ?? Date.now(),
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === 'content' && typeof value === 'string') {
      cleaned[key] = value.slice(0, 2000);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export class FirestoreRepository implements JournalRepository {
  subscribeEntries(
    callback: EntriesCallback,
    onError?: ErrorCallback
  ): () => void {
    if (!db) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, ENTRIES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const entries: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const candidate = {
            ...data,
            id: typeof data.id === 'string' ? data.id : docSnap.id,
          };
          if (isValidEntry(candidate)) {
            entries.push(candidate);
          }
        });
        callback(entries);
      },
      (error) => {
        const wrapped = buildFirestoreError(
          error,
          OperationType.LIST,
          ENTRIES_COLLECTION
        );
        onError?.(wrapped);
      }
    );
  }

  async addEntry(entry: JournalEntry): Promise<JournalEntry> {
    if (!db) {
      throw new Error('Firebase Firestore가 초기화되지 않았습니다.');
    }
    const payload = sanitizeForFirestore(entry);
    const path = `${ENTRIES_COLLECTION}/${payload.id}`;
    try {
      await setDoc(doc(db, ENTRIES_COLLECTION, payload.id), payload);
      return payload;
    } catch (error) {
      throw buildFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async updateEntry(id: string, patch: JournalEntryPatch): Promise<void> {
    if (!db) {
      throw new Error('Firebase Firestore가 초기화되지 않았습니다.');
    }
    const path = `${ENTRIES_COLLECTION}/${id}`;
    const payload = sanitizePatchForFirestore(patch);
    try {
      await updateDoc(doc(db, ENTRIES_COLLECTION, id), payload);
    } catch (error) {
      throw buildFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async deleteEntry(id: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase Firestore가 초기화되지 않았습니다.');
    }
    const path = `${ENTRIES_COLLECTION}/${id}`;
    try {
      await deleteDoc(doc(db, ENTRIES_COLLECTION, id));
    } catch (error) {
      throw buildFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export class LocalStorageRepository implements JournalRepository {
  private listeners = new Set<EntriesCallback>();
  private storageListenerAttached = false;

  private readAll(): JournalEntry[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidEntry);
    } catch {
      return [];
    }
  }

  private writeAll(entries: JournalEntry[]): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Gracefully ignore storage quota / private-mode write errors
    }
    this.notify(entries);
  }

  private notify(entries: JournalEntry[]): void {
    const snapshot = [...entries];
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEY || event.key === null) {
      this.notify(this.readAll());
    }
  };

  subscribeEntries(callback: EntriesCallback): () => void {
    this.listeners.add(callback);

    if (!this.storageListenerAttached && typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
      this.storageListenerAttached = true;
    }

    callback(this.readAll());

    return () => {
      this.listeners.delete(callback);
      if (
        this.listeners.size === 0 &&
        this.storageListenerAttached &&
        typeof window !== 'undefined'
      ) {
        window.removeEventListener('storage', this.handleStorageEvent);
        this.storageListenerAttached = false;
      }
    };
  }

  async addEntry(entry: JournalEntry): Promise<JournalEntry> {
    const entries = this.readAll();
    const next = [...entries, entry];
    this.writeAll(next);
    return entry;
  }

  async updateEntry(id: string, patch: JournalEntryPatch): Promise<void> {
    const entries = this.readAll();
    const index = entries.findIndex((item) => item.id === id);
    if (index === -1) return;

    const updated: JournalEntry = {
      ...entries[index],
      ...patch,
      updatedAt: patch.updatedAt ?? Date.now(),
    };

    const next = [...entries];
    next[index] = updated;
    this.writeAll(next);
  }

  async deleteEntry(id: string): Promise<void> {
    const entries = this.readAll();
    const next = entries.filter((item) => item.id !== id);
    if (next.length === entries.length) return;
    this.writeAll(next);
  }
}

export const journalRepository: JournalRepository = new FirestoreRepository();
