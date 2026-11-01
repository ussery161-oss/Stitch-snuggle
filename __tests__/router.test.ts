import { initialRoute, routeReducer, type RouteState } from '../src/logic/router';
import { hintAllowed, HOME_HOLD_MS, releaseKind } from '../src/ui/holdLogic';
import { layoutFor, MIN_TOUCH, touchSize } from '../src/ui/theme';

describe('router', () => {
  it('starts on the title and goes to child screens directly', () => {
    expect(initialRoute.screen).toBe('title');
    expect(routeReducer(initialRoute, { type: 'go', screen: 'clinic' }).screen).toBe('clinic');
  });

  it('reaches the parent area only through the gate', () => {
    const atGate = routeReducer(initialRoute, { type: 'gate', target: 'parent' });
    expect(atGate.screen).toBe('gate');
    expect(routeReducer(atGate, { type: 'gatePassed' }).screen).toBe('parent');
    expect(routeReducer(atGate, { type: 'gateCancelled' }).screen).toBe('title');
    // A child screen can't jump to a grown-up screen.
    const clinic: RouteState = { screen: 'clinic', gateTarget: null };
    expect(routeReducer(clinic, { type: 'parentNav', screen: 'dev' })).toBe(clinic);
    expect(routeReducer(clinic, { type: 'gatePassed' })).toBe(clinic);
  });

  it('moves between parent and dev once past the gate', () => {
    const parent: RouteState = { screen: 'parent', gateTarget: null };
    expect(routeReducer(parent, { type: 'parentNav', screen: 'dev' }).screen).toBe('dev');
  });
});

describe('hold to go home', () => {
  it('needs the full 2 s hold', () => {
    expect(HOME_HOLD_MS).toBe(2000);
    expect(releaseKind(300, HOME_HOLD_MS)).toBe('short');
    expect(releaseKind(1999, HOME_HOLD_MS)).toBe('short');
    expect(releaseKind(2000, HOME_HOLD_MS)).toBe('complete');
  });

  it('throttles the spoken hint', () => {
    expect(hintAllowed(-Infinity, 0)).toBe(true);
    expect(hintAllowed(1000, 2000)).toBe(false);
    expect(hintAllowed(1000, 4000)).toBe(true);
  });
});

describe('layout', () => {
  it('scales art but never shrinks touch targets below 64 pt', () => {
    const phone = layoutFor(844, 390);
    expect(phone.isPhone).toBe(true);
    expect(touchSize(80, phone.scale)).toBeGreaterThanOrEqual(MIN_TOUCH);
    const ipad = layoutFor(1180, 820);
    expect(ipad.isPhone).toBe(false);
    expect(touchSize(150, ipad.scale)).toBeGreaterThan(150);
  });
});
