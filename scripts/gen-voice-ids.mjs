// npm run gen:voice-ids — writes assets/audio/VOICE_IDS.md from src/audio/lines.ts (the list
// Researcher 2 records from: each id is the file name assets/audio/lines/<id>.m4a).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src', 'audio', 'lines.ts'), 'utf8');
const body = src.slice(src.indexOf('export const LINES = {'), src.indexOf('} as const;'));
const rows = [...body.matchAll(/^\s*'([a-z0-9-]+)':\s*'((?:[^'\\]|\\.)*)',/gm)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
const dir = join(ROOT, 'assets', 'audio', 'lines');
const have = new Set(existsSync(dir) ? readdirSync(dir).map((f) => f.replace(/\.m4a$/, '')) : []);

const out = [
  '# Voice line ids — Stitch & Snuggle',
  'Bella (Kokoro-82M v1.0, voice af_bella). Each line is recorded to `assets/audio/lines/<id>.m4a`; then run `npm run gen:voice`.',
  'Lines without a clip are spoken by the device voice (expo-speech) until they are recorded.',
  '',
  '| Id | Text | Clip |',
  '|---|---|---|',
  ...rows.map(([id, text]) => `| \`${id}\` | ${text} | ${have.has(id) ? 'recorded' : 'to record'} |`),
  '',
].join('\n');
writeFileSync(join(ROOT, 'assets', 'audio', 'VOICE_IDS.md'), out);
console.log(`wrote assets/audio/VOICE_IDS.md (${rows.length} lines)`);
