// P1-D: queue order, interrupt, preload-next on the second player, clip → speech fallback, and
// the watchdogs that keep a line from stalling the queue.
import { AudioService, CLIP_START_MS, speechWatchdogMs, type ClipPlayer, type ClipStatus } from '../src/audio/AudioService';
import { LINE_IDS, lineText, type LineId } from '../src/audio/lines';
import { missingClips, setLineClipsForTests, voiceLookup, type VoiceSource } from '../src/audio/voiceLookup';

class FakePlayer implements ClipPlayer {
  loaded: number | null = null;
  isLoaded = false;
  playing = false;
  replaces: number[] = [];
  plays = 0;
  private cbs: ((s: ClipStatus) => void)[] = [];
  replace(source: number) {
    this.loaded = source;
    this.replaces.push(source);
    this.isLoaded = true;
    this.playing = false;
  }
  play() {
    this.plays++;
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  addListener(_e: 'playbackStatusUpdate', cb: (s: ClipStatus) => void) {
    this.cbs.push(cb);
    return { remove: () => {} };
  }
  emit(s: ClipStatus) {
    this.cbs.forEach((cb) => cb(s));
  }
  /** The clip starts, then (optionally) finishes. */
  startPlaying(duration = 1) {
    this.emit({ playing: true, isLoaded: true, duration });
  }
  finish() {
    this.playing = false;
    this.emit({ playing: false, didJustFinish: true, isLoaded: true });
  }
}

class FakeSpeech {
  spoken: string[] = [];
  pending: { text: string; onDone: () => void }[] = [];
  stops = 0;
  speak(text: string, cb: { onDone: () => void; onError: () => void }) {
    this.spoken.push(text);
    this.pending.push({ text, onDone: cb.onDone });
  }
  stop() {
    this.stops++;
  }
  /** The oldest unfinished utterance ends. */
  finishNext() {
    this.pending.shift()?.onDone();
  }
}

// Clip ids for the fake manifest: every line in CLIPPED has a recorded clip.
const CLIPPED: Partial<Record<LineId, number>> = { 'praise-1': 101, 'praise-2': 102, 'thank-you': 103 };
const lookup = (id: LineId): VoiceSource =>
  CLIPPED[id] !== undefined ? { kind: 'clip', id, clip: CLIPPED[id]!, text: lineText(id) } : { kind: 'speech', id, text: lineText(id) };

function setup(players = true) {
  const a = new FakePlayer();
  const b = new FakePlayer();
  const speech = new FakeSpeech();
  const svc = new AudioService({ players: players ? [a, b] : [], speech, lookup });
  return { a, b, speech, svc };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('AudioService queue', () => {
  it('plays lines in FIFO order; a new line never drops a queued one', () => {
    const { speech, svc } = setup();
    const done: string[] = [];
    svc.say('every-toy-loved', { onDone: () => done.push('a') });
    svc.say('ouch-thanks', { onDone: () => done.push('b') });
    svc.say('hold-to-go-home', { onDone: () => done.push('c') });
    expect(svc.lineIds).toEqual(['every-toy-loved', 'ouch-thanks', 'hold-to-go-home']);
    expect(speech.spoken).toEqual(['Every toy is loved!']);
    speech.finishNext();
    expect(speech.spoken).toEqual(['Every toy is loved!', 'Ouch… thank you!']);
    speech.finishNext();
    speech.finishNext();
    expect(done).toEqual(['a', 'b', 'c']);
    expect(svc.busy).toBe(false);
  });

  it('interrupt stops the current line, clears the queue and plays at once', () => {
    const { speech, svc } = setup();
    const done: string[] = [];
    svc.say('every-toy-loved', { onDone: () => done.push('a') });
    svc.say('ouch-thanks', { onDone: () => done.push('b') });
    svc.say('hold-to-go-home', { interrupt: true, onDone: () => done.push('c') });
    expect(speech.stops).toBe(1);
    expect(svc.lineIds).toEqual(['hold-to-go-home']);
    // The interrupted line's late callback is ignored.
    speech.finishNext();
    expect(done).toEqual([]);
    speech.finishNext();
    expect(done).toEqual(['c']);
  });

  it('stop() silences everything and runs no onDone', () => {
    const { speech, svc } = setup();
    const onDone = jest.fn();
    svc.say('every-toy-loved', { onDone });
    svc.say('ouch-thanks', { onDone });
    svc.stop();
    speech.finishNext();
    expect(onDone).not.toHaveBeenCalled();
    expect(svc.busy).toBe(false);
  });
});

describe('AudioService clips (two players, preload next)', () => {
  it('plays a recorded clip and preloads the next queued clip on the other player', () => {
    const { a, b, svc } = setup();
    svc.say('praise-1');
    svc.say('praise-2');
    expect(a.replaces).toEqual([101]);
    expect(a.plays).toBe(1);
    // While praise-1 plays, praise-2 is already loading on player B.
    expect(b.replaces).toEqual([102]);
    a.startPlaying();
    a.finish();
    // praise-2 starts on B immediately, with no new load.
    expect(b.plays).toBe(1);
    expect(b.replaces).toEqual([102]);
    expect(svc.stats.preloads).toBe(1);
  });

  it('a clip and a speech line can follow each other', () => {
    const { a, speech, svc } = setup();
    const done: string[] = [];
    svc.say('praise-1', { onDone: () => done.push('clip') });
    svc.say('ouch-thanks', { onDone: () => done.push('tts') });
    a.startPlaying();
    a.finish();
    expect(speech.spoken).toEqual(['Ouch… thank you!']);
    speech.finishNext();
    expect(done).toEqual(['clip', 'tts']);
  });

  it('the same clip said twice reloads it (it played to its end)', () => {
    const { a, b, svc } = setup();
    svc.say('praise-1');
    a.startPlaying();
    a.finish();
    svc.say('praise-1');
    expect([...a.replaces, ...b.replaces].filter((c) => c === 101)).toHaveLength(2);
  });

  it('a clip that never starts falls back to speech with its text', () => {
    const { speech, svc } = setup();
    const onDone = jest.fn();
    svc.say('thank-you', { onDone });
    jest.advanceTimersByTime(CLIP_START_MS + 10);
    expect(speech.spoken).toEqual(['Thank you!']);
    expect(svc.stats.fallbacks).toBe(1);
    speech.finishNext();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('a player error falls back to speech', () => {
    const { a, speech, svc } = setup();
    svc.say('thank-you');
    a.emit({ playbackState: 'failed' });
    expect(speech.spoken).toEqual(['Thank you!']);
  });

  it('a clip that never finishes is ended by its watchdog, and the queue moves on', () => {
    const { a, b, svc } = setup();
    svc.say('praise-1');
    svc.say('praise-2');
    a.startPlaying(1);
    jest.advanceTimersByTime(2100);
    expect(b.plays).toBe(1);
  });

  it('with no players every line uses speech', () => {
    const { speech, svc } = setup(false);
    svc.say('praise-1');
    expect(speech.spoken).toEqual(['Great job!']);
  });
});

describe('speech watchdog', () => {
  it('ends a speech line whose callbacks never come', () => {
    const { speech, svc } = setup();
    const onDone = jest.fn();
    svc.say('every-toy-loved', { onDone });
    svc.say('ouch-thanks');
    jest.advanceTimersByTime(speechWatchdogMs('Every toy is loved!') + 10);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(speech.spoken).toEqual(['Every toy is loved!', 'Ouch… thank you!']);
  });
});

describe('voiceLookup', () => {
  afterEach(() => setLineClipsForTests(null));

  it('falls back to speech with the line text when no clip is recorded', () => {
    setLineClipsForTests({});
    expect(voiceLookup('thank-you')).toEqual({ kind: 'speech', id: 'thank-you', text: 'Thank you!' });
  });

  it('returns the clip when assets/audio/lines/<id>.m4a exists', () => {
    setLineClipsForTests({ 'thank-you': 7 });
    expect(voiceLookup('thank-you')).toEqual({ kind: 'clip', id: 'thank-you', clip: 7, text: 'Thank you!' });
    expect(missingClips(['thank-you', 'praise-1'])).toEqual(['praise-1']);
  });

  it('every line has text', () => {
    for (const id of LINE_IDS) expect(lineText(id).length).toBeGreaterThan(0);
  });
});
