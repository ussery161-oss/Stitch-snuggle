// P1-B: guard against the Popsy Words launch crash. A plain JS function called from a worklet
// (UI thread) makes Reanimated 4 / worklets abort natively in Expo Go with no red screen. Jest
// mocks Reanimated, so only a static check catches it. Uses the TypeScript compiler API.
//
// Checked bodies:
//  1. every function that starts with 'worklet' (anywhere in src/);
//  2. inline bodies passed to useAnimatedStyle, useDerivedValue, useAnimatedReaction,
//     useAnimatedProps, useFrameCallback and runOnUI;
//  3. inline bodies passed to Gesture callbacks (.onBegin/.onStart/.onUpdate/.onChange/.onEnd/
//     .onFinalize/.onTouches*), which run on the UI thread.
// Inside a checked body, every called identifier that resolves to a function in src/ (top level,
// nested in a component, or imported) must itself start with 'worklet'. A useState setter called
// there is a violation too (it must go through scheduleOnRN / runOnJS). Library calls (Reanimated,
// Skia, Math.*) and plain variables are fine.
import type * as TS from 'typescript';

const ts = require('typescript') as typeof TS;
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const WORKLET_HOOKS = new Set(['useAnimatedStyle', 'useDerivedValue', 'useAnimatedReaction', 'useAnimatedProps', 'useFrameCallback', 'runOnUI']);
const GESTURE_CALLBACKS = new Set(['onBegin', 'onStart', 'onUpdate', 'onChange', 'onEnd', 'onFinalize', 'onTouchesDown', 'onTouchesMove', 'onTouchesUp', 'onTouchesCancelled']);

type FnNode = TS.FunctionDeclaration | TS.ArrowFunction | TS.FunctionExpression;

interface FileInfo {
  file: string;
  sf: TS.SourceFile;
  /** Every named function in the file (top level or nested), by name. */
  fns: Map<string, FnNode[]>;
  /** useState setters declared in the file. */
  setters: Set<string>;
  imports: Map<string, { file: string; name: string }>;
  reexports: Map<string, { file: string; name: string }>;
}

export function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.tsx?$/.test(d.name) && !d.name.endsWith('.generated.ts') ? [p] : [];
  });
}

function resolveModule(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function isWorklet(fn: FnNode): boolean {
  const body = fn.body;
  if (!body || !ts.isBlock(body)) return false;
  const first = body.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'worklet';
}

function parse(file: string, text?: string): FileInfo {
  const src = text ?? fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const fns = new Map<string, FnNode[]>();
  const setters = new Set<string>();
  const imports = new Map<string, { file: string; name: string }>();
  const reexports = new Map<string, { file: string; name: string }>();
  const addFn = (name: string, fn: FnNode) => fns.set(name, [...(fns.get(name) ?? []), fn]);
  const visit = (n: TS.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name) addFn(n.name.text, n);
    if (ts.isVariableDeclaration(n) && n.initializer) {
      let init: TS.Expression = n.initializer;
      // const f = useCallback(() => …, []) is still a plain JS function.
      if (ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'useCallback' && init.arguments[0]) init = init.arguments[0];
      if (ts.isIdentifier(n.name) && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) addFn(n.name.text, init);
      if (
        ts.isArrayBindingPattern(n.name) &&
        ts.isCallExpression(n.initializer) &&
        ts.isIdentifier(n.initializer.expression) &&
        /^use(State|Reducer)$/.test(n.initializer.expression.text)
      ) {
        const second = n.name.elements[1];
        if (second && ts.isBindingElement(second) && ts.isIdentifier(second.name)) setters.add(second.name.text);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.importClause) {
      const target = resolveModule(file, st.moduleSpecifier.text);
      if (!target) continue;
      const nb = st.importClause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) imports.set(el.name.text, { file: target, name: (el.propertyName ?? el.name).text });
      }
    }
    if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      const target = resolveModule(file, st.moduleSpecifier.text);
      if (!target) continue;
      for (const el of st.exportClause.elements) reexports.set(el.name.text, { file: target, name: (el.propertyName ?? el.name).text });
    }
  }
  return { file, sf, fns, setters, imports, reexports };
}

