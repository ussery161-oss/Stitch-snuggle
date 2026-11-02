// Captions (a parent setting, off by default): the line being spoken, for the caption bar.
import { useSyncExternalStore } from 'react';

let current: string | null = null;
const listeners = new Set<() => void>();

export function setCaption(text: string | null): void {
  current = text;
  listeners.forEach((l) => l());
}

export function useCaption(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => current,
  );
}
