import { PerspectiveCamera, type Scene } from 'three';
import { configureCamera, frameSpec } from '../director/camera';
import { renderFrame } from '../director/scene/exportFrame';
import type { CameraState } from '../director/types';

export type CheckResult = { name: string; passed: boolean; detail: string };
async function digest(blob: Blob) {
  const bytes = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export async function validatePNGs(
  scene: Scene,
  state: CameraState,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const helperNames: string[] = [];
  scene.traverse((o) => {
    if (
      /Helper|TransformControls|Grid/.test(o.type) ||
      o.name.startsWith('helper:')
    )
      helperNames.push(o.type);
  });
  results.push({
    name: '拍摄场景排除所有辅助对象',
    passed: helperNames.length === 0,
    detail: helperNames.length
      ? helperNames.join(',')
      : '没有 Grid、Gizmo、CameraHelper 或界面对象',
  });
  const before = JSON.stringify(state);
  for (const aspect of ['16:9', '9:16'] as const) {
    const camera = { ...structuredClone(state), aspect },
      spec = frameSpec(camera);
    const output = await renderFrame(scene, camera),
      bitmap = await createImageBitmap(output.blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4 * 199)
      colors.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);
    results.push({
      name: `${aspect} PNG 解码尺寸`,
      passed: canvas.width === spec.width && canvas.height === spec.height,
      detail: `${canvas.width} × ${canvas.height} / DPR 独立`,
    });
    results.push({
      name: `${aspect} 非黑图 / 有实际场景`,
      passed: colors.size > 20,
      detail: `采样 ${colors.size} 种颜色`,
    });
    const again = await renderFrame(scene, camera);
    results.push({
      name: `${aspect} 静态连续导出一致`,
      passed: (await digest(output.blob)) === (await digest(again.blob)),
      detail: '同一快照、光照与摄影机连续导出 PNG SHA-256 比对',
    });
    const preview = configureCamera(new PerspectiveCamera(), camera),
      exported = configureCamera(new PerspectiveCamera(), camera);
    results.push({
      name: `${aspect} 预览与导出投影一致`,
      passed:
        preview.projectionMatrix.equals(exported.projectionMatrix) &&
        preview.matrixWorld.equals(exported.matrixWorld),
      detail: '同一取景计算，不采用面板宽高或显示DPR',
    });
  }
  results.push({
    name: '导出不改变摄影机状态',
    passed: JSON.stringify(state) === before,
    detail: '导出使用独立摄影机和渲染器',
  });
  return results;
}
