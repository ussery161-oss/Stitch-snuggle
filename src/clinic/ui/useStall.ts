// Stall help for every step: the hand hint after 8 s with no progress, the done heart after 20 s.
// Call `progress()` whenever the child makes progress (it hides the hint and restarts its clock).
import { useCallback, useEffect, useRef, useState } from 'react';

import { DONE_HEART_AFTER_MS, doneHeartDue, hintDue } from '../helpers';

export function useStall(opts: { heartAlways?: boolean } = {}) {
  const start = useRef(0);
  const last = useRef(0);
  const [hint, setHint] = useState(false);
  const [heart, setHeart] = useState(!!opts.heartAlways);
  useEffect(() => {
    start.current = Date.now();
    last.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (hintDue(last.current, now)) setHint(true);
      if (doneHeartDue(start.current, now)) setHeart(true);
    }, 500);
    return () => clearInterval(id);
  }, []);
  const progress = useCallback(() => {
    last.current = Date.now();
    setHint(false);
  }, []);
  return { hint, heart, progress, heartAfterMs: DONE_HEART_AFTER_MS };
}
