// P1-D: assets/audio/VOICE_IDS.md lists every line id with its exact text (for Researcher 2),
// and the generated voice manifest matches assets/audio/lines/.
import { LINE_IDS, lineText } from '../src/audio/lines';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const { execFileSync } = require('child_process') as typeof import('child_process');

const ROOT = path.join(__dirname, '..');

describe('voice ids', () => {
  it('VOICE_IDS.md lists every line with its exact text', () => {
    const md = fs.readFileSync(path.join(ROOT, 'assets', 'audio', 'VOICE_IDS.md'), 'utf8');
    for (const id of LINE_IDS) expect(md).toContain(`| \`${id}\` | ${lineText(id)} |`);
  });

  it('line ids are safe file names', () => {
    for (const id of LINE_IDS) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('the voice manifest is in sync with assets/audio/lines (run `npm run gen:voice`)', () => {
    const fresh = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', "import { buildVoiceManifest } from './scripts/gen-voice-manifest.mjs'; process.stdout.write(buildVoiceManifest());"],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(fs.readFileSync(path.join(ROOT, 'src', 'audio', 'voiceManifest.generated.ts'), 'utf8') === fresh).toBe(true);
  });
});
