// Drag-from-the-tray gesture (Patch swatches, cotton puffs, Dress items). Touching an item picks it
// up; it follows the finger on the UI thread; letting go hands the drop to JS. A touch that isn't
// on an item and hardly moves counts as a tap (Dress: tap a worn item to take it off).
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export interface TrayItem {
  x: number;
  y: number;
  /** Touch radius (pt). */
  r: number;
}

/** The tray item under (x, y), or -1. */
export function hitItem(items: readonly TrayItem[], x: number, y: number): number {
  'worklet';
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < items.length; i++) {
    const dx = items[i].x - x;
    const dy = items[i].y - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= items[i].r && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/** A move shorter than this (pt) is a tap. */
export const TAP_SLOP = 12;

export function useTrayDrag(opts: {
  testId: string;
  items: readonly TrayItem[];
  onDrop: (index: number, x: number, y: number) => void;
  onTap?: (x: number, y: number) => void;
  onPick?: (index: number) => void;
}) {
  const picked = useSharedValue(-1);
  const dragX = useSharedValue(-999);
  const dragY = useSharedValue(-999);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const moved = useSharedValue(false);
  const { items, onDrop, onTap, onPick, testId } = opts;
  const gesture = Gesture.Pan()
    .withTestId(testId)
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      startX.value = e.x;
      startY.value = e.y;
      moved.value = false;
      const i = hitItem(items, e.x, e.y);
      picked.value = i;
      dragX.value = e.x;
      dragY.value = e.y;
      if (i >= 0 && onPick) scheduleOnRN(onPick, i);
    })
    .onUpdate((e) => {
      'worklet';
      dragX.value = e.x;
      dragY.value = e.y;
      const dx = e.x - startX.value;
      const dy = e.y - startY.value;
      if (dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) moved.value = true;
    })
    .onEnd((e) => {
      'worklet';
      const i = picked.value;
      if (i >= 0) scheduleOnRN(onDrop, i, e.x, e.y);
      else if (!moved.value && onTap) scheduleOnRN(onTap, e.x, e.y);
    })
    .onFinalize(() => {
      'worklet';
      picked.value = -1;
      dragX.value = -999;
      dragY.value = -999;
    });
  return { gesture, picked, dragX, dragY };
}
