import { type DragEvent, useCallback, useEffect, useState } from 'react';
import type { JournalEntry } from '../types/journal';

export type DropPosition = 'before' | 'after';

export interface DropIndicator {
  targetId: string;
  position: DropPosition;
}

export interface EntryDragProps {
  draggable: boolean;
  isDragging: boolean;
  dropPosition: DropPosition | null;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

export function useListReorder(
  items: JournalEntry[],
  onReorder: (orderedEntries: JournalEntry[]) => void | Promise<void>
) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : false
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (!e.matches) {
        setDraggedId(null);
        setDropIndicator(null);
      }
    };
    setIsDesktop(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const moveItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return;

      const nextList = [...items];
      const [moved] = nextList.splice(index, 1);
      nextList.splice(targetIndex, 0, moved);
      void onReorder(nextList);
    },
    [items, onReorder]
  );

  const getDragProps = useCallback(
    (entry: JournalEntry): EntryDragProps => {
      const canDrag = isDesktop && items.length > 1;

      return {
        draggable: canDrag,
        isDragging: draggedId === entry.id,
        dropPosition:
          dropIndicator && dropIndicator.targetId === entry.id
            ? dropIndicator.position
            : null,
        onDragStart: (e: DragEvent<HTMLDivElement>) => {
          if (!canDrag) {
            e.preventDefault();
            return;
          }
          setDraggedId(entry.id);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', entry.id);
        },
        onDragOver: (e: DragEvent<HTMLDivElement>) => {
          if (!canDrag || !draggedId || draggedId === entry.id) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          const rect = e.currentTarget.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          const position: DropPosition =
            e.clientY < midpoint ? 'before' : 'after';

          setDropIndicator((prev) =>
            prev?.targetId === entry.id && prev.position === position
              ? prev
              : { targetId: entry.id, position }
          );
        },
        onDragLeave: (e: DragEvent<HTMLDivElement>) => {
          if (
            e.relatedTarget &&
            e.currentTarget.contains(e.relatedTarget as Node)
          ) {
            return;
          }
          setDropIndicator((prev) =>
            prev?.targetId === entry.id ? null : prev
          );
        },
        onDrop: (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          const sourceId = draggedId || e.dataTransfer.getData('text/plain');
          const rect = e.currentTarget.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          const position: DropPosition =
            dropIndicator?.targetId === entry.id
              ? dropIndicator.position
              : e.clientY < midpoint
                ? 'before'
                : 'after';

          setDraggedId(null);
          setDropIndicator(null);

          if (!sourceId || sourceId === entry.id) return;

          const sourceIndex = items.findIndex((item) => item.id === sourceId);
          if (sourceIndex === -1) return;

          const remaining = items.filter((item) => item.id !== sourceId);
          const targetIndexInRemaining = remaining.findIndex(
            (item) => item.id === entry.id
          );
          if (targetIndexInRemaining === -1) return;

          const insertIndex =
            position === 'before'
              ? targetIndexInRemaining
              : targetIndexInRemaining + 1;

          const nextList = [...remaining];
          nextList.splice(insertIndex, 0, items[sourceIndex]);

          const hasOrderChanged = nextList.some(
            (item, idx) => item.id !== items[idx].id
          );
          if (!hasOrderChanged) return;

          void onReorder(nextList);
        },
        onDragEnd: () => {
          setDraggedId(null);
          setDropIndicator(null);
        },
      };
    },
    [isDesktop, items, draggedId, dropIndicator, onReorder]
  );

  return {
    moveItem,
    getDragProps,
  };
}
