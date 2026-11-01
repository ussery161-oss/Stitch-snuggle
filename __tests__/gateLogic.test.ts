import { expectedIndex, holdDone, isOpen, makeGateNumbers, startGate, tapNumber, type GateState } from '../src/gate/gateLogic';
import { createRng } from '../src/logic/rng';

const fixed = (numbers: number[]): GateState => ({ numbers, tapped: [], phase: 'order' });

describe('parental gate logic', () => {
  it('makes three distinct two-digit numerals, well apart', () => {
    for (let seed = 1; seed < 200; seed++) {
      const n = makeGateNumbers(createRng(seed));
      expect(n).toHaveLength(3);
      expect(new Set(n).size).toBe(3);
      for (const x of n) expect(x).toBeGreaterThanOrEqual(10);
      for (const x of n) expect(x).toBeLessThan(100);
    }
  });

  it('correct order (smallest to largest) then the hold opens the gate', () => {
    const rng = createRng(1);
    let s = fixed([52, 17, 80]);
    expect(expectedIndex(s)).toBe(1);
    s = tapNumber(s, 1, rng);
    s = tapNumber(s, 0, rng);
    expect(s.phase).toBe('order');
    s = tapNumber(s, 2, rng);
    expect(s.phase).toBe('hold');
    expect(isOpen(s)).toBe(false);
    s = holdDone(s);
    expect(isOpen(s)).toBe(true);
  });

  it('a wrong order quietly resets with new numbers', () => {
    const rng = createRng(2);
    let s = fixed([52, 17, 80]);
    s = tapNumber(s, 1, rng);
    s = tapNumber(s, 2, rng); // 80 before 52
    expect(s.tapped).toEqual([]);
    expect(s.phase).toBe('order');
    expect(s.numbers).not.toEqual([52, 17, 80]);
  });

  it('the hold does nothing before the three taps', () => {
    const s = fixed([52, 17, 80]);
    expect(holdDone(s)).toBe(s);
    expect(isOpen(holdDone(tapNumber(s, 1, createRng(3))))).toBe(false);
  });

  it('a repeated tap on a lit numeral is ignored', () => {
    const rng = createRng(4);
    const s = tapNumber(fixed([52, 17, 80]), 1, rng);
    expect(tapNumber(s, 1, rng)).toBe(s);
  });

  it('startGate begins with nothing tapped', () => {
    const s = startGate(createRng(5));
    expect(s.tapped).toEqual([]);
    expect(s.phase).toBe('order');
  });
});
