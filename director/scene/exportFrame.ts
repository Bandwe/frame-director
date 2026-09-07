import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  PCFSoftShadowMap,
  PerspectiveCamera,
  WebGLRenderer,
} from 'three';
import type { Scene } from 'three';
import type { CameraState } from '../types';
import { configureCamera, frameSpec } from '../camera';
export function configureRenderer(gl: WebGLRenderer) {
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 1;
  gl.outputColorSpace = SRGBColorSpace;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = PCFSoftShadowMap;
}
export async function renderFrame(
  scene: Scene,
  state: CameraState,
): Promise<{ blob: Blob; width: number; height: number }> {
  const spec = frameSpec(state),
    camera = configureCamera(new PerspectiveCamera(), structuredClone(state));
  const gl = new WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  try {
    configureRenderer(gl);
    gl.setPixelRatio(1);
    gl.setSize(spec.width, spec.height, false);
    // This scene comes from the dedicated shot preview; editor helpers never enter it.
    scene.updateMatrixWorld(true);
    gl.render(scene, camera);
    const blob = await new Promise<Blob>((resolve, reject) =>
      gl.domElement.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG 编码失败'))),
        'image/png',
      ),
    );
    return { blob, width: gl.domElement.width, height: gl.domElement.height };
  } finally {
    gl.dispose();
    gl.forceContextLoss();
  }
}
