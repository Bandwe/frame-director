import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLighting, validateLighting } from '../director/lighting.ts';
import {
  defaultProject,
  currentShot,
  updateLighting,
  createShot,
  switchShot,
  saveShot,
  validateProject,
  clone,
} from '../director/project.ts';
import { newHistory, apply, undo, redo } from '../director/history.ts';
import {
  encodeProject,
  decodeProject,
  loadLocal,
  saveLocal,
} from '../director/persistence.ts';

test('v1迁移保留相机对象时间戳，补上原始灯光，不修改原输入', () => {
  const old: any = saveShot(createShot(defaultProject()));
  old.version = 1;
  old.shots.forEach((s: any) => delete s.lighting);
  const original = clone(old);
  const migrated = validateProject(old);
  assert.equal(migrated.version, 3);
  assert.deepEqual(old, original);
  for (let i = 0; i < old.shots.length; i++) {
    const { lighting, ...rest } = migrated.shots[i];
    assert.deepEqual(rest, old.shots[i]);
    assert.deepEqual(lighting, defaultLighting());
  }
  migrated.shots[0].lighting.key.position[0] = 123;
  assert.equal(migrated.shots[1].lighting.key.position[0], 5);
});

test('灯光随镜头切换精确恢复，复制镜头的灯光互不影响', () => {
  let p = updateLighting(defaultProject(), {
    key: { color: '#ffccaa', position: [-4, 5, 2], target: [1, 1, 0] },
  });
  const a = p.activeShotId,
    expected = clone(currentShot(p));
  p = createShot(p, true);
  const b = p.activeShotId;
  p = updateLighting(p, {
    ambient: { intensity: 0.1 },
    hemisphere: { intensity: 0 },
    key: { enabled: false, castShadow: false },
  });
  const other = clone(currentShot(p));
  for (let i = 0; i < 20; i++) {
    p = switchShot(p, a);
    assert.deepEqual(currentShot(p), expected);
    p = switchShot(p, b);
    assert.deepEqual(currentShot(p), other);
  }
  assert.deepEqual(decodeProject(encodeProject(p)), p);
});

test('灯光编辑和恢复默认均可撤销重做，不改变相机或对象', () => {
  let h = newHistory(saveShot(defaultProject()));
  const before = clone(h.present);
  h = apply(
    h,
    updateLighting(h.present, { key: { intensity: 8, color: '#ff8844' } }),
  );
  const changed = clone(h.present);
  assert.equal(currentShot(h.present).savedAt, null);
  assert.deepEqual(currentShot(h.present).camera, currentShot(before).camera);
  assert.deepEqual(currentShot(h.present).objects, currentShot(before).objects);
  assert.deepEqual(undo(h).present, before);
  assert.deepEqual(redo(undo(h)).present, changed);
  h = apply(h, updateLighting(h.present, defaultLighting()));
  assert.deepEqual(currentShot(h.present).lighting, defaultLighting());
  assert.deepEqual(undo(h).present, changed);
});

test('未变更灯光不污染历史与镜头保存标记；局部更新保留其余字段', () => {
  const p = saveShot(defaultProject());
  assert.equal(updateLighting(p, defaultLighting()), p);
  const next = updateLighting(p, { key: { castShadow: false } });
  assert.equal(currentShot(next).lighting.key.enabled, true);
  assert.equal(currentShot(next).lighting.key.intensity, 2.5);
  assert.deepEqual(
    currentShot(next).lighting.ambient,
    currentShot(p).lighting.ambient,
  );
});

test('v3灯光缺失或非法灯光拒绝；全关灯是合法状态', () => {
  const p: any = defaultProject();
  delete p.shots[0].lighting;
  assert.throws(() => validateProject(p));
  for (const change of [
    (l: any) => (l.ambient.intensity = NaN),
    (l: any) => (l.key.intensity = '2'),
    (l: any) => (l.key.intensity = 11),
    (l: any) => (l.hemisphere.intensity = -1),
    (l: any) => (l.key.color = 'url(example)'),
    (l: any) => (l.key.color = '#fff'),
    (l: any) => (l.key.enabled = 1),
    (l: any) => (l.key.position = [1001, 0, 0]),
    (l: any) => (l.key.target = l.key.position),
  ]) {
    const l = defaultLighting();
    change(l);
    assert.throws(() => validateLighting(l));
  }
  assert.doesNotThrow(() =>
    updateLighting(defaultProject(), {
      ambient: { intensity: 0 },
      hemisphere: { intensity: 0 },
      key: { enabled: false },
    }),
  );
});

test('v1本机原始备份保留，坏v3不静默回退或覆盖', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  try {
    const legacy: any = defaultProject();
    legacy.version = 1;
    legacy.shots.forEach((s: any) => delete s.lighting);
    const text = JSON.stringify(legacy);
    store.set('frame-director-project-v1', text);
    const p = loadLocal()!;
    assert.equal(p.version, 3);
    saveLocal(p);
    assert.equal(store.get('frame-director-project-v1'), text);
    assert.equal(
      JSON.parse(store.get('frame-director-project-v3')!).version,
      3,
    );
    store.set('frame-director-project-v3', '{broken');
    assert.throws(() => loadLocal());
    assert.equal(store.get('frame-director-project-v3'), '{broken');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
