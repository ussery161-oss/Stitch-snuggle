// The one entry point screens use to say a line. P1-D routes it through AudioService.
import * as Speech from 'expo-speech';

import { lineText, type LineId } from './lines';

export function say(id: LineId): void {
  Speech.speak(lineText(id), { language: 'en-US', rate: 0.85 });
}
