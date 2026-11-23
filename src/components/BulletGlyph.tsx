import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { BulletType, TaskStatus } from '../types/journal';
import { getBulletLabel } from '../utils/rapidInput';

interface BulletGlyphProps {
  type: BulletType;
  status: TaskStatus;
  interactive?: boolean;
  onClick?: () => void;
}

function renderSymbol(type: BulletType, status: TaskStatus) {
  if (type === 'event') {
    return (
      <span
        aria-hidden="true"
        className="w-2.5 h-2.5 rounded-full border-[1.5px] border-neutral-700"
      />
    );
  }

  if (type === 'note') {
    return (
      <span
        aria-hidden="true"
        className="w-2.5 h-[1.5px] rounded-full bg-neutral-500"
      />
    );
  }

  switch (status) {
    case 'done':
      return (
        <X
          aria-hidden="true"
          className="w-3.5 h-3.5 text-neutral-400"
          strokeWidth={2.2}
        />
      );
    case 'migrated':
      return (
        <ChevronRight
          aria-hidden="true"
          className="w-3.5 h-3.5 text-neutral-400"
          strokeWidth={2.2}
        />
      );
    case 'scheduled':
      return (
        <ChevronLeft
          aria-hidden="true"
          className="w-3.5 h-3.5 text-neutral-400"
          strokeWidth={2.2}
        />
      );
    case 'cancelled':
      return (
        <span
          aria-hidden="true"
          className="w-2.5 h-[1.5px] rounded-full bg-neutral-300"
        />
      );
    case 'open':
    default:
      return (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-neutral-800"
        />
      );
  }
}

export function BulletGlyph({
  type,
  status,
  interactive = false,
  onClick,
}: BulletGlyphProps) {
  const label = getBulletLabel(type, status);
  const symbolNode = renderSymbol(type, status);

  if (!interactive) {
    return (
      <span
        aria-label={label}
        className="w-7 h-6 p-0 m-0 flex items-center justify-center shrink-0 select-none"
      >
        {symbolNode}
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
      className="relative w-7 h-6 p-0 m-0 flex items-center justify-center shrink-0 rounded-md transition-colors hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 before:content-[''] before:absolute before:-inset-2 md:before:inset-0"
    >
      {symbolNode}
    </button>
  );
}
