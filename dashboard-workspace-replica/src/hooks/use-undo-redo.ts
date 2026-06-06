import { useState, useCallback, useRef } from 'react';
import type { EditorProject } from '@/components/visual-editor/types';

export function useUndoRedo(maxHistory = 50, debounceMs = 300) {
  const stackRef = useRef<{ past: EditorProject[]; future: EditorProject[] }>({
    past: [],
    future: [],
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const lastPushRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSnapshot = useCallback(
    (project: EditorProject) => {
      // Deep clone to avoid reference mutation issues
      const snapshot = JSON.parse(JSON.stringify(project)) as EditorProject;

      const now = Date.now();
      if (now - lastPushRef.current < debounceMs) {
        // Debounce: replace the top of the past stack
        const s = stackRef.current;
        if (s.past.length > 0) {
          s.past[s.past.length - 1] = snapshot;
        } else {
          s.past.push(snapshot);
        }
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => pushSnapshot(snapshot), debounceMs);
        return;
      }

      lastPushRef.current = now;
      const s = stackRef.current;
      s.past = [...s.past.slice(-(maxHistory - 1)), snapshot];
      s.future = [];
      setCanUndo(s.past.length > 1);
      setCanRedo(false);
    },
    [maxHistory, debounceMs]
  );

  const undo = useCallback((): EditorProject | null => {
    const s = stackRef.current;
    if (s.past.length <= 1) return null;
    const current = s.past.pop()!;
    s.future.unshift(current);
    setCanUndo(s.past.length > 1);
    setCanRedo(true);
    return JSON.parse(JSON.stringify(s.past[s.past.length - 1])) as EditorProject;
  }, []);

  const redo = useCallback((): EditorProject | null => {
    const s = stackRef.current;
    if (s.future.length === 0) return null;
    const next = s.future.shift()!;
    s.past.push(next);
    setCanUndo(true);
    setCanRedo(s.future.length > 0);
    return JSON.parse(JSON.stringify(next)) as EditorProject;
  }, []);

  const clear = useCallback(() => {
    stackRef.current = { past: [], future: [] };
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { pushSnapshot, undo, redo, clear, canUndo, canRedo };
}
