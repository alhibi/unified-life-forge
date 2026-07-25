import React, { useCallback } from 'react';

interface Params {
  /** Drops are ignored unless a conversation is open to receive them. */
  enabled: boolean;
  onFiles: (files: File[]) => void;
}

export interface FileDropZone {
  isDraggingFiles: boolean;
  /** Spread onto the element that should accept the drop. */
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * Drag-and-drop file target with a nesting-safe hover state.
 *
 * The counter matters: `dragleave` fires when the pointer crosses into a child
 * element, so a naive boolean flickers off while the user is still over the
 * drop zone. Counting enter/leave pairs keeps the overlay stable.
 *
 * Extracted from ChatDrawer.tsx; behaviour unchanged, including the
 * `types.includes('Files')` guard that ignores text and link drags.
 */
export function useFileDropZone({ enabled, onFiles }: Params): FileDropZone {
  const [isDraggingFiles, setIsDraggingFiles] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;
      const types = Array.from(e.dataTransfer.types || []);
      if (!types.includes('Files')) return;
      e.preventDefault();
      dragCounterRef.current += 1;
      setIsDraggingFiles(true);
    },
    [enabled],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;
      const types = Array.from(e.dataTransfer.types || []);
      if (!types.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    [enabled],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setIsDraggingFiles(false);
    },
    [enabled],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) onFiles(files);
    },
    [enabled, onFiles],
  );

  // A conversation closing mid-drag would otherwise leave the overlay stuck on.
  React.useEffect(() => {
    if (!enabled) {
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);
    }
  }, [enabled]);

  return {
    isDraggingFiles,
    dragHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
