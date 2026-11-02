// '@shopify/react-native-skia' for the visual check: the library's headless build (CanvasKit).
const headless = require('@shopify/react-native-skia/lib/commonjs/headless');
module.exports = { ...headless, Skia: headless.getSkiaExports().Skia };
