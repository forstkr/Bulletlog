export type LogScope = 'future' | 'monthly' | 'daily';
export type BulletType = 'task' | 'event' | 'note';
export type TaskStatus = 'open' | 'done' | 'migrated' | 'scheduled' | 'cancelled';

export interface JournalEntry {
  id: string;                      // UUID
  scope: LogScope;                 // 'future' | 'monthly' | 'daily'
  dateKey: string;                 // future & monthly: 'YYYY-MM', daily: 'YYYY-MM-DD'
  type: BulletType;                // task(•), event(○), note(-)
  status: TaskStatus;              // task만 상태 변화 활용 (event/note는 기본 'open')
  content: string;                 // 본문 텍스트
  eventTime?: string | null;       // 선택: 'HH:mm' 형식 (예: '14:00' 입력 시 파싱, 없으면 종일 일정)
  order: number;                   // 같은 dateKey 내 정렬 순서
  migratedToId?: string | null;    // 마이그레이션 시 생성된 새 항목 ID
  googleEventId?: string | null;   // 구글 캘린더 동기화용 Event ID (event 타입 전용)
  googleUpdatedAt?: string | null; // 충돌 방지용 ISO 타임스탬프
  createdAt: number;               // Unix ms
  updatedAt: number;               // Unix ms
}

export type JournalEntryPatch = Partial<Omit<JournalEntry, 'id' | 'createdAt'>>;

export type ActiveView = 'index' | 'future' | 'monthly' | 'daily' | 'search';

export type SearchFilter = 'all' | 'task' | 'open_task' | 'event' | 'note';

export interface NavigationTarget {
  view: ActiveView;
  dateKey?: string;      // 'YYYY-MM-DD' for daily, 'YYYY-MM' for monthly/future
  highlightId?: string;  // Optional entry ID to briefly highlight after search jump
}
