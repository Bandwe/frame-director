import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  Matrix4,
  Quaternion,
  Euler,
  Vector3,
  PerspectiveCamera,
  Box3,
} from 'three';
import {
  createApartmentProject,
  APARTMENT_SCOPE,
} from '../director/presets/apartment.ts';
import {
  validateProject,
  currentShot,
  updateTransform,
  clone,
  defaultProject,
} from '../director/project.ts';
import {
  encodeProject,
  decodeProject,
  loadLocal,
  saveLocal,
} from '../director/persistence.ts';
import { configureCamera, frameSpec } from '../director/camera.ts';
import { ASSETS } from '../director/types.ts';
import * as H from '../director/history.ts';

test('参考户型为合法米制独立项目，每个模型已注册，五个镜头完整恢复', () => {
  const p = createApartmentProject();
  assert.equal(p.scene.objects.length, 147);
  assert.equal(p.shots.length, 5);
  assert.equal(p.units, 'meters');
  assert.equal(new Set(p.scene.objects.map((o) => o.id)).size, 147);
  assert(p.scene.objects.every((o) => ASSETS.some((a) => a.kind === o.kind)));
  assert(p.shots.every((s) => Object.keys(s.objects).length === 147));
  assert.deepEqual(decodeProject(encodeProject(p)), p);
  assert.deepEqual(
    decodeProject(
      readFileSync(
        new URL(
          '../public/projects/reference-apartment-v01.frame.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ),
    p,
  );
  const bad = clone(p);
  bad.scene.objects[0].color = 'url(secret)';
  assert.throws(() => validateProject(bad));
});

test('房间关系与家具朝向遵循参考：东向主床、北向单床，两张垂直沙发及L形厨房', () => {
  const s = createApartmentProject().shots[1].objects;
  const facing = (id: string, localZ = 1) =>
    new Vector3(0, 0, localZ).applyEuler(new Euler(...s[id].rotation));
  assert(facing('master-bed', -1).distanceTo(new Vector3(1, 0, 0)) < 1e-8);
  assert(facing('study-bed', -1).distanceTo(new Vector3(0, 0, -1)) < 1e-8);
  assert(facing('living-sofa-south').distanceTo(new Vector3(0, 0, -1)) < 1e-8);
  assert(facing('living-sofa-east').distanceTo(new Vector3(-1, 0, 0)) < 1e-8);
  assert(
    facing('kitchen-counter-west').distanceTo(new Vector3(1, 0, 0)) < 1e-8,
  );
  assert(
    facing('kitchen-counter-south').distanceTo(new Vector3(0, 0, -1)) < 1e-8,
  );
  assert(s['master-bed'].position[0] < s['study-bed'].position[0]);
  assert(s['bath-floor'].position[2] < s['laundry-floor'].position[2]);
  assert(s['laundry-floor'].position[2] < s['storage-floor'].position[2]);
});

test('户型外轮廓按20cm网格完整铺设楼板，无遗漏', () => {
  const p = createApartmentProject(),
    s = p.shots[0];
  const floors = p.scene.objects
    .filter((o) => o.kind === 'woodFloor' || o.kind === 'tileFloor')
    .map((o) => s.objects[o.id]);
  for (let xi = 0; xi < 42; xi++)
    for (let zi = 0; zi < 74; zi++) {
      const x = -4.1 + xi * 0.2,
        z = -7.3 + zi * 0.2;
      assert(
        floors.some(
          (t) =>
            Math.abs(x - t.position[0]) <= t.scale[0] / 2 + 1e-8 &&
            Math.abs(z - t.position[2]) <= t.scale[2] / 2 + 1e-8,
        ),
        `未覆盖 ${x},${z}`,
      );
    }
});

test('次卧床尾留出通道，三个服务房间门洞至少88cm', () => {
  const s = createApartmentProject().shots[1].objects;
  const bedFoot = s['study-bed'].position[2] + 1.05;
  const wardrobeFront = s['study-wardrobe'].position[2] - 0.38;
  assert(wardrobeFront - bedFoot >= 0.4);
  for (const id of ['bath', 'laundry', 'storage']) {
    const north = s[id + '-west-n'],
      south = s[id + '-west-s'];
    const opening =
      south.position[2] -
      south.scale[2] / 2 -
      (north.position[2] + north.scale[2] / 2);
    assert(opening >= 0.879);
    assert(s[id + '-door-lintel'].position[1] >= 2.1);
  }
});

test('四个室内摄影机不在实体墙中，且离开启门板至少8cm', () => {
  const p = createApartmentProject();
  for (const shot of p.shots.slice(1))
    for (const object of p.scene.objects) {
      if (
        !(object.kind === 'block' && object.name.startsWith('墙')) &&
        object.kind !== 'doorPanel'
      )
        continue;
      const t = shot.objects[object.id];
      const m = new Matrix4().compose(
        new Vector3(...t.position),
        new Quaternion().setFromEuler(new Euler(...t.rotation)),
        new Vector3(...t.scale),
      );
      const point = new Vector3(...shot.camera.position).applyMatrix4(
        m.invert(),
      );
      const bounds =
        object.kind === 'doorPanel'
          ? new Box3(new Vector3(0, 0, -0.025), new Vector3(0.85, 2.1, 0.025))
          : new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5));
      assert(!bounds.containsPoint(point), `${shot.id} 在 ${object.id} 中`);
      if (object.kind === 'doorPanel')
        assert(
          bounds.distanceToPoint(point) >= 0.08,
          `${shot.id} 过近 ${object.id}`,
        );
    }
});

test('总览9:16完整容纳户型包围盒，四个人眼镜头为横屏', () => {
  const p = createApartmentProject(),
    c = configureCamera(new PerspectiveCamera(), p.shots[0].camera);
  for (const x of [-4.28, 4.28])
    for (const z of [-7.48, 7.48])
      for (const y of [0, 2.7]) {
        const projected = new Vector3(x, y, z).project(c);
        assert(
          Math.abs(projected.x) < 0.94 &&
            Math.abs(projected.y) < 0.94 &&
            projected.z < 1,
        );
      }
  assert.equal(frameSpec(p.shots[0].camera).width, 1080);
  assert.equal(frameSpec(p.shots[0].camera).height, 1920);
  assert(
    p.shots
      .slice(1)
      .every(
        (s) => s.camera.aspect === '16:9' && frameSpec(s.camera).width === 1920,
      ),
  );
});

test('剖切只影响总览，移动家具可撤销且不污染其他镜头', () => {
  const p = createApartmentProject();
  assert.equal(p.shots[0].objects['south-kitchen'].scale[1], 0.7);
  assert(
    p.shots.slice(1).every((s) => s.objects['south-kitchen'].scale[1] === 2.7),
  );
  assert(p.shots.every((s) => s.objects['east-exterior'].scale[1] === 2.7));
  assert(!p.shots[0].objects['entry-door'].visible);
  assert(p.shots.slice(1).every((s) => s.objects['entry-door'].visible));
  let h = H.newHistory(p);
  h = H.apply(
    h,
    updateTransform(h.present, 'coffee-table', { position: [0, 0, 0] }),
  );
  assert.deepEqual(h.present.shots.slice(1), p.shots.slice(1));
  assert.deepEqual(H.undo(h).present, p);
});

test('户型本机存档不读取或覆盖原导演台，损坏独立存档明确报错', () => {
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
    const original = defaultProject();
    saveLocal(original);
    const raw = values.get('frame-director-project-v3');
    assert.equal(loadLocal(APARTMENT_SCOPE), null);
    const apartment = createApartmentProject();
    saveLocal(apartment, APARTMENT_SCOPE);
    assert.equal(values.get('frame-director-project-v3'), raw);
    assert.deepEqual(loadLocal(), original);
    assert.deepEqual(loadLocal(APARTMENT_SCOPE), apartment);
    values.set('frame-director-project-v3:' + APARTMENT_SCOPE, '{broken');
    assert.throws(() => loadLocal(APARTMENT_SCOPE));
    assert.throws(() => saveLocal(apartment, '../root'));
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
