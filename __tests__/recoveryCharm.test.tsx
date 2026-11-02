// P1-H: the recovery room and the one tiny heart-and-cross charm (approved): 28 pt on iPad, 22 pt
// on iPhone, #F2C94C at 60 %, no touches, not animated, not voiced. Nothing else religious in the
// child flow (the credits verse lives in the parent area, P2).
import { act, render, screen } from '@testing-library/react-native';

import RecoveryRoom, { RECOVERY_MS, waveTransform } from '../src/clinic/RecoveryRoom';
import WallCharm, { CHARM_COLOR, CHARM_ID, CHARM_OPACITY, CHARM_SCENE_POS, charmSize } from '../src/clinic/WallCharm';
import { art, artData } from '../src/art';
import { PRESETS } from '../src/plush/spec';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const SRC = path.join(__dirname, '..', 'src');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('wall charm', () => {
  it('is 28 pt on iPad and 22 pt on iPhone, soft gold at 60 %', () => {
    expect(charmSize(false)).toBe(28);
    expect(charmSize(true)).toBe(22);
    expect(CHARM_COLOR).toBe('#F2C94C');
    expect(CHARM_OPACITY).toBe(0.6);
  });

  it('uses the approved art and the scenes.json position', () => {
    expect(art(CHARM_ID)).not.toBeNull();
    const scenes = artData<{ scene_recovery: { wall_charm: { pos: number[] } } }>('ui/scenes/scenes')!;
    expect(CHARM_SCENE_POS).toEqual(scenes.scene_recovery.wall_charm.pos);
  });

  it('takes no touches and is hidden from VoiceOver', async () => {
    await render(<WallCharm x={100} y={100} isPhone={false} />);
    const v = screen.getByTestId('wall-charm', { includeHiddenElements: true });
    expect(v.props.pointerEvents).toBe('none');
    const style = Object.assign({}, ...[v.props.style].flat(3));
    expect(style.width).toBe(28);
    expect(style.opacity).toBe(0.6);
  });

  it('is not animated and not voiced (static check)', () => {
    const src = fs.readFileSync(path.join(SRC, 'clinic', 'WallCharm.tsx'), 'utf8');
    expect(src).not.toMatch(/react-native-reanimated|useSharedValue|withTiming|withRepeat|say\(|audio/);
  });

  it('is the only religious element in the child flow', () => {
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const hits = walk(SRC)
      .filter((f) => !f.includes(`${path.sep}parent${path.sep}`))
      .flatMap((f) =>
        fs
          .readFileSync(f, 'utf8')
          .split('\n')
          .filter((l) => /\b(God|Jesus|Lord|Christ|Bible|pray\w*|church|verse)\b/.test(l))
          .map((l) => `${path.relative(SRC, f)}: ${l.trim()}`),
      );
    expect(hits).toEqual([]);
    const charmUsers = walk(SRC).filter((f) => !f.endsWith('WallCharm.tsx') && fs.readFileSync(f, 'utf8').includes('WallCharm'));
    expect(charmUsers.map((f) => path.relative(SRC, f).split(path.sep).join('/'))).toEqual(['clinic/RecoveryRoom.tsx']);
  });
});

describe('recovery room', () => {
  it('shows the plushie and the charm for 3 seconds, then finishes', async () => {
    const onDone = jest.fn();
    await render(<RecoveryRoom spec={PRESETS.bunny} repairs={[]} onDone={onDone} />);
    expect(screen.getByTestId('recovery-room')).toBeTruthy();
    expect(screen.getByTestId('wall-charm', { includeHiddenElements: true })).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(RECOVERY_MS - 10);
    });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(20);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('waves the arm around its shoulder', () => {
    const a = waveTransform({ x: 10, y: 20 }, 0);
    const b = waveTransform({ x: 10, y: 20 }, 1);
    expect(a[0]).toEqual({ translateX: 10 });
    expect((a[2] as { rotate: number }).rotate).not.toBe((b[2] as { rotate: number }).rotate);
  });
});
