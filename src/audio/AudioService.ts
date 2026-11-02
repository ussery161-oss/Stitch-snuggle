// AudioService: the voice channel. Everything is local; nothing here touches the network.
//
// Lessons from Popsy Words, kept on purpose:
// - TWO clip players with preload-next. While a clip plays on one player, the next queued clip is
//   loaded on the other, so back-to-back lines start without a load gap (no choppy playback).
// - A FIFO queue. A new line never drops a queued one; it waits its turn. Only
//   say(id, { interrupt: true }) stops the current line and clears the queue (the N2 first-prompt
//   stall came from a new line silently replacing a queued one).
// - Every line always ends: a clip that never starts or never finishes, or a speech line whose
//   callbacks never come, is given up by a watchdog, so the queue can't get stuck.
// - A clip that fails falls back to expo-speech with the line's text.
//
// The service takes its players, speech engine and timers as dependencies, so the tests drive it
// with fakes. `audio` (bottom) is the app's singleton, built on expo-audio and expo-speech.
import type { LineId } from './lines';
import { voiceLookup, type VoiceSource } from './voiceLookup';

/** The part of expo-audio's AudioPlayer the service uses. */
export interface ClipPlayer {
  replace(source: number): void;
  play(): void;
  pause(): void;
  readonly isLoaded: boolean;
  addListener(event: 'playbackStatusUpdate', cb: (s: ClipStatus) => void): { remove(): void };
}

export interface ClipStatus {
  playing?: boolean;
  didJustFinish?: boolean;
  isLoaded?: boolean;
  duration?: number;
  playbackState?: string;
  error?: unknown;
}

export interface SpeechEngine {
  speak(text: string, cb: { onDone: () => void; onError: () => void }): void;
  stop(): void;
}

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface AudioDeps {
  players: [ClipPlayer, ClipPlayer] | [];
  speech: SpeechEngine;
  timers?: Timers;
  lookup?: (id: LineId) => VoiceSource;
}

export interface SayOptions {
  /** Stop the current line and clear the queue, then play this one now. */
  interrupt?: boolean;
  /** Runs once when this line has finished (never for a line cleared by interrupt/stop). */
  onDone?: () => void;
}

/** A clip not seen playing this long after play() falls back to speech. */
export const CLIP_START_MS = 1500;
/** A clip may run its duration plus this; unknown duration: CLIP_UNKNOWN_MS. */
export const CLIP_SLACK_MS = 1000;
export const CLIP_UNKNOWN_MS = 6000;
/** How long play() waits for a freshly loaded clip before trying anyway. */
export const LOAD_WAIT_MS = 800;
export const LOAD_POLL_MS = 50;

/** Speech that never reports back is given up after this long. */
export function speechWatchdogMs(text: string): number {
  return Math.min(9000, 2500 + 90 * text.length);
}

interface Line {
  id: LineId;
  source: VoiceSource;
  onDone?: () => void;
}

interface Slot {
  player: ClipPlayer;
  /** The clip loaded on this player (null: none). */
  clip: number | null;
}

type Phase = 'loading' | 'requested' | 'playing' | 'speaking';

const realTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export class AudioService {
  private readonly slots: Slot[];
  private readonly speech: SpeechEngine;
  private readonly timers: Timers;
  private readonly lookup: (id: LineId) => VoiceSource;
  private queue: Line[] = [];
  private current: Line | null = null;
  private currentSlot = -1;
  private phase: Phase = 'speaking';
  private token = 0;
  private timer: unknown = null;
  private poll: unknown = null;
  /** For tests and the dev overlay. */
  readonly stats = { clips: 0, speech: 0, fallbacks: 0, watchdogs: 0, preloads: 0 };

  constructor(deps: AudioDeps) {
    this.slots = deps.players.map((player) => ({ player, clip: null }));
    this.speech = deps.speech;
    this.timers = deps.timers ?? realTimers;
    this.lookup = deps.lookup ?? voiceLookup;
    this.slots.forEach((slot, i) => slot.player.addListener('playbackStatusUpdate', (s) => this.onStatus(i, s)));
  }

  /** Say a line now, or after the lines already queued (FIFO). */
  say(id: LineId, opts: SayOptions = {}): void {
    const line: Line = { id, source: this.lookup(id), onDone: opts.onDone };
    if (opts.interrupt) {
      this.stop();
      this.start(line);
      return;
    }
    if (this.current === null) this.start(line);
    else {
      this.queue.push(line);
      this.preloadNext();
    }
  }

  /** Silence the current line and clear the queue. No onDone runs. */
  stop(): void {
    this.token++;
    this.clearTimers();
    this.queue = [];
    if (this.current !== null) {
      this.current = null;
      this.pauseAll();
      try {
        this.speech.stop();
      } catch {
        // Already quiet.
      }
    }
  }

  get busy(): boolean {
    return this.current !== null;
  }

  /** The line playing now and the ones waiting, in order (for tests). */
  get lineIds(): LineId[] {
    return [...(this.current ? [this.current.id] : []), ...this.queue.map((l) => l.id)];
  }

  // ---------- internals ----------

  private start(line: Line): void {
    const token = ++this.token;
    this.current = line;
    this.clearTimers();
    if (line.source.kind === 'clip' && this.slots.length > 0) {
      this.stats.clips++;
      this.startClip(line, line.source.clip, token);
    } else {
      this.startSpeech(line.source.text, token);
    }
  }

  private startClip(line: Line, clip: number, token: number): void {
    // Preloaded on a player already? Then it plays at once with no load gap.
    let slot = this.slots.findIndex((s) => s.clip === clip);
    try {
      if (slot === -1) {
        slot = this.currentSlot === 0 ? 1 : 0;
        this.slots[slot].clip = clip;
        this.slots[slot].player.replace(clip);
      }
      this.currentSlot = slot;
      this.phase = 'loading';
      const player = this.slots[slot].player;
      if (player.isLoaded) this.requestPlay(token);
      else {
        this.timer = this.timers.setTimeout(() => this.requestPlay(token), LOAD_WAIT_MS);
        const check = () => {
          if (token !== this.token || this.phase !== 'loading') return;
          if (player.isLoaded) this.requestPlay(token);
          else this.poll = this.timers.setTimeout(check, LOAD_POLL_MS);
        };
        this.poll = this.timers.setTimeout(check, LOAD_POLL_MS);
      }
    } catch {
      this.fallBack(token);
    }
  }

  private requestPlay(token: number): void {
    if (token !== this.token || this.phase !== 'loading') return;
    this.clearTimers();
    this.phase = 'requested';
    try {
      this.slots[this.currentSlot].player.play();
    } catch {
      this.fallBack(token);
      return;
    }
    this.timer = this.timers.setTimeout(() => {
      if (token === this.token && this.phase === 'requested') this.fallBack(token);
    }, CLIP_START_MS);
    this.preloadNext();
  }

  /** Load the next queued clip on the other player while this one plays. */
  private preloadNext(): void {
    if (this.slots.length < 2 || this.current === null) return;
    const next = this.queue[0];
    if (!next || next.source.kind !== 'clip') return;
    const other = this.currentSlot === 0 ? 1 : 0;
    const slot = this.slots[other];
    if (slot.clip === next.source.clip) return;
    // Don't swap out the clip that's playing (a speech line leaves currentSlot pointing at the old one).
    if (this.current.source.kind === 'clip' && other === this.currentSlot) return;
    try {
      slot.clip = next.source.clip;
      slot.player.replace(next.source.clip);
      this.stats.preloads++;
    } catch {
      slot.clip = null;
    }
  }

  private onStatus(slotIndex: number, s: ClipStatus): void {
    if (this.current === null || slotIndex !== this.currentSlot || this.phase === 'speaking') return;
    const token = this.token;
    if (s.playbackState === 'failed' || s.error) {
      this.fallBack(token);
      return;
    }
    if (this.phase === 'loading') {
      if (s.isLoaded && !s.didJustFinish) this.requestPlay(token);
      return;
    }
    if (this.phase === 'requested') {
      // Statuses before the new clip is seen playing belong to the previous clip.
      if (!s.playing || s.didJustFinish) return;
      this.phase = 'playing';
      this.armFinish(token, s.duration ?? 0);
      return;
    }
    if (s.didJustFinish) {
      this.finish(token);
      return;
    }
    if ((s.duration ?? 0) > 0) this.armFinish(token, s.duration ?? 0);
  }

  private armFinish(token: number, durationS: number): void {
    this.clearTimers();
    const ms = durationS > 0 ? durationS * 1000 + CLIP_SLACK_MS : CLIP_UNKNOWN_MS;
    this.timer = this.timers.setTimeout(() => {
      if (token !== this.token) return;
      this.stats.watchdogs++;
      this.finish(token);
    }, ms);
  }

  private startSpeech(text: string, token: number): void {
    this.phase = 'speaking';
    this.stats.speech++;
    const done = () => this.finish(token);
    this.timer = this.timers.setTimeout(() => {
      if (token !== this.token) return;
      this.stats.watchdogs++;
      try {
        this.speech.stop();
      } catch {
        // ignore
      }
      this.finish(token);
    }, speechWatchdogMs(text));
    try {
      this.speech.speak(text, { onDone: done, onError: done });
    } catch {
      this.timers.setTimeout(done, 0);
    }
  }

  /** The clip can't play: say the line with expo-speech instead. */
  private fallBack(token: number): void {
    if (token !== this.token || this.current === null) return;
    this.stats.fallbacks++;
    this.clearTimers();
    this.pauseAll();
    this.startSpeech(this.current.source.text, token);
  }

  private finish(token: number): void {
    if (token !== this.token || this.current === null) return;
    this.clearTimers();
    const ended = this.current;
    this.current = null;
    this.token++;
    // That player's clip has played to its end: a replay of the same line must reload it.
    if (ended.source.kind === 'clip' && this.currentSlot >= 0 && this.slots[this.currentSlot]) this.slots[this.currentSlot].clip = null;
    const next = this.queue.shift();
    if (next) this.start(next);
    else if (ended.source.kind === 'clip') this.pauseAll();
    ended.onDone?.();
  }

  private pauseAll(): void {
    for (const s of this.slots) {
      try {
        s.player.pause();
      } catch {
        // Already stopped.
      }
    }
  }

  private clearTimers(): void {
    if (this.timer !== null) this.timers.clearTimeout(this.timer);
    if (this.poll !== null) this.timers.clearTimeout(this.poll);
    this.timer = null;
    this.poll = null;
  }
}
