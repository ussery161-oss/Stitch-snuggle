// The state-based router. Child screens: title, clinic, studio, stickers. Grown-up screens
// (parent, dev) are only reachable through the parental gate. Pure TypeScript.

export type ChildScreen = 'title' | 'clinic' | 'studio' | 'stickers' | 'showcase';
export type GatedScreen = 'parent' | 'dev' | 'privacy' | 'credits' | 'screenshots';
export type Screen = ChildScreen | GatedScreen | 'gate';

export interface RouteState {
  screen: Screen;
  /** Where the gate leads once it opens. */
  gateTarget: GatedScreen | null;
}

export type RouteAction =
  | { type: 'go'; screen: ChildScreen }
  | { type: 'gate'; target: GatedScreen }
  | { type: 'gatePassed' }
  | { type: 'gateCancelled' }
  /** Within the parent area (already past the gate). */
  | { type: 'parentNav'; screen: GatedScreen }
  | { type: 'home' };

export const initialRoute: RouteState = { screen: 'title', gateTarget: null };

const GATED: readonly Screen[] = ['parent', 'dev', 'privacy', 'credits', 'screenshots'];

export function isGated(screen: Screen): boolean {
  return GATED.includes(screen);
}

export function routeReducer(state: RouteState, action: RouteAction): RouteState {
  switch (action.type) {
    case 'go':
      return { screen: action.screen, gateTarget: null };
    case 'gate':
      return { screen: 'gate', gateTarget: action.target };
    case 'gatePassed':
      return state.screen === 'gate' && state.gateTarget !== null ? { screen: state.gateTarget, gateTarget: null } : state;
    case 'gateCancelled':
    case 'home':
      return initialRoute;
    case 'parentNav':
      // Moving between grown-up screens never skips the gate: only from a gated screen.
      return isGated(state.screen) ? { screen: action.screen, gateTarget: null } : state;
  }
}
