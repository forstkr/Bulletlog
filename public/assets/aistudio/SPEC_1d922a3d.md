# Minimal Bullet Journal (BuJo) Web/PWA Specification

## 1. 프로젝트 개요 및 절대 제약사항
- **목적:** 개인용 미니멀 불렛저널 웹앱 (PC 웹 + 모바일 PWA)
- **타겟 환경:** Windows PC (Chrome/Edge, 키보드 중심) & Samsung Galaxy Android (Chrome PWA, 터치 중심)
- **디자인 컨셉:** 극도로 깔끔한 미니멀 화이트/라이트 모드 (Notion, Apple Notes 감성)
- **절대 제외 사항 (구현하지 말 것):**
  - ❌ 다크모드 (라이트 모드 전용)
  - ❌ 컬렉션(습관 트래커, 독서 목록 등 자유 페이지)
  - ❌ 이미지 첨부, 파일 업로드, 손글씨/드로잉 기능
  - ❌ 다중 사용자 회원가입/소셜 기능 (단일 개인 사용자 전용)
  - ❌ 별도 백엔드 서버 (GitHub Pages 정적 호스팅 + Firebase 클라이언트 SDK만 사용)

## 2. 기술 스택
- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS
- **Icons:** `lucide-react`
- **Date Utility:** `date-fns` (한국어 로케일 `ko` 지원)
- **Routing:** GitHub Pages 404 방지를 위해 상태 기반 뷰 전환 또는 `HashRouter` 사용
- **Backend/DB/Auth:** Firebase v10+ Modular SDK (Firebase Auth + Cloud Firestore)
- **Calendar Sync:** Google Calendar REST API v3 (프론트엔드 직접 호출)
- **PWA:** `vite-plugin-pwa`
- **Hosting:** GitHub Pages (GitHub Actions 자동 배포)

## 3. 데이터 모델 (단일 플랫 구조 - Phase 1~3 공통)
검색, 마이그레이션, 캘린더 동기화를 단순화하기 위해 모든 기록은 단일 `entries` 컬렉션으로 관리한다.

```typescript
export type LogScope = 'future' | 'monthly' | 'daily';
export type BulletType = 'task' | 'event' | 'note';
export type TaskStatus = 'open' | 'done' | 'migrated' | 'scheduled' | 'cancelled';

export interface JournalEntry {
  id: string;                  // UUID
  scope: LogScope;             // 'future' | 'monthly' | 'daily'
  dateKey: string;             // future & monthly: 'YYYY-MM', daily: 'YYYY-MM-DD'
  type: BulletType;            // task(•), event(○), note(-)
  status: TaskStatus;          // task만 상태 변화 활용 (event/note는 기본 'open')
  content: string;             // 본문 텍스트
  eventTime?: string | null;   // 선택: 'HH:mm' 형식 (예: '14:00' 입력 시 파싱, 없으면 종일 일정)
  order: number;               // 같은 dateKey 내 정렬 순서
  migratedToId?: string | null;// 마이그레이션 시 생성된 새 항목 ID
  googleEventId?: string | null; // 구글 캘린더 동기화용 Event ID (event 타입 전용)
  googleUpdatedAt?: string | null; // 충돌 방지용 ISO 타임스탬프
  createdAt: number;           // Unix ms
  updatedAt: number;           // Unix ms
}
```

## 4. 핵심 기능 상세 (4대 로그 + 래피드 로깅 + 검색)

### 4.1 4대 로그 화면
1. **인덱스 (Index):**
   - 연도/월별 로그 바로가기 트리 및 최근 작성한 데일리 로그 목록
   - 퓨처 로그 바로가기, 각 월별 미완료 태스크(`•`) 개수 뱃지 표시
2. **퓨처 로그 (Future Log):**
   - 현재 월 포함 향후 6~12개월을 월별 카드로 나열 (`scope: 'future'`, `dateKey: 'YYYY-MM'`)
   - 각 항목을 해당 월의 먼슬리 로그로 마이그레이션(`>`) 가능
3. **먼슬리 로그 (Monthly Log):**
   - **PC (2단 레이아웃) / 모바일 (탭 전환: 일정 | 할 일)**
   - **좌측(일정 타임라인):** 해당 월의 1일~말일 리스트. 해당 월의 모든 `event(○)` 항목(데일리/먼슬리 모두 포함)과 요일 표시. 날짜 클릭 시 해당 데일리 로그로 이동.
   - **우측(월간 할 일):** 해당 월의 `scope: 'monthly'` 항목들(`•`, `-`).
4. **데일리 로그 (Daily Log):**
   - 날짜 이동 네비게이션 (이전/다음 날, 오늘로 이동, 미니 날짜 선택기)
   - 해당 날짜(`YYYY-MM-DD`)의 래피드 로깅 리스트 및 상단/하단 빠른 입력창

### 4.2 래피드 로깅 & 키보드/모바일 UX
- **기호 정의:**
  - 할 일(Task): `•` (open), `×` (done, 취소선), `>` (migrated, 희미하게), `<` (scheduled, 희미하게)
  - 일정(Event): `○`
  - 메모(Note): `-`
