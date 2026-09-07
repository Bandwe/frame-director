import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Group, Scene, Vector3 } from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import {
  defaultProject,
  currentShot,
  validateProject,
  createShot,
  switchShot,
  clone,
} from '../director/project.ts';
import { allLights, validateLighting } from '../director/lighting.ts';
import {
  addLight,
  updateLight,
  duplicateLight,
  removeLight,
  moveLightHandle,
} from '../director/multiLights.ts';
import * as H from '../director/history.ts';
import {
  encodeProject,
  decodeProject,
  loadLocal,
  saveLocal,
} from '../director/persistence.ts';
import { batchedDirector } from './batchedDirector.ts';
import type { Vec3 } from '../director/types.ts';

test('v2迁移保留原布光并补空灯列表，不污染输入', () => {
  const old: any = defaultProject();
  old.version = 2;
  old.shots[0].lighting.key.color = '#ff7722';
  old.shots[0].lighting.key.position = [3, 4, 5];
  delete old.shots[0].lighting.sources;
  const before = clone(old),
    p = validateProject(old);
  assert.equal(p.version, 3);
  assert.deepEqual(old, before);
  const { sources, ...lighting } = p.shots[0].lighting;
  assert.deepEqual(sources, []);
  assert.deepEqual(lighting, old.shots[0].lighting);
  const bad: any = clone(p);
  delete bad.shots[0].lighting.sources;
  assert.throws(() => validateProject(bad));
});

test('三类光源增删复制及上限，所有操作可回退', () => {
  let p = defaultProject();
  const point = addLight(p, 'point');
  p = point.project;
  const spot = addLight(p, 'spot');
  p = spot.project;
  p = addLight(p, 'directional').project;
  assert.equal(allLights(currentShot(p).lighting).length, 4);
  const copy = duplicateLight(p, point.lightId);
  p = copy.project;
  assert.notEqual(copy.lightId, point.lightId);
  const a = currentShot(p).lighting.sources.find(
    (s) => s.id === point.lightId,
  )!;
  const b = currentShot(p).lighting.sources.find((s) => s.id === copy.lightId)!;
  assert.equal(b.position[0], a.position[0] + 0.5);
  assert.deepEqual(
    b.target.map((v, i) => v - b.position[i]),
    a.target.map((v, i) => v - a.position[i]),
  );
  let h = H.newHistory(p);
  h = H.apply(h, removeLight(p, point.lightId));
  assert(
    !currentShot(h.present).lighting.sources.some(
      (s) => s.id === point.lightId,
    ),
  );
  assert.deepEqual(H.undo(h).present, p);
  while (currentShot(p).lighting.sources.length < 7)
    p = addLight(p, 'point').project;
  assert.throws(() => addLight(p, 'spot'));
  assert.throws(() => duplicateLight(p, 'main'));
  assert.equal(allLights(currentShot(p).lighting).length, 8);
});

test('多光源镜头互相独立，JSON往返恢复位置方向类型开关', () => {
  const added = addLight(defaultProject(), 'spot');
  let p = added.project;
  const a = p.activeShotId;
  const before = clone(currentShot(p));
  p = createShot(p);
  p = updateLight(p, added.lightId, {
    position: [-4, 3, 2],
    target: [1, 1, 0],
    angle: 25,
    enabled: false,
  });
  const b = p.activeShotId,
    after = clone(currentShot(p));
  p = decodeProject(encodeProject(p));
  for (let i = 0; i < 20; i++) {
    p = switchShot(p, a);
    assert.deepEqual(currentShot(p), before);
    p = switchShot(p, b);
    assert.deepEqual(currentShot(p), after);
  }
});

test('灯位/目标连续拖动100次只记一次undo，相机和其他灯不变', () => {
  const added = addLight(defaultProject(), 'spot');
  for (const handle of ['position', 'target'] as const) {
    let h = H.newHistory(added.project);
    const before = clone(h.present);
    h = H.begin(h);
    for (let i = 1; i <= 100; i++)
      h = H.dragApply(h, (p) =>
        moveLightHandle(p, p.activeShotId, added.lightId, handle, [
          i / 10,
          4,
          2,
        ]),
      );
    h = H.commit(h);
    assert.equal(h.past.length, 1);
    const after = clone(h.present);
    assert.deepEqual(currentShot(after).camera, currentShot(before).camera);
    assert.deepEqual(
      currentShot(after).lighting.key,
      currentShot(before).lighting.key,
    );
    assert.deepEqual(currentShot(after).objects, currentShot(before).objects);
    assert.deepEqual(H.undo(h).present, before);
    assert.deepEqual(H.redo(H.undo(h)).present, after);
  }
});

