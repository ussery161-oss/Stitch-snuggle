// Jest environment for the visual check: Node plus CanvasKit (real Skia, no device).
const { TestEnvironment } = require('jest-environment-node');
const path = require('path');

class SkiaEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    const init = require('canvaskit-wasm/bin/full/canvaskit.js');
    const dir = path.dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.js'));
    this.global.CanvasKit = await init({ locateFile: (f) => path.join(dir, f) });
  }
}
module.exports = SkiaEnvironment;
