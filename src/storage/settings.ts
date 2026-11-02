// Grown-up settings kept on the device (AsyncStorage; nothing leaves the device). P1 has the age
// band, which caps the care steps per visit. P2 replaces this with the full save schema.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AgeBand } from '../clinic/visit';

export const SETTINGS_KEY = 'stitch-snuggle/settings/v0';

export interface Settings {
  age: AgeBand;
}

export const DEFAULT_SETTINGS: Settings = { age: '3-5' };

/** Parses stored settings; anything unreadable falls back to the defaults. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    return { age: v.age === '6-7' ? '6-7' : '3-5' };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    return parseSettings(await AsyncStorage.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Not saved this time; the app keeps working with what it has.
  }
}
