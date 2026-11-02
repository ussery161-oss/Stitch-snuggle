// voiceLookup(id): the recorded Bella clip for a line when assets/audio/lines/<id>.m4a exists,
// otherwise the line's text for expo-speech.
import { lineText, type LineId } from './lines';
import { LINE_CLIPS } from './voiceManifest.generated';

export type VoiceSource = { kind: 'clip'; id: LineId; clip: number; text: string } | { kind: 'speech'; id: LineId; text: string };

let clips: Readonly<Record<string, number>> = LINE_CLIPS;

export function voiceLookup(id: LineId): VoiceSource {
  const clip = clips[id];
  return clip !== undefined ? { kind: 'clip', id, clip, text: lineText(id) } : { kind: 'speech', id, text: lineText(id) };
}

/** Line ids that have no recorded clip yet (for the PR's "For Researcher 2 to record" list). */
export function missingClips(ids: readonly LineId[]): LineId[] {
  return ids.filter((id) => clips[id] === undefined);
}

/** Tests only: pretend these clips exist (null restores the real manifest). */
export function setLineClipsForTests(next: Record<string, number> | null): void {
  clips = next ?? LINE_CLIPS;
}