test('取消/跨镜头/灯被删除后的迟到事件和无变化拖拽均无效', () => {
  const added = addLight(defaultProject(), 'spot'),
    shotId = added.project.activeShotId;
  let h = H.newHistory(added.project);
  const original = clone(h.present);
  h = H.begin(h);
  h = H.dragApply(h, (p) =>
    moveLightHandle(p, shotId, added.lightId, 'position', [9, 9, 0]),
  );
  h = H.cancel(h);
  h = H.dragApply(h, (p) =>
    moveLightHandle(p, shotId, added.lightId, 'position', [8, 8, 0]),
  );
  assert.deepEqual(h.present, original);
  assert.equal(h.past.length, 0);
  const other = createShot(original);
  assert.equal(
    moveLightHandle(other, shotId, added.lightId, 'position', [8, 8, 0]),
    other,
  );
  const removed = removeLight(original, added.lightId);
  assert.equal(
    moveLightHandle(removed, shotId, added.lightId, 'target', [8, 8, 0]),
    removed,
  );
  h = H.begin(h);
  h = H.dragApply(h, (p) =>
    moveLightHandle(p, shotId, added.lightId, 'position', [2, 3, 3]),
  );
  h = H.commit(h);
  assert.equal(h.past.length, 0);
});

test('点光没有目标手柄，退化方向和非法距离拒绝，阴影最多3灯', () => {
  let p = defaultProject();
  const point = addLight(p, 'point');
  p = point.project;
  assert.equal(
    moveLightHandle(p, p.activeShotId, point.lightId, 'target', [3, 3, 3]),
    p,
  );
  assert.equal(
    moveLightHandle(
      p,
      p.activeShotId,
      'main',
      'target',
      currentShot(p).lighting.key.position,
    ),
    p,
  );
  assert.throws(() => updateLight(p, point.lightId, { distance: 0.01 }));
  const spot = addLight(p, 'spot');
  p = spot.project;
  assert.throws(() => updateLight(p, spot.lightId, { angle: 90 }));
  p = updateLight(p, point.lightId, { castShadow: true });
  p = updateLight(p, spot.lightId, { castShadow: true });
  const fourth = addLight(p, 'directional');
  p = fourth.project;
  assert.throws(() => updateLight(p, fourth.lightId, { castShadow: true }));
  assert.doesNotThrow(() => updateLight(p, point.lightId, { enabled: false }));
  const invalid = clone(currentShot(p).lighting);
  invalid.sources.push(clone(invalid.sources[0]));
  assert.throws(() => validateLighting(invalid));
});

