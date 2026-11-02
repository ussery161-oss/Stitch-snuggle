// The save on the device (AsyncStorage). One in-memory copy; every change is written back. Never
// throws: a failed read starts from defaults, a failed write keeps the app working.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultSave, loadFrom, type Save } from './schema';

export const SAVE_KEY = 'stitch-snuggle/save';
/** P1's settings key, migrated into the save (v0 → v1). */
export const V0_SETTINGS_KEY = 'stitch-snuggle/settings/v0';

type Listener = (s: Save) => void;

export class SaveStore {
  private save: Save = defaultSave();
  private loaded = false;
  private listeners = new Set<Listener>();
  private writing: Promise<void> = Promise.resolve();

  get current(): Save {
    return this.save;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  async load(): Promise<Save> {
    try {
      const [raw, v0] = await Promise.all([AsyncStorage.getItem(SAVE_KEY), AsyncStorage.getItem(V0_SETTINGS_KEY)]);
      const { save } = loadFrom(raw, raw === null ? v0 : null);
      this.save = save;
      if (raw === null) await this.persist();
    } catch {
      this.save = defaultSave();
    }
    this.loaded = true;
    this.emit();
    return this.save;
  }

  /** Applies a change and writes it. */
  update(fn: (s: Save) => Save): Save {
    this.save = fn(this.save);
    this.emit();
    void this.persist();
    return this.save;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  /** Resolves once every pending write has finished (tests, before the app goes to background). */
  flush(): Promise<void> {
    return this.writing;
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.save);
    this.writing = this.writing.then(() => AsyncStorage.setItem(SAVE_KEY, snapshot)).catch(() => {});
    return this.writing;
  }

  private emit(): void {
    this.listeners.forEach((l) => l(this.save));
  }
}

export const saveStore = new SaveStore();
