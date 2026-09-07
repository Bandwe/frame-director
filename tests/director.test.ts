import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  defaultProject,
  currentShot,
  updateTransform,
  updateCamera,
  createShot,
  switchShot,
  addObject,
  removeObject,
  duplicateObject,
  validateProject,
  saveShot,
  clone,
} from '../director/project.ts';
import {
  newHistory,
  begin,
  apply,
  commit,
  cancel,
  navigate,
  dragApply,
  undo,
  redo,
} from '../director/history.ts';
import {
  configureCamera,
  frameSpec,
  captureEditor,
} from '../director/camera.ts';
import { encodeProject, decodeProject } from '../director/persistence.ts';

test('已保存镜头零位移 read 不入历史、不清除保存标记', () => {
  let h = newHistory(saveShot(defaultProject()));
  const before = clone(h.present);
  h = begin(h);
  h = dragApply(h, (p) =>
    updateTransform(p, 'actor-a', clone(currentShot(p).objects['actor-a'])),
  );
  h = commit(h);
  assert.equal(h.past.length, 0);
  assert.deepEqual(h.present, before);
});
test('取消后继续收到拖拽事件，不改变对象或撤销栈', () => {
  let h = newHistory(defaultProject());
  const before = clone(h.present);
  h = begin(h);
  h = dragApply(h, (p) =>
    updateTransform(p, 'actor-a', { position: [3, 0, 0] }),
  );
  h = cancel(h);
  for (let i = 0; i < 100; i++)
    h = dragApply(h, (p) =>
      updateTransform(p, 'actor-a', { position: [i, 2, 3] }),
    );
  h = commit(h);
  assert.deepEqual(h.present, before);
  assert.equal(h.past.length, 0);
});
test('镜头导航不进入历史也不清空redo', () => {
  let h = newHistory(createShot(defaultProject()));
  const b = h.present.activeShotId;
  h = apply(h, updateCamera(h.present, { focalLength: 50 }));
  h = undo(h);
  const count = h.past.length;
  h = navigate(h, 'shot-01');
  assert.equal(h.past.length, count);
  assert.equal(h.future.length, 1);
  h = redo(h);
  assert.equal(h.present.activeShotId, b);
  assert.equal(currentShot(h.present).camera.focalLength, 50);
});

