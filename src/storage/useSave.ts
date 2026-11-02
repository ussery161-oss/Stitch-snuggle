// React access to the save: the current value (re-renders on change) and the store to update it.
import { useSyncExternalStore } from 'react';

import type { Save } from './schema';
import { saveStore } from './saveStore';

export function useSave(): Save {
  return useSyncExternalStore(
    (cb) => saveStore.subscribe(cb),
    () => saveStore.current,
  );
}

export { saveStore };
