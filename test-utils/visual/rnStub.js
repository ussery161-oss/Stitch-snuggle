// The little of react-native the drawing code touches, for the headless visual check.
module.exports = {
  Image: { resolveAssetSource: () => null },
  PixelRatio: { get: () => 2 },
  Platform: { OS: 'ios', select: (o) => o.ios ?? o.default },
  StyleSheet: { create: (s) => s, absoluteFill: {} },
  View: () => null,
};