test('镜头 A/B 往返20次，恢复完整相机与对象状态，序列化后仍一致', () => {
  let p = defaultProject();
  const a = p.activeShotId;
  p = updateCamera(p, {
    position: [0, 1.2, 5],
    rotation: [0, 0, 0],
    focalLength: 50,
  });
  p = updateTransform(p, 'actor-a', { position: [1, 0, -2] });
  const expectedA = clone(currentShot(p));
  p = createShot(p);
  const b = p.activeShotId;
  p = updateCamera(p, {
    position: [5, 2, 0],
    rotation: [0, Math.PI / 2, 0],
    focalLength: 24,
    aspect: '9:16',
  });
  p = updateTransform(p, 'actor-a', {
    position: [-3, 0.25, 4],
    rotation: [0.2, 0.4, -0.1],
    scale: [2, 0.5, 1],
    visible: false,
  });
  const expectedB = clone(currentShot(p));
  for (let i = 0; i < 20; i++) {
    p = switchShot(p, a);
    assert.deepEqual(currentShot(p), expectedA);
    p = switchShot(p, b);
    assert.deepEqual(currentShot(p), expectedB);
  }
  p = decodeProject(encodeProject(p));
  assert.deepEqual(currentShot(p), expectedB);
  assert.deepEqual(currentShot(switchShot(p, a)), expectedA);
});
test('100次拖拽更新只产生一次撤销；redo精确恢复', () => {
  let h = newHistory(defaultProject());
  const before = clone(h.present);
  h = begin(h);
  for (let i = 1; i <= 100; i++)
    h = apply(
      h,
      updateTransform(h.present, 'actor-a', { position: [i / 25, 0, -2] }),
    );
  assert.equal(h.past.length, 0);
  h = commit(h);
  assert.equal(h.past.length, 1);
  const after = clone(h.present);
  h = undo(h);
  assert.deepEqual(h.present, before);
  h = redo(h);
  assert.deepEqual(h.present, after);
});
test('无移动拖拽不记历史；取消拖拽恢复原状态', () => {
  let h = newHistory(defaultProject());
  h = commit(begin(h));
  assert.equal(h.past.length, 0);
  const p = clone(h.present);
  h = begin(h);
  h = apply(h, updateTransform(h.present, 'actor-a', { position: [9, 3, 1] }));
  h = cancel(h);
  assert.equal(h.past.length, 0);
  assert.deepEqual(h.present, p);
});
test('新增、复制、删除可撤销；删除仅影响当前镜头，注册表不丢失', () => {
  let h = newHistory(defaultProject());
  const a = h.present.activeShotId;
  h = apply(h, createShot(h.present));
  const b = h.present.activeShotId;
  h = apply(h, removeObject(h.present, 'actor-a'));
  assert(!currentShot(h.present).objects['actor-a']);
  assert(currentShot(switchShot(h.present, a)).objects['actor-a']);
  h = undo(h);
  assert(currentShot(h.present).objects['actor-a']);
  assert.equal(h.present.activeShotId, b);
  const added = addObject(h.present, 'table');
  h = apply(h, added.project);
  assert(currentShot(h.present).objects[added.objectId]);
  h = undo(h);
  assert(!h.present.scene.objects.some((o) => o.id === added.objectId));
  h = redo(h);
  const dup = duplicateObject(h.present, 'actor-a');
  assert.notEqual(dup.objectId, 'actor-a');
  assert.equal(
    currentShot(dup.project).objects[dup.objectId].position[0],
    currentShot(h.present).objects['actor-a'].position[0] + 0.5,
  );
});
test('新的编辑清空 redo，历史最多80步', () => {
  let h = newHistory(defaultProject());
  h = apply(h, updateCamera(h.present, { focalLength: 50 }));
  h = undo(h);
  h = apply(h, updateCamera(h.present, { focalLength: 85 }));
  assert.equal(h.future.length, 0);
  for (let i = 0; i < 100; i++)
    h = apply(
      h,
      updateTransform(h.present, 'actor-a', { position: [i, 0, 0] }),
    );
  assert.equal(h.past.length, 80);
});
test('摄影机锁定禁止参数/复制更改，但对象可编辑', () => {
  let p = updateCamera(defaultProject(), { locked: true });
  const expected = clone(currentShot(p).camera);
  p = updateCamera(p, { position: [9, 9, 9], focalLength: 85, aspect: '9:16' });
  assert.deepEqual(currentShot(p).camera, expected);
  const editor = new PerspectiveCamera(48);
  editor.position.set(5, 5, 5);
  assert.deepEqual(captureEditor(editor, expected), expected);
  p = updateTransform(p, 'actor-a', { position: [2, 0, 0] });
  assert.deepEqual(currentShot(p).camera, expected);
  assert.equal(currentShot(p).objects['actor-a'].position[0], 2);
});
test('固定垂直片门：50mm在横竖屏都为26.99146656度', () => {
  const c = currentShot(defaultProject()).camera;
  for (const aspect of ['16:9', '9:16'] as const) {
    const s = frameSpec({ ...c, focalLength: 50, aspect });
    assert(Math.abs(s.fov - 26.991466561591622) < 1e-9);
    const camera = configureCamera(new PerspectiveCamera(), {
      ...c,
      focalLength: 50,
      aspect,
    });
    assert(Math.abs(camera.getFilmHeight() - 24) < 1e-9);
    assert(Math.abs(camera.getFocalLength() - 50) < 1e-9);
  }
});
test('导出固定尺寸不随DPR改变，横竖切换只变水平覆盖', () => {
  const c = currentShot(defaultProject()).camera;
  for (const dpr of [1, 1.5, 2, 3]) {
    assert.deepEqual(
      [
        frameSpec({ ...c, aspect: '16:9' }).width,
        frameSpec({ ...c, aspect: '16:9' }).height,
      ],
      [1920, 1080],
    );
    assert.deepEqual(
      [
        frameSpec({ ...c, aspect: '9:16' }).width,
        frameSpec({ ...c, aspect: '9:16' }).height,
      ],
      [1080, 1920],
    );
    assert(dpr > 0);
  }
  const landscape = frameSpec({ ...c, aspect: '16:9' }),
    portrait = frameSpec({ ...c, aspect: '9:16' });
  assert.equal(landscape.fov, portrait.fov);
  assert.equal(portrait.gateWidth, 13.5);
});
test('预览与导出投影矩阵一致，中心/边界投影误差小于1像素', () => {
  for (const aspect of ['16:9', '9:16'] as const) {
    const state = {
      ...currentShot(defaultProject()).camera,
      position: [0, 1.2, 5] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      focalLength: 50,
      aspect,
    };
    const preview = configureCamera(new PerspectiveCamera(), state),
      output = configureCamera(new PerspectiveCamera(), clone(state)),
      spec = frameSpec(state);
    assert.deepEqual(
      preview.projectionMatrix.elements,
      output.projectionMatrix.elements,
    );
    const center = new Vector3(0, 1.2, 0).project(output),
      top = new Vector3(0, 2.4, 0).project(output),
      right = new Vector3(
        aspect === '16:9' ? 2.133333333333333 : 0.675,
        1.2,
        0,
      ).project(output);
    assert(Math.abs(center.x) < 1e-12 && Math.abs(center.y) < 1e-12);
    assert(Math.abs(top.y - 1) * spec.height < 1);
    assert(Math.abs(right.x - 1) * spec.width < 1);
  }
});
test('编辑相机复制位置与姿态，并保留精确垂直视角', () => {
  const editor = new PerspectiveCamera(48, 1.2);
  editor.position.set(4, 3, 8);
  editor.lookAt(0, 1, 0);
  const copy = captureEditor(editor, currentShot(defaultProject()).camera),
    shot = configureCamera(new PerspectiveCamera(), copy);
  assert.deepEqual(copy.position, [4, 3, 8]);
  assert(
    Math.abs(Math.abs(shot.quaternion.dot(editor.quaternion)) - 1) < 1e-12,
  );
  assert(Math.abs(shot.fov - 48) < 1e-10);
});
test('项目版本/NaN/未知引用/危险ID拒绝，当前项目不受影响', () => {
  const original = defaultProject();
  for (const mutate of [
    (p: any) => (p.version = 999),
    (p: any) => (p.shots[0].camera.focalLength = 0),
    (p: any) => (p.shots[0].objects.floor.scale = [-1, 1, 1]),
    (p: any) => (p.scene.objects[0].id = '__proto__'),
    (p: any) => (p.shots[0].objects.missing = p.shots[0].objects.floor),
  ]) {
    const p = clone(original);
    mutate(p);
    assert.throws(() => validateProject(p));
  }
  assert.deepEqual(original, defaultProject());
});
