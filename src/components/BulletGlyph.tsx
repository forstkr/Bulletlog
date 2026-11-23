import type { BulletType, TaskStatus } from '../types/journal';
import { getBulletLabel, getBulletSymbol } from '../utils/rapidInput';

interface BulletGlyphProps {
  type: BulletType;
  status: TaskStatus;
  interactive?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function BulletGlyph({
  type,
  status,
  interactive = false,
  onClick,
  size = 'md',
}: BulletGlyphProps) {
  const symbol = getBulletSymbol(type, status);
  const label = getBulletLabel(type, status);

  const colorClass = (() => {
    if (type === 'event') return 'text-zinc-800';
    if (type === 'note') return 'text-zinc-500';
    if (status === 'open') return 'text-zinc-900';
    if (status === 'done') return 'text-zinc-400';
    return 'text-zinc-400';
  })();

  const glyphSizeClass =
    type === 'task' && status === 'open'
      ? size === 'sm'
        ? 'text-base leading-none'
        : 'text-xl leading-none'
      : size === 'sm'
        ? 'text-sm leading-none'
        : 'text-base leading-none';

  if (!interactive) {
    return (
      <span
        aria-label={label}
        className={`inline-flex items-center justify-center font-mono select-none ${colorClass} ${glyphSizeClass}`}
      >
        {symbol}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        type === 'task'
          ? status === 'open'
            ? '할 일 완료로 표시'
            : '할 일 미완료로 되돌리기'
          : label
      }
      title={
        type === 'task'
          ? status === 'open'
            ? '완료로 표시 (×)'
            : '미완료로 되돌리기 (•)'
          : label
      }
      className={`inline-flex items-center justify-center shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
        size === 'sm'
          ? 'w-9 h-9 md:w-7 md:h-7'
          : 'w-10 h-10 md:w-8 md:h-8'
      } ${
        type === 'task'
          ? 'hover:bg-zinc-100 active:bg-zinc-200'
          : 'cursor-default'
      }`}
    >
      <span className={`font-mono select-none ${colorClass} ${glyphSizeClass}`}>
        {symbol}
      </span>
    </button>
  );
}
