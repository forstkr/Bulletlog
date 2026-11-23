import { ArrowRight, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'symbols' | 'logs' | 'routine' | 'tips';

const TABS: Array<{ id: GuideTab; label: string }> = [
  { id: 'symbols', label: '기호 & 입력' },
  { id: 'logs', label: '4대 로그' },
  { id: 'routine', label: '핵심 루틴' },
  { id: 'tips', label: '초보자 팁' },
];

function MonoBadge({ children }: { children: ReactNode }) {
  return (
    <code className="inline-flex items-center justify-center font-mono text-xs font-medium text-zinc-900 bg-zinc-100 border border-zinc-200/90 rounded px-1.5 py-0.5 leading-none align-baseline">
      {children}
    </code>
  );
}

const SYMBOLS_LIST: Array<{
  symbol: string;
  name: string;
  english: string;
  meaning: string;
  note?: string;
  examples?: string[];
}> = [
  {
    symbol: '•',
    name: '할 일',
    english: 'Task',
    meaning: '내가 직접 행동해서 끝내야 하는 일',
    examples: ['• 세금 신고하기', '• 운동화 세탁 맡기기'],
  },
  {
    symbol: '×',
    name: '완료',
    english: 'Done',
    meaning: '할 일을 끝냈을 때 기호를 클릭해 완료 표시',
  },
  {
    symbol: '>',
    name: '미루기',
    english: 'Migrated',
    meaning: '오늘 못 끝냈지만 꼭 해야 해서 내일이나 다음 달 먼슬리 로그로 옮긴 일',
  },
  {
    symbol: '<',
    name: '스케줄',
    english: 'Scheduled',
    meaning: '당장은 아니고 몇 달 뒤에 해야 해서 퓨처 로그로 보낸 일',
  },
  {
    symbol: '○',
    name: '일정',
    english: 'Event',
    meaning: '날짜가 정해진 약속이나 기억할 만한 사건',
    note: '우리 앱에서는 구글 캘린더와 양방향 자동 연동됩니다.',
    examples: ['○ 14:00 치과', '○ 프로젝트 발표 완료'],
  },
  {
    symbol: '-',
    name: '메모',
    english: 'Note',
    meaning: '아이디어, 사실, 잊지 말아야 할 정보, 짧은 감정 기록',
    examples: [
      '- 오후 3시 이후엔 집중력이 떨어짐',
      '- 점심 파스타 맛집 발견',
    ],
  },
];

const FOUR_LOGS = [
  {
    step: '01',
    title: '데일리 로그',
    subtitle: 'Daily Log · 매일 쓰는 메인 공간',
    description:
      "아침부터 밤까지 떠오르는 할 일(•), 일정(○), 생각(-)을 순서 상관없이 바로바로 쏟아내는 곳입니다. 미래 날짜를 미리 채워두지 않고, 매일 '오늘' 분량만 기록합니다.",
  },
  {
    step: '02',
    title: '먼슬리 로그',
    subtitle: 'Monthly Log · 한 달의 조감도',
    description:
      '매달 1일에 이번 달의 큰 그림을 잡는 곳입니다. 왼쪽은 그달의 주요 일정 타임라인(○), 오른쪽은 "이번 달 안에 꼭 끝낼 할 일(•)" 목록으로 활용합니다.',
  },
  {
    step: '03',
    title: '퓨처 로그',
    subtitle: 'Future Log · 미래 보관함',
    description:
      '다음 달 이후의 약속이나 언젠가 해야 할 일(예: 3개월 뒤 건강검진, 자동차 검사, 기념일)을 월별로 넣어두고 마음 편히 잊어버려도 되는 창고입니다. 해당 월이 오면 먼슬리 로그로 옮겨옵니다.',
  },
  {
    step: '04',
    title: '인덱스',
    subtitle: 'Index · 전체 목차 & 지도',
    description:
      '과거 기록을 찾아보거나, 미완료 할 일(•)이 남아 있는 달을 한눈에 확인하고 빠르게 점프할 때 사용합니다.',
  },
];

const BEGINNER_TIPS = [
  {
    num: '01',
    title: '하루 빼먹어도 전혀 괜찮습니다',
    body: '며칠 못 썼다고 죄책감 느끼거나 밀린 일기를 몰아 쓰지 마세요. 안 쓴 날은 그냥 비워두고, 오늘 날짜부터 다시 한 줄 쓰면 그게 정통 불렛저널입니다.',
  },
  {
    num: '02',
    title: '3번 이상 미룬(>) 할 일은 의심하세요',
    body: '계속 미뤄지는 일은 ① 진짜 할 필요 없는 일이거나 ② 너무 커서 시작이 막막한 일입니다. 과감히 지우거나 "10분 만에 끝낼 첫 행동"으로 작게 쪼개보세요.',
  },
  {
    num: '03',
    title: '문장을 완벽하게 쓰려 하지 마세요',
    body: '일기처럼 길게 쓰면 금방 지칩니다. 단어 2~3개짜리 짧은 메모 한 줄만 적어도 완벽한 기록입니다.',
  },
  {
    num: '04',
    title: '할 일(•)과 메모(-)를 구분하세요',
    body: '"운동해야 하는데..." 같은 생각은 메모(-)이고, "저녁 7시 30분 걷기"처럼 행동이 명확할 때만 할 일(•)로 적으면 실행력이 확 올라갑니다.',
  },
];

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('symbols');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-zinc-950/30 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6"
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 overflow-hidden">
        {/* Fixed Header */}
        <header className="shrink-0 border-b border-zinc-200 bg-white px-5 pt-5 pb-3 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                id="guide-modal-title"
                className="text-lg font-semibold tracking-tight text-zinc-900"
              >
                오리지널 불렛저널 사용법
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                라이더 캐롤 방식 · Bulletlog 핵심 가이드
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="가이드 닫기"
              className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Responsive Tabs */}
          <div
            role="tablist"
            aria-label="사용법 가이드 탭"
            className="mt-4 flex items-center gap-1 overflow-x-auto pb-0.5"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-h-[38px] md:min-h-[34px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          {/* TAB 1: 기호 & 입력 */}
          {activeTab === 'symbols' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-zinc-700">
                  오리지널 불렛저널(라이더 캐롤 방식)은 예쁘게 꾸미는 다이어리가 아니라, 머릿속을 빠르게 비우고 진짜 중요한 일만 남기는 기록법입니다. 길게 일기 쓰듯 적지 말고, 짧은 한 줄 앞에 기호만 붙여 빠르게 기록(래피드 로깅)하세요.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                  핵심 기호 6가지
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SYMBOLS_LIST.map((item) => (
                    <div
                      key={item.symbol}
                      className="rounded-xl border border-zinc-200/90 bg-white p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 font-mono text-base font-semibold text-zinc-900 shrink-0">
                          {item.symbol}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-zinc-900">
                            {item.name}
                          </span>
                          <span className="ml-1.5 text-xs text-zinc-400">
                            {item.english}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-zinc-600">
                        {item.meaning}
                      </p>

                      {item.note && (
                        <p className="text-xs leading-relaxed text-zinc-500 italic">
                          {item.note}
                        </p>
                      )}

                      {item.examples && item.examples.length > 0 && (
                        <div className="mt-auto pt-2 border-t border-zinc-100 space-y-1">
                          {item.examples.map((ex) => (
                            <div
                              key={ex}
                              className="font-mono text-xs text-zinc-500"
                            >
                              {ex}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                  Bulletlog 빠른 입력 단축키
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-[13px] leading-relaxed text-zinc-700">
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 pt-0.5">
                      <MonoBadge>. </MonoBadge>
                    </span>
                    <span>
                      입력창 맨 앞에 입력하면 할 일(<MonoBadge>•</MonoBadge>)로 자동 전환
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 pt-0.5 flex items-center gap-1">
                      <MonoBadge>o </MonoBadge>
                      <span className="text-zinc-400">/</span>
                      <MonoBadge>0 </MonoBadge>
                    </span>
                    <span>
                      입력창 맨 앞에 입력하면 일정(<MonoBadge>○</MonoBadge>)으로 자동 전환
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 pt-0.5">
                      <MonoBadge>o 14:30 치과</MonoBadge>
                    </span>
                    <span>
                      <MonoBadge>HH:mm </MonoBadge> 시간을 앞에 쓰면 해당 시간 일정으로 구글 캘린더에 등록 (시간 없이 쓰면 종일 일정)
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 pt-0.5">
                      <MonoBadge>- </MonoBadge>
                    </span>
                    <span>
                      입력창 맨 앞에 입력하면 메모(<MonoBadge>-</MonoBadge>)로 자동 전환
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 pt-0.5">
                      <MonoBadge>Ctrl + K</MonoBadge>
                    </span>
                    <span>PC에서 전체 기록 즉시 검색</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: 4대 로그 */}
          {activeTab === 'logs' && (
            <div className="space-y-5">
              <div className="space-y-3">
                {FOUR_LOGS.map((log) => (
                  <article
                    key={log.step}
                    className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="font-mono tabular-nums text-xs font-medium text-zinc-400">
                        {log.step}.
                      </span>
                      <h3 className="text-sm sm:text-[15px] font-semibold text-zinc-900">
                        {log.title}
                      </h3>
                      <span className="text-xs text-zinc-400">
                        {log.subtitle}
                      </span>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-600">
                      {log.description}
                    </p>
                  </article>
                ))}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5">
                <div className="text-xs font-semibold text-zinc-900 mb-2">
                  데이터 흐름 한눈에 보기
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-700 flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-zinc-900">퓨처 로그(미래)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>해당 월이 되면</span>
                  <span className="font-medium text-zinc-900">먼슬리 로그(월간)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>오늘 할 일은</span>
                  <span className="font-medium text-zinc-900">데일리 로그(일간)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>
                    월말에 남은 일은 다시 <MonoBadge>&gt;</MonoBadge> /{' '}
                    <MonoBadge>&lt;</MonoBadge> 로 정리!
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: 핵심 루틴 */}
          {activeTab === 'routine' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-4 sm:p-5">
                <p className="text-sm font-medium leading-relaxed text-zinc-800">
                  &ldquo;불렛저널의 진짜 힘은 &lsquo;적는 것&rsquo;보다 &lsquo;돌아보고 덜어내는 것&rsquo;에서 나옵니다.&rdquo;
                </p>
              </div>

              <div className="space-y-3">
                <article className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono tabular-nums text-xs text-zinc-400">
                      01.
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-semibold text-zinc-900">
                      아침 3분 (오늘 준비)
                    </h3>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-600">
                    오늘 데일리 로그를 열고, 어제 못 끝낸 할 일(<MonoBadge>•</MonoBadge>) 중 오늘 실제로 할 것만{' '}
                    <MonoBadge>&gt;</MonoBadge>(미루기)로 가져옵니다. 오늘 잡힌 일정(<MonoBadge>○</MonoBadge>)도 훑어봅니다.
                  </p>
                </article>

                <article className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono tabular-nums text-xs text-zinc-400">
                      02.
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-semibold text-zinc-900">
                      낮 동안 수시로 (래피드 로깅)
                    </h3>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-600">
                    머릿속에 떠오르는 할 일, 약속, 아이디어를 붙잡아두지 말고 데일리 로그에 한 줄씩 바로 던져두고 다시 하던 일에 집중합니다.
                  </p>
                </article>

                <article className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono tabular-nums text-xs text-zinc-400">
                      03.
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-semibold text-zinc-900">
                      밤 3분 (하루 마감)
                    </h3>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-600">
                    끝낸 일은 <MonoBadge>×</MonoBadge>로 체크하고, 오늘 있었던 의미 있는 일(<MonoBadge>○</MonoBadge>)이나 느낀 점(<MonoBadge>-</MonoBadge>)을 딱 1~2줄만 남기고 앱을 닫습니다.
                  </p>
                </article>

                <article className="rounded-xl border border-zinc-300 bg-zinc-50/50 p-4 sm:p-5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono tabular-nums text-xs text-zinc-500">
                      04.
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-semibold text-zinc-900">
                      매달 말일 10분 (월말 마이그레이션 — 가장 중요!)
                    </h3>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-600">
                    이번 달 데일리·먼슬리 로그를 훑어보며 완료(<MonoBadge>×</MonoBadge>)되지 않은{' '}
                    <MonoBadge>•</MonoBadge> 항목마다 스스로에게 질문합니다:
                  </p>
                  <p className="mt-2.5 text-sm font-semibold text-zinc-900">
                    &ldquo;이 일이 정말 내 시간과 에너지를 쓸 가치가 있나?&rdquo;
                  </p>
                  <ul className="mt-3 space-y-2 text-xs sm:text-[13px] leading-relaxed text-zinc-700">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-zinc-400 shrink-0">-</span>
                      <span>
                        가치 없다 → 죄책감 없이 과감히 <strong className="font-semibold text-zinc-900">삭제</strong> (불렛저널의 핵심은 할 일을 줄이는 것!)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-zinc-400 shrink-0">-</span>
                      <span>
                        다음 달에 해야 한다 → <MonoBadge>&gt;</MonoBadge> 눌러 다음 달{' '}
                        <strong className="font-semibold text-zinc-900">먼슬리 로그</strong>로 이동
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-zinc-400 shrink-0">-</span>
                      <span>
                        몇 달 뒤에 해도 된다 → <MonoBadge>&lt;</MonoBadge> 눌러{' '}
                        <strong className="font-semibold text-zinc-900">퓨처 로그</strong>로 이동
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-zinc-400 shrink-0">-</span>
                      <span>
                        마지막으로 다음 달 퓨처 로그에 적어둔 항목들을 새 먼슬리 로그로 옮겨옵니다.
                      </span>
                    </li>
                  </ul>
                </article>
              </div>
            </div>
          )}

          {/* TAB 4: 초보자 팁 */}
          {activeTab === 'tips' && (
            <div className="space-y-6">
              {/* Authentic Daily Log Example Card */}
              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="pb-3 mb-3 border-b border-zinc-100 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    오늘의 데일리 로그 예시
                  </h3>
                  <span className="text-xs text-zinc-400">실제 작성 모습</span>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-baseline gap-2.5">
                    <span className="w-5 text-center font-mono text-zinc-400 shrink-0">
                      ×
                    </span>
                    <span className="line-through text-zinc-400">
                      은행 이체하기
                    </span>
                  </li>
                  <li className="flex items-baseline gap-2.5">
                    <span className="w-5 text-center font-mono text-zinc-400 shrink-0">
                      &gt;
                    </span>
                    <span className="text-zinc-400">
                      이력서 초안 정리 (내일로 미룸)
                    </span>
                  </li>
                  <li className="flex items-baseline gap-2.5">
                    <span className="w-5 text-center font-mono text-base font-semibold text-zinc-900 shrink-0">
                      •
                    </span>
                    <span className="text-zinc-900">
                      저녁 장보기 (우유, 계란)
                    </span>
                  </li>
                  <li className="flex items-baseline gap-2.5">
                    <span className="w-5 text-center font-mono text-zinc-800 shrink-0">
                      ○
                    </span>
                    <span className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono tabular-nums text-xs text-zinc-500">
                        14:00
                      </span>
                      <span className="text-zinc-900">치과 정기검진</span>
                    </span>
                  </li>
                  <li className="flex items-baseline gap-2.5">
                    <span className="w-5 text-center font-mono text-zinc-500 shrink-0">
                      -
                    </span>
                    <span className="text-zinc-600">
                      아침에 할 일 3개만 적으니 훨씬 덜 지침
                    </span>
                  </li>
                  <li className="flex items-baseline gap-2.5">
                    <span className="w-5 text-center font-mono text-zinc-500 shrink-0">
                      -
                    </span>
                    <span className="text-zinc-600">
                      다음 주 팀 미팅 때 자동화 아이디어 제안해보기
                    </span>
                  </li>
                </ul>
              </section>

              {/* 4 Beginner Mistakes & Tips */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                  초보자가 가장 많이 하는 실수 & 극복 팁
                </h3>
                <div className="space-y-3">
                  {BEGINNER_TIPS.map((tip) => (
                    <article
                      key={tip.num}
                      className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono tabular-nums text-xs text-zinc-400">
                          {tip.num}.
                        </span>
                        <h4 className="text-sm font-semibold text-zinc-900">
                          {tip.title}
                        </h4>
                      </div>
                      <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-zinc-600">
                        {tip.body}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