/** Every identifier-callee call inside `node` (nested closures run on the same thread). */
function calledNames(node: TS.Node): { name: string; pos: number }[] {
  const out: { name: string; pos: number }[] = [];
  const visit = (n: TS.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) out.push({ name: n.expression.text, pos: n.getStart() });
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

export interface Violation {
  where: string;
  callee: string;
  reason: string;
}

/** Checks files; `overrides` feeds in-memory sources (for the self-tests). */
export function checkWorkletPurity(files: string[], overrides: Record<string, string> = {}): Violation[] {
  const cache = new Map<string, FileInfo>();
  const info = (f: string): FileInfo => {
    let i = cache.get(f);
    if (!i) {
      i = parse(f, overrides[f]);
      cache.set(f, i);
    }
    return i;
  };
  const lookup = (fi: FileInfo, name: string, depth = 0): { fns: FnNode[]; file: string } | 'unresolved' | null => {
    if (depth > 5) return 'unresolved';
    const local = fi.fns.get(name);
    if (local) return { fns: local, file: fi.file };
    const imp = fi.imports.get(name);
    if (!imp) return null;
    const target = info(imp.file);
    const fn = target.fns.get(imp.name);
    if (fn) return { fns: fn, file: imp.file };
    const re = target.reexports.get(imp.name);
    if (re) return lookup({ ...target, imports: new Map([[imp.name, re]]), fns: new Map() }, imp.name, depth + 1);
    return null;
  };
  const rel = (f: string) => path.relative(ROOT, f).split('\\').join('/');
  const line = (fi: FileInfo, pos: number) => fi.sf.getLineAndCharacterOfPosition(pos).line + 1;

  const violations: Violation[] = [];
  const checkBody = (fi: FileInfo, body: TS.Node, label: string) => {
    for (const c of calledNames(body)) {
      const where = `${rel(fi.file)}:${line(fi, c.pos)} (${label})`;
      if (fi.setters.has(c.name)) {
        violations.push({ where, callee: c.name, reason: 'a React state setter called on the UI thread (use scheduleOnRN)' });
        continue;
      }
      const hit = lookup(fi, c.name);
      if (hit === null) continue;
      if (hit === 'unresolved') {
        violations.push({ where, callee: c.name, reason: 'could not resolve' });
        continue;
      }
      if (hit.fns.some((f) => !isWorklet(f))) {
        violations.push({ where, callee: `${c.name} (${rel(hit.file)})`, reason: "called from a worklet but has no 'worklet' directive" });
      }
    }
  };
  const checkArg = (fi: FileInfo, a: TS.Expression, label: string) => {
    if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) checkBody(fi, a.body, label);
    else if (ts.isIdentifier(a)) {
      const hit = lookup(fi, a.text);
      if (hit && hit !== 'unresolved' && hit.fns.some((f) => !isWorklet(f))) {
        violations.push({ where: `${rel(fi.file)}:${line(fi, a.getStart())} (${label})`, callee: a.text, reason: "passed as a UI-thread callback but has no 'worklet' directive" });
      }
    }
  };

  for (const f of files) {
    const fi = info(f);
    const visit = (n: TS.Node) => {
      if ((ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && isWorklet(n)) {
        const label = ts.isFunctionDeclaration(n) && n.name ? `worklet ${n.name.text}` : 'inline worklet';
        checkBody(fi, n.body!, label);
        return;
      }
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && WORKLET_HOOKS.has(n.expression.text)) {
        const hook = n.expression.text;
        for (const a of n.arguments.slice(0, hook === 'useAnimatedReaction' ? 2 : 1)) checkArg(fi, a, `${hook} body`);
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && GESTURE_CALLBACKS.has(n.expression.name.text)) {
        const a = n.arguments[0];
        if (a) checkArg(fi, a, `gesture .${n.expression.name.text}`);
      }
      ts.forEachChild(n, visit);
    };
    visit(fi.sf);
  }
  return violations;
}

const ALL_SRC = walk(SRC);

describe('worklet purity (Expo Go crash guard)', () => {
  it('scans every src/ file', () => {
    expect(ALL_SRC.length).toBeGreaterThan(0);
    const rels = ALL_SRC.map((f) => path.relative(SRC, f).split('\\').join('/'));
    expect(rels).toContain('art/index.ts');
  });

  it('every function called from a worklet, animated style or gesture callback is itself a worklet', () => {
    expect(checkWorkletPurity(ALL_SRC)).toEqual([]);
  });

  const helper = path.join(SRC, 'logic', '__fakeHelper.ts');
  const user = path.join(SRC, 'ui', '__FakeUser.tsx');
  const plainHelper = 'export function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }\n';
  const workletHelper = "export function clamp01(v: number) { 'worklet'; return Math.max(0, Math.min(1, v)); }\n";
  // The fake files don't exist on disk, so resolve the import by feeding both as overrides.
  const run = (userSrc: string, helperSrc = plainHelper) => {
    const realExists = fs.existsSync;
    const spy = jest.spyOn(fs, 'existsSync').mockImplementation((p) => p === helper || realExists(p));
    try {
      return checkWorkletPurity([user], { [user]: userSrc, [helper]: helperSrc });
    } finally {
      spy.mockRestore();
    }
  };

  it('catches a useAnimatedStyle body calling an imported plain function', () => {
    const v = run("import { clamp01 } from '../logic/__fakeHelper';\nconst s = useAnimatedStyle(() => ({ opacity: clamp01(2) }));\n");
    expect(v).toHaveLength(1);
    expect(v[0].callee).toContain('clamp01');
  });

  it('passes once the helper is a worklet', () => {
    expect(run("import { clamp01 } from '../logic/__fakeHelper';\nconst s = useAnimatedStyle(() => ({ opacity: clamp01(2) }));\n", workletHelper)).toEqual([]);
  });

  it('catches a gesture .onUpdate calling a plain local function', () => {
    const v = run('function Comp() {\n  const track = (x: number) => x * 2;\n  const g = Gesture.Pan().onUpdate((e) => { track(e.x); });\n}\n');
    expect(v).toHaveLength(1);
    expect(v[0].where).toContain('gesture .onUpdate');
  });

  it('catches a gesture .onEnd calling a useState setter', () => {
    const v = run('function Comp() {\n  const [n, setN] = useState(0);\n  const g = Gesture.Tap().onEnd(() => { setN(1); });\n}\n');
    expect(v.map((x) => x.callee)).toEqual(['setN']);
  });

  it('catches useDerivedValue, useFrameCallback and runOnUI bodies', () => {
    for (const hook of ['useDerivedValue(() => clamp01(1));', 'useFrameCallback(() => { clamp01(1); });', 'runOnUI(() => { clamp01(1); })();']) {
      expect(run(`import { clamp01 } from '../logic/__fakeHelper';\n${hook}\n`)).toHaveLength(1);
    }
  });

  it('allows library and Math calls, and functions handed to scheduleOnRN without calling them', () => {
    const v = run("function Comp() {\n  const done = () => {};\n  const g = Gesture.Pan().onEnd(() => { const a = Math.max(1, 2); withSpring(a); scheduleOnRN(done); });\n}\n");
    expect(v).toEqual([]);
  });
});
