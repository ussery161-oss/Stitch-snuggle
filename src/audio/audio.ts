// The app's AudioService singleton, on expo-audio (two clip players) and expo-speech.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import { AudioService, type ClipPlayer, type SpeechEngine } from './AudioService';

const VOICE = { language: 'en-US', rate: 0.85, pitch: 1.05 } as const;

const speech: SpeechEngine = {
  speak(text, cb) {
    Speech.speak(text, { ...VOICE, onDone: cb.onDone, onError: cb.onError, onStopped: cb.onDone });
  },
  stop() {
    Speech.stop().catch(() => {});
  },
};

function makePlayers(): [ClipPlayer, ClipPlayer] | [] {
  try {
    return [createAudioPlayer(null) as unknown as ClipPlayer, createAudioPlayer(null) as unknown as ClipPlayer];
  } catch {
    // No players (unlikely): every line uses speech.
    return [];
  }
}

let service: AudioService | null = null;

/** The shared AudioService (created on first use). */
export function audio(): AudioService {
  if (service === null) {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' }).catch(() => {});
    service = new AudioService({ players: makePlayers(), speech });
  }
  return service;
}
