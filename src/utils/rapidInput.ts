import type { BulletType, TaskStatus } from '../types/journal';

export interface PrefixDetectionResult {
  detectedType: BulletType | null;
  remainingText: string;
}

/**
 * Detects rapid-logging prefix triggers at the start of input:
 * - ". " -> task (•)
 * - "o " / "O " / "0 " -> event (○)
 * - "- " -> note (-)
 */
export function detectRapidPrefix(raw: string): PrefixDetectionResult {
  if (raw.startsWith('. ')) {
    return { detectedType: 'task', remainingText: raw.slice(2) };
  }
  if (raw.startsWith('o ') || raw.startsWith('O ') || raw.startsWith('0 ')) {
    return { detectedType: 'event', remainingText: raw.slice(2) };
  }
  if (raw.startsWith('- ')) {
    return { detectedType: 'note', remainingText: raw.slice(2) };
  }
  return { detectedType: null, remainingText: raw };
}

export interface ParsedEventText {
  eventTime: string | null;
  content: string;
}

/**
 * Parses leading HH:mm pattern (e.g. "14:30 치과" or "9:05 미팅") for event entries.
 */
export function parseEventTimeAndContent(raw: string): ParsedEventText {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)\s+(.+)$/);
  if (!match) {
    return { eventTime: null, content: trimmed };
  }
  const hours = match[1].padStart(2, '0');
  const minutes = match[2];
  const content = match[3].trim();
  return {
    eventTime: `${hours}:${minutes}`,
    content,
  };
}

export function getBulletSymbol(type: BulletType, status: TaskStatus): string {
  if (type === 'event') return '○';
  if (type === 'note') return '-';
  switch (status) {
    case 'done':
      return '×';
    case 'migrated':
      return '>';
    case 'scheduled':
      return '<';
    case 'cancelled':
      return '–';
    case 'open':
    default:
      return '•';
  }
}

export function getBulletLabel(type: BulletType, status?: TaskStatus): string {
  if (type === 'event') return '일정';
  if (type === 'note') return '메모';
  if (!status || status === 'open') return '할 일';
  switch (status) {
    case 'done':
      return '완료';
    case 'migrated':
      return '미룸';
    case 'scheduled':
      return '스케줄됨';
    case 'cancelled':
      return '취소됨';
    default:
      return '할 일';
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