test('v2本机备份保留且坏v3不回退', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    ),
    values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
  });
  try {
    const old: any = defaultProject();
    old.version = 2;
    delete old.shots[0].lighting.sources;
    const raw = JSON.stringify(old);
    values.set('frame-director-project-v2', raw);
    const p = loadLocal()!;
    saveLocal(p);
    assert.equal(p.version, 3);
    assert.equal(values.get('frame-director-project-v2'), raw);
    values.set('frame-director-project-v3', '{broken');
    assert.throws(() => loadLocal());
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

function fakeCanvas() {
  const listeners = new Map<string, Set<unknown>>();
  return {
    style: { touchAction: 'auto' },
    addEventListener: (type: string, fn: unknown) => {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, fn: unknown) =>
      listeners.get(type)?.delete(fn),
    count: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
  };
}
test('原生手柄CPU射线拖动保持相机不动且一步撤销', () => {
  const element = fakeCanvas(),
    camera = new PerspectiveCamera(50, 1.5, 0.05, 100);
  camera.position.set(0, 2, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const cameraMatrix = camera.matrixWorld.clone();
  const scene = new Scene(),
    marker = new Group();
  scene.add(marker);
  let h = H.newHistory(defaultProject());
  // Test the target at origin using the same native-control event contract.
  const controls = new TransformControls(
    camera,
    element as unknown as HTMLElement,
  );
  const orbit = { enabled: true };
  controls.attach(marker);
  controls.setMode('translate');
  controls.setSpace('world');
  scene.add(controls.getHelper());
  controls.addEventListener('dragging-changed', (e) => {
    orbit.enabled = !e.value;
  });
  controls.addEventListener('mouseDown', () => {
    h = H.begin(h);
  });
  controls.addEventListener('objectChange', () => {
    h = H.dragApply(h, (p) =>
      moveLightHandle(
        p,
        p.activeShotId,
        'main',
        'target',
        marker.position.toArray(),
      ),
    );
  });
  controls.addEventListener('mouseUp', () => {
    h = H.commit(h);
  });
  controls.axis = 'X';
  scene.updateMatrixWorld(true);
  controls.pointerDown({ x: 0, y: 0, button: 0 } as any);
  assert.equal(orbit.enabled, false);
  for (let i = 1; i <= 20; i++) {
    controls.pointerMove({ x: i / 100, y: 0, button: -1 } as any);
    scene.updateMatrixWorld(true);
  }
  controls.pointerUp({ x: 0.2, y: 0, button: 0 } as any);
  assert(marker.position.x > 0.1);
  assert.equal(h.past.length, 1);
  assert.equal(orbit.enabled, true);
  assert(camera.matrixWorld.equals(cameraMatrix));
  assert.deepEqual(
    currentShot(H.undo(h).present).lighting.key.target,
    [0, 0, 0],
  );
  controls.detach();
  controls.dispose();
  assert.equal(element.count(), 0);
});

test('反复创建/销毁30次原生变换手柄，不遗留DOM监听器', () => {
  const element = fakeCanvas(),
    camera = new PerspectiveCamera();
  for (let i = 0; i < 30; i++) {
    const c = new TransformControls(camera, element as unknown as HTMLElement);
    assert.equal(element.count(), 3);
    c.attach(new Group());
    c.detach();
    c.dispose();
    assert.equal(element.count(), 0);
  }
});

test('真实hook同批次拖离再回原位，不丢最后更新或新增历史', () => {
  const harness = batchedDirector();
  let d = harness.render();
  const original = structuredClone(d.project),
    position: Vec3 = [...d.shot.lighting.key.position];
  const token = d.beginLight('main', 'position');
  d.dragLight(d.shot.id, 'main', 'position', token, [
    position[0] + 1,
    position[1],
    position[2],
  ]);
  d.dragLight(d.shot.id, 'main', 'position', token, position);
  d.end();
  harness.flush();
  d = harness.render();
  assert.deepEqual(d.project, original);
  assert.equal(d.history.past.length, 0);
  assert.equal(d.history.transaction, null);
  assert.equal(d.dragging, false);
});

test('真实hook同批次取消并拒绝旧token，下一次拖拽仍可一步撤销', () => {
  const harness = batchedDirector();
  let d = harness.render();
  const original = structuredClone(d.project);
  const token = d.beginLight('main', 'position');
  d.dragLight(d.shot.id, 'main', 'position', token, [6, 9, 6]);
  d.cancel();
  assert.equal(
    d.dragLight(d.shot.id, 'main', 'position', token, [7, 9, 6]),
    false,
  );
  harness.flush();
  d = harness.render();
  assert.deepEqual(d.project, original);
  assert.equal(d.history.past.length, 0);
  const nextToken = d.beginLight('main', 'position');
  assert.equal(
    d.dragLight(d.shot.id, 'main', 'position', token, [7, 9, 6]),
    false,
  );
  d.dragLight(d.shot.id, 'main', 'position', nextToken, [8, 9, 6]);
  d.end();
  harness.flush();
  d = harness.render();
  assert.deepEqual(d.shot.lighting.key.position, [8, 9, 6]);
  assert.equal(d.history.past.length, 1);
  d.undo();
  harness.flush();
  d = harness.render();
  assert.deepEqual(d.project, original);
});

test('已保存镜头拖回原位保留保存标记和redo，不产生空撤销', () => {
  const p = defaultProject();
  currentShot(p).savedAt = '2026-09-07T00:00:00.000Z';
  let h = H.newHistory(p);
  h = H.apply(h, updateLight(p, 'main', { intensity: 4 }));
  h = H.undo(h);
  const original = clone(h.present),
    future = clone(h.future);
  h = H.begin(h);
  h = H.dragApply(h, (p) =>
    moveLightHandle(p, p.activeShotId, 'main', 'position', [6, 9, 6]),
  );
  h = H.dragApply(h, (p) =>
    moveLightHandle(p, p.activeShotId, 'main', 'position', [5, 9, 6]),
  );
  h = H.commit(h);
  assert.deepEqual(h.present, original);
  assert.deepEqual(h.future, future);
  assert.equal(h.past.length, 0);
});
