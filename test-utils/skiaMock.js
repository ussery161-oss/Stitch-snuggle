// A light Jest stand-in for @shopify/react-native-skia: drawing components render as plain host
// elements (so tests can find them and read their props), hooks return nulls, and Skia.Path /
// Matrix objects are chainable stubs. Real pixels are checked by scripts/visual-check (CanvasKit).
/* global jest */
const React = require('react');

function host(name) {
  const C = (props) => React.createElement(name, props, props.children);
  C.displayName = name;
  return C;
}

function chain() {
  const target = {};
  const proxy = new Proxy(target, {
    get(t, key) {
      if (key === 'then') return undefined;
      if (key in t) return t[key];
      if (key === 'toSVGString') return () => '';
      if (key === 'getBounds' || key === 'computeTightBounds') return () => ({ x: 0, y: 0, width: 100, height: 100 });
      if (key === 'contains') return () => true;
      if (key === 'copy') return () => chain();
      return () => proxy;
    },
  });
  return proxy;
}

const Skia = {
  Path: { Make: () => chain(), MakeFromSVGString: () => chain() },
  Matrix: () => chain(),
  Color: (c) => c,
  XYWHRect: (x, y, width, height) => ({ x, y, width, height }),
  RRectXY: (rect, rx, ry) => ({ rect, rx, ry }),
  Paint: () => chain(),
  Shader: { MakeImage: () => chain() },
  ColorFilter: { MakeBlend: () => chain() },
  Image: { MakeImageFromEncoded: () => null },
  Data: { fromBytes: () => null },
};

const names = [
  'Canvas', 'Group', 'Image', 'Path', 'Circle', 'Rect', 'RoundedRect', 'Oval', 'Line', 'Points', 'Fill', 'Paint',
  'ImageShader', 'BlendColor', 'ColorMatrix', 'LinearGradient', 'RadialGradient', 'Mask', 'Shadow', 'Blur', 'Text', 'Atlas', 'Picture', 'DashPathEffect',
];
const components = Object.fromEntries(names.map((n) => [n, host(`Skia${n}`)]));

const enumProxy = new Proxy({}, { get: (_, k) => String(k) });

module.exports = {
  ...components,
  Skia,
  BlendMode: enumProxy,
  PaintStyle: enumProxy,
  StrokeCap: enumProxy,
  StrokeJoin: enumProxy,
  TileMode: enumProxy,
  FilterMode: enumProxy,
  MipmapMode: enumProxy,
  ClipOp: enumProxy,
  useImage: () => null,
  useFont: () => null,
  usePathValue: () => chain(),
  useCanvasRef: () => ({ current: null }),
  rect: (x, y, width, height) => ({ x, y, width, height }),
  rrect: (r, rx, ry) => ({ rect: r, rx, ry }),
  vec: (x, y) => ({ x, y }),
  makeImageFromView: jest.fn(async () => null),
};
