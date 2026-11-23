import { CornerDownLeft } from 'lucide-react';
import { type ChangeEvent, type KeyboardEvent, useRef, useState } from 'react';
import type { BulletType } from '../types/journal';
import {
  detectRapidPrefix,
  getBulletSymbol,
  parseEventTimeAndContent,
} from '../utils/rapidInput';

interface RapidInputProps {
  onSubmit: (
    type: BulletType,
    rawText: string,
    priority?: boolean
  ) => void | Promise<void>;
  defaultType?: BulletType;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
  showHints?: boolean;
}

const TYPE_OPTIONS: Array<{
  type: BulletType;
  symbol: string;
  label: string;
  shortcut: string;
}> = [
  { type: 'task', symbol: '•', label: '할 일', shortcut: '. ' },
  { type: 'event', symbol: '○', label: '일정', shortcut: 'o ' },
  { type: 'note', symbol: '-', label: '메모', shortcut: '- ' },
];

export function RapidInput({
  onSubmit,
  defaultType = 'task',
  placeholder,
  compact = false,
  autoFocus = false,
  showHints = false,
}: RapidInputProps) {
  const [bulletType, setBulletType] = useState<BulletType>(defaultType);
  const [priority, setPriority] = useState(false);
  const [text, setText] = useState('');
  const isComposingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsedEventPreview =
    bulletType === 'event' ? parseEventTimeAndContent(text) : null;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { detectedType, detectedPriority, remainingText } =
      detectRapidPrefix(raw);

    if (detectedType) {
      setBulletType(detectedType);
      if (detectedPriority) {
        setPriority(true);
      } else if (detectedType !== 'task') {
        setPriority(false);
      }
      setText(remainingText);
      return;
    }

    setText(raw);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Safeguard for pasted text starting with "* " or "* . "
    const detected = detectRapidPrefix(trimmed);
    const effectiveType = detected.detectedType ?? bulletType;
    const effectivePriority = detected.detectedPriority || priority;
    const effectiveText = detected.detectedType
      ? detected.remainingText.trim()
      : trimmed;

    if (!effectiveText) return;

    await onSubmit(effectiveType, effectiveText, effectivePriority);
    setText('');
    setPriority(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && text === '' && priority) {
      setPriority(false);
      return;
    }

    if (e.key === 'Enter') {
      // Prevent duplicate submission during Korean IME composition
      if (isComposingRef.current || e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      void handleSubmit();
    }
  };

  const cycleBulletType = () => {
    const idx = TYPE_OPTIONS.findIndex((o) => o.type === bulletType);
    const next = TYPE_OPTIONS[(idx + 1) % TYPE_OPTIONS.length];
    setBulletType(next.type);
    inputRef.current?.focus();
  };

  const resolvedPlaceholder =
    placeholder ??
    (bulletType === 'task'
      ? '할 일 입력 (. 할 일, * 중요, o 일정, - 메모)'
      : bulletType === 'event'
        ? '일정 입력 (예: 14:30 치과)'
        : '메모 입력');

  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white transition-colors focus-within:border-zinc-400 ${
          compact ? 'px-1.5 py-1' : 'px-2 py-1.5'
        }`}
      >
        {compact ? (
          <button
            type="button"
            onClick={cycleBulletType}
            title="기호 전환 (클릭 또는 . / o / - 입력)"
            aria-label={`현재 기호 ${TYPE_OPTIONS.find((o) => o.type === bulletType)?.label}, 클릭하여 변경`}
            className="flex items-center justify-center w-10 h-10 md:w-7 md:h-7 shrink-0 rounded-md font-mono text-base text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          >
            {getBulletSymbol(bulletType, 'open')}
          </button>
        ) : (
          <div
            className="flex items-center shrink-0 rounded-md bg-zinc-100 p-0.5"
            role="group"
            aria-label="불렛 기호 선택"
          >
            {TYPE_OPTIONS.map((option) => {
              const active = bulletType === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setBulletType(option.type);
                    inputRef.current?.focus();
                  }}
                  title={`${option.label} (${option.shortcut.trim()} + 스페이스)`}
                  aria-label={option.label}
                  aria-pressed={active}
                  className={`flex items-center justify-center min-w-[36px] h-9 md:min-w-[30px] md:h-7 rounded font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                    active
                      ? 'bg-white text-zinc-900 shadow-xs font-medium'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {option.symbol}
                </button>
              );
            })}
          </div>
        )}

        {priority && (
          <button
            type="button"
            onClick={() => {
              setPriority(false);
              inputRef.current?.focus();
            }}
            title="중요 표시(*) 해제"
            aria-label="중요 표시 해제"
            className="inline-flex items-center justify-center px-1.5 h-6 rounded bg-amber-50 border border-amber-200 text-amber-600 font-semibold text-sm leading-none shrink-0 hover:bg-amber-100 transition-colors"
          >
            *
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          autoFocus={autoFocus}
          placeholder={resolvedPlaceholder}
          aria-label={resolvedPlaceholder}
          className={`flex-1 min-w-0 bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none ${
            compact ? 'text-sm py-1.5' : 'text-[15px] py-1.5 px-1'
          }`}
        />

        {parsedEventPreview?.eventTime && (
          <span className="shrink-0 font-mono tabular-nums text-xs text-zinc-500 px-1.5">
            {parsedEventPreview.eventTime}
          </span>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!text.trim()}
          aria-label="항목 추가"
          className={`flex items-center justify-center shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
            compact ? 'w-10 h-10 md:w-7 md:h-7' : 'w-10 h-10 md:w-8 md:h-8'
          } ${
            text.trim()
              ? 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950'
              : 'text-zinc-300 cursor-not-allowed'
          }`}
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>

      {showHints && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 px-1">
          <span>
            <code className="font-mono text-zinc-500">. </code>할 일
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <code className="font-mono text-zinc-500">* </code>중요 할 일
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <code className="font-mono text-zinc-500">o </code>일정 (예: 14:30 치과)
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <code className="font-mono text-zinc-500">- </code>메모
          </span>
          <span aria-hidden="true" className="hidden md:inline">
            ·
          </span>
          <span className="hidden md:inline">Enter로 연속 입력</span>
        </div>
      )}
    </div>
  );
}
