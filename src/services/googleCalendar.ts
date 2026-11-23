import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import type { JournalEntry } from '../types/journal';
import { getNextDayKey } from '../utils/date';

const CALENDAR_API_BASE =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const SEOUL_TIMEZONE = 'Asia/Seoul';

export type CalendarConnectionStatus = 'disconnected' | 'connected' | 'expired';

export class CalendarAuthError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'CalendarAuthError';
    this.statusCode = statusCode;
  }
}

export interface GoogleCalendarEventResult {
  googleEventId: string;
  googleUpdatedAt: string;
}

export interface ParsedGoogleCalendarEvent {
  googleEventId: string;
  googleUpdatedAt: string | null;
  dateKey: string;          // 'YYYY-MM-DD'
  eventTime: string | null; // 'HH:mm' or null for all-day
  content: string;
}

interface GoogleEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

interface GoogleCalendarApiEvent {
  id?: string;
  status?: string;
  summary?: string;
  updated?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarApiEvent[];
  nextPageToken?: string;
}

type StatusListener = (status: CalendarConnectionStatus) => void;

export function isFullDateKey(dateKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

/**
 * Builds Google Calendar event start/end in Asia/Seoul timezone.
 * - No eventTime: all-day event (start.date = YYYY-MM-DD, end.date = next day YYYY-MM-DD)
 * - With eventTime (HH:mm): 1-hour timed event in Asia/Seoul (+09:00), handling 23:xx rollover
 */
export function buildGoogleEventPayload(entry: Pick<JournalEntry, 'content' | 'dateKey' | 'eventTime'>): {
  summary: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
} {
  if (!entry.eventTime) {
    return {
      summary: entry.content,
      start: { date: entry.dateKey },
      end: { date: getNextDayKey(entry.dateKey) },
    };
  }

  const timeMatch = entry.eventTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!timeMatch) {
    return {
      summary: entry.content,
      start: { date: entry.dateKey },
      end: { date: getNextDayKey(entry.dateKey) },
    };
  }

  const startHourNum = Number(timeMatch[1]);
  const startHour = String(startHourNum).padStart(2, '0');
  const minutes = timeMatch[2];

  const rollsOverMidnight = startHourNum === 23;
  const endDateKey = rollsOverMidnight ? getNextDayKey(entry.dateKey) : entry.dateKey;
  const endHour = rollsOverMidnight
    ? '00'
    : String(startHourNum + 1).padStart(2, '0');

  return {
    summary: entry.content,
    start: {
      dateTime: `${entry.dateKey}T${startHour}:${minutes}:00+09:00`,
      timeZone: SEOUL_TIMEZONE,
    },
    end: {
      dateTime: `${endDateKey}T${endHour}:${minutes}:00+09:00`,
      timeZone: SEOUL_TIMEZONE,
    },
  };
}

const seoulPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SEOUL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parseGoogleDateTimeToSeoul(isoString: string): {
  dateKey: string;
  eventTime: string;
} | null {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;

  const parts = seoulPartsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const rawHour = get('hour');
  const hour = rawHour === '24' ? '00' : rawHour;
  const minute = get('minute');

  if (!year || !month || !day || !hour || !minute) return null;

  return {
    dateKey: `${year}-${month}-${day}`,
    eventTime: `${hour}:${minute}`,
  };
}

function parseApiEvent(item: GoogleCalendarApiEvent): ParsedGoogleCalendarEvent | null {
  if (!item.id || item.status === 'cancelled' || !item.start) {
    return null;
  }

  let dateKey: string | null = null;
  let eventTime: string | null = null;

  if (item.start.date && isFullDateKey(item.start.date)) {
    dateKey = item.start.date;
    eventTime = null;
  } else if (item.start.dateTime) {
    const parsed = parseGoogleDateTimeToSeoul(item.start.dateTime);
    if (!parsed) return null;
    dateKey = parsed.dateKey;
    eventTime = parsed.eventTime;
  }

  if (!dateKey) return null;

  return {
    googleEventId: item.id,
    googleUpdatedAt: item.updated ?? null,
    dateKey,
    eventTime,
    content: (item.summary ?? '').trim() || '(제목 없음)',
  };
}

/**
 * In-memory OAuth access token manager & Google Calendar REST API v3 client.
 */