- **입력 시 기호 자동 변환 (Rapid Input):**
  - 입력창 맨 앞에 `. ` 입력 → `task(•)`로 전환
  - 입력창 맨 앞에 `o ` 또는 `0 ` 입력 → `event(○)`로 전환
  - 입력창 맨 앞에 `- ` 입력 → `note(-)`로 전환
  - `event(○)` 입력 시 본문 앞에 `HH:mm ` 패턴(예: `14:30 치과`)이 있으면 `eventTime: "14:30"`, `content: "치과"`로 자동 분리 저장
- **상태 변경 & 마이그레이션:**
  - 할 일(`•`) 기호 클릭/탭: `•` ↔ `×` 토글
  - 항목 우측 미니 액션 버튼 (모바일 터치 영역 최소 40x40px):
    - `>` (미루기): 데일리 → 내일 또는 이번 달 먼슬리로 복제 후 원본을 `migrated(>)` 처리 / 먼슬리 → 다음 달 먼슬리로 복제
    - `<` (스케줄): 원하는 미래 월(Future Log)로 복제 후 원본을 `scheduled(<)` 처리
    - 삭제 / 수정 (인라인 편집 지원)
- **Windows / Galaxy 반응형 UX:**
  - **Windows (≥768px):** 좌측 고정 미니멀 사이드바 + 본문 영역. `Ctrl + K`로 전역 검색 모달 오픈, `Enter`로 연속 입력.
  - **Galaxy (<768px):** 하단 고정 탭바(인덱스 / 퓨처 / 먼슬리 / 데일리 / 검색). 모바일 가상 키보드 올라올 때 입력창이 가려지지 않도록 레이아웃 구성.

### 4.3 전역 검색 (Search)
- 키워드 실시간 필터링 + 기호 필터(전체 / 할 일 / 미완료만 / 일정 / 메모)
- 검색 결과 클릭 시 해당 로그의 날짜/월 화면으로 즉시 이동

## 5. 저장소 어댑터 패턴 (Phase 1 → Phase 2 전환용)
- `src/services/storage.ts`에 `JournalRepository` 인터페이스를 정의한다.
  - `subscribeEntries(callback)` (실시간 구독)
  - `addEntry(entry)`, `updateEntry(id, patch)`, `deleteEntry(id)`
- **Phase 1:** `LocalStorageRepository`로 구현
- **Phase 2:** `FirestoreRepository`로 교체 (UI 코드 수정 최소화)

## 6. 인증 및 보안 규칙 (Phase 2)
- **인증:** Firebase Auth `GoogleAuthProvider` 사용, `browserLocalPersistence` 적용으로 1회 로그인 후 자동 유지.
- **단일 사용자 제한:** 환경변수 `VITE_ALLOWED_EMAIL`에 본인 구글 이메일을 설정하고, 앱 로그인 시 및 Firestore Security Rules에서 해당 이메일만 허용한다.
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.token.email == "YOUR_EMAIL@gmail.com";
    }
  }
}
```

## 7. 구글 캘린더 양방향 동기화 명세 (Phase 3)
- **인증 스코프:** `https://www.googleapis.com/auth/calendar.events`
- **토큰 관리 (정적 웹 한계 대응):**
  - 프론트엔드 전용이므로 OAuth Access Token은 약 1시간 후 만료된다.
  - Google Calendar API 호출 시 `401 Unauthorized`가 발생하면 에러를 숨기지 말고 상단에 작은 `[캘린더 재연결]` 버튼을 표시해 클릭 1회로 토큰을 재발급받게 한다 (Google Identity Services 또는 Firebase `reauthenticateWithPopup` 활용).
- **동기화 대상:** `type === 'event'` (`○`) 항목만 동기화 (`task`, `note`는 제외).
- **Outbound (불렛저널 → 구글 캘린더):**
  - `daily` 또는 `monthly`(특정 날짜 지정 시)에서 `○` 일정 생성 → `POST /calendar/v3/calendars/primary/events` 호출 후 반환된 `id`를 `googleEventId`에 저장.
  - `eventTime`이 없으면 종일 일정(`start.date: YYYY-MM-DD`, `end.date: 다음날 YYYY-MM-DD`), `eventTime`이 있으면 1시간 기본 일정(`start.dateTime`, `timeZone: 'Asia/Seoul'`).
  - `○` 항목 수정 시 `googleEventId`가 있으면 `PATCH` 호출.
  - `○` 항목 삭제 시 `googleEventId`가 있으면 `DELETE` 호출.
- **Inbound (구글 캘린더 → 불렛저널):**
  - 앱 로드 시 및 수동 `[동기화]` 버튼 클릭 시 현재 월 기준 전후 2개월(`timeMin` ~ `timeMax`)의 이벤트를 `GET`으로 가져온다.
  - 중복 방지: 로컬/Firestore에 동일한 `googleEventId`가 없으면 `scope: 'daily'`, `type: 'event'`로 신규 생성.
  - 이미 존재하면 `googleUpdatedAt` 비교 후 구글 측이 더 최신이면 내용/날짜/시간 업데이트.