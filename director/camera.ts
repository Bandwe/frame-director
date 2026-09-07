import { PerspectiveCamera, MathUtils, Euler, Quaternion } from 'three';
import type { CameraState } from './types.ts';
export function frameSpec(c: CameraState) {
  const aspect = c.aspect === '16:9' ? 16 / 9 : 9 / 16;
  return {
    aspect,
    width: c.aspect === '16:9' ? 1920 : 1080,
    height: c.aspect === '16:9' ? 1080 : 1920,
    gateWidth: c.gateHeight * aspect,
    gateHeight: c.gateHeight,
    fov: MathUtils.radToDeg(2 * Math.atan(c.gateHeight / (2 * c.focalLength))),
  };
}
// Fixed vertical gate, not Three's default fixed-long-edge filmGauge.
export function configureCamera(camera: PerspectiveCamera, c: CameraState) {
  const s = frameSpec(c);
  camera.position.fromArray(c.position);
  camera.rotation.set(...c.rotation, 'YXZ');
  camera.aspect = s.aspect;
  camera.fov = s.fov;
  camera.zoom = 1;
  camera.filmGauge = c.gateHeight * Math.max(s.aspect, 1);
  camera.filmOffset = 0;
  camera.near = 0.05;
  camera.far = 500;
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}
export function captureEditor(
  camera: PerspectiveCamera,
  shot: CameraState,
): CameraState {
  if (shot.locked) return shot;
  const rotation = new Euler().setFromQuaternion(
    camera.getWorldQuaternion(new Quaternion()),
    'YXZ',
  );
  // Copy vertical framing exactly: convert the editor FOV into our 24mm gate.
  const focal =
    shot.gateHeight /
    (2 * Math.tan(MathUtils.degToRad(camera.getEffectiveFOV()) / 2));
  return {
    ...shot,
    position: camera.position.toArray(),
    rotation: [rotation.x, rotation.y, rotation.z],
    focalLength: Math.max(12, Math.min(200, focal)),
  };
}