export class GoogleCalendarService {
  private accessToken: string | null = null;
  private status: CalendarConnectionStatus = 'disconnected';
  private listeners = new Set<StatusListener>();

  private setStatus(next: CalendarConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.listeners.forEach((listener) => listener(next));
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): CalendarConnectionStatus {
    return this.status;
  }

  hasAccessToken(): boolean {
    return Boolean(this.accessToken);
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token && token.trim() ? token.trim() : null;
    this.setStatus(this.accessToken ? 'connected' : 'disconnected');
  }

  clearAccessToken(): void {
    this.accessToken = null;
    this.setStatus('disconnected');
  }

  markExpired(): void {
    this.accessToken = null;
    this.setStatus('expired');
  }

  private async authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
    if (!this.accessToken) {
      throw new CalendarAuthError('Google Calendar 액세스 토큰이 없습니다.', 401);
    }

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (response.status === 401) {
      this.markExpired();
      throw new CalendarAuthError('Google Calendar 토큰이 만료되었습니다.', 401);
    }

    return response;
  }

  /**
   * Outbound: Create a Google Calendar event for a ○ event entry.
   */
  async createEvent(entry: JournalEntry): Promise<GoogleCalendarEventResult> {
    if (entry.type !== 'event' || !isFullDateKey(entry.dateKey)) {
      throw new Error('특정 날짜가 지정된 일정(○)만 구글 캘린더에 등록할 수 있습니다.');
    }

    const payload = buildGoogleEventPayload(entry);
    const response = await this.authorizedFetch(CALENDAR_API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`캘린더 일정 생성 실패 (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as GoogleCalendarApiEvent;
    if (!data.id) {
      throw new Error('구글 캘린더 응답에 이벤트 ID가 없습니다.');
    }

    return {
      googleEventId: data.id,
      googleUpdatedAt: data.updated ?? new Date().toISOString(),
    };
  }

  /**
   * Outbound: Patch an existing Google Calendar event when edited.
   */
  async updateEvent(entry: JournalEntry): Promise<GoogleCalendarEventResult> {
    if (!entry.googleEventId || entry.type !== 'event' || !isFullDateKey(entry.dateKey)) {
      throw new Error('구글 캘린더와 연결된 일정(○)만 수정할 수 있습니다.');
    }

    const payload = buildGoogleEventPayload(entry);
    const url = `${CALENDAR_API_BASE}/${encodeURIComponent(entry.googleEventId)}`;
    const response = await this.authorizedFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`캘린더 일정 수정 실패 (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as GoogleCalendarApiEvent;
    return {
      googleEventId: data.id ?? entry.googleEventId,
      googleUpdatedAt: data.updated ?? new Date().toISOString(),
    };
  }

  /**
   * Outbound: Delete a Google Calendar event when removed from Bulletlog.
   */
  async deleteEvent(googleEventId: string): Promise<void> {
    if (!googleEventId) return;

    const url = `${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`;
    const response = await this.authorizedFetch(url, {
      method: 'DELETE',
    });

    // 404 or 410 means already deleted on Google Calendar side
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      const detail = await response.text().catch(() => '');
      throw new Error(`캘린더 일정 삭제 실패 (${response.status}): ${detail}`);
    }
  }

  /**
   * Inbound: Fetch events from Google Calendar within ±2 months of current month.
   */
  async listRecentEvents(referenceDate = new Date()): Promise<ParsedGoogleCalendarEvent[]> {
    const timeMin = startOfMonth(subMonths(referenceDate, 2)).toISOString();
    const timeMax = endOfMonth(addMonths(referenceDate, 2)).toISOString();

    const parsedEvents: ParsedGoogleCalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
        timeZone: SEOUL_TIMEZONE,
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await this.authorizedFetch(
        `${CALENDAR_API_BASE}?${params.toString()}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`캘린더 일정 조회 실패 (${response.status}): ${detail}`);
      }

      const data = (await response.json()) as GoogleCalendarListResponse;
      for (const item of data.items ?? []) {
        const parsed = parseApiEvent(item);
        if (parsed) {
          parsedEvents.push(parsed);
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return parsedEvents;
  }
}

export const googleCalendarService = new GoogleCalendarService();
