import type {
  Project,
  Shot,
  Transform,
  AssetKind,
  Vec3,
  CameraState,
  LightingUpdate,
} from './types.ts';
import { ASSETS } from './types.ts';
import {
  defaultLighting,
  mergeLighting,
  validateLighting,
} from './lighting.ts';

export const clone = <T>(v: T): T => structuredClone(v);
export const id = () => crypto.randomUUID();
export function transform(
  position: Vec3 = [0, 0, 0],
  rotation: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
): Transform {
  return { position, rotation, scale, visible: true };
}
export function currentShot(p: Project): Shot {
  const shot = p.shots.find((s) => s.id === p.activeShotId);
  if (!shot) throw new Error('当前镜头不存在');
  return shot;
}
export function editShot(p: Project, fn: (shot: Shot) => void): Project {
  const n = clone(p);
  fn(currentShot(n));
  currentShot(n).savedAt = null;
  return n;
}
export function updateTransform(
  p: Project,
  objectId: string,
  update: Partial<Transform>,
) {
  const before = currentShot(p).objects[objectId];
  if (!before) throw new Error('镜头中不存在此对象');
  if (
    Object.entries(update).every(
      ([key, value]) =>
        JSON.stringify(before[key as keyof Transform]) ===
        JSON.stringify(value),
    )
  )
    return p;
  return editShot(p, (s) => {
    if (!s.objects[objectId]) throw new Error('镜头中不存在此对象');
    s.objects[objectId] = { ...s.objects[objectId], ...clone(update) };
  });
}
export function updateCamera(
  p: Project,
  update: Partial<CameraState>,
): Project {
  const s = currentShot(p);
  if (s.camera.locked && Object.keys(update).some((k) => k !== 'locked'))
    return p;
  if (
    Object.entries(update).every(
      ([key, value]) =>
        JSON.stringify(s.camera[key as keyof CameraState]) ===
        JSON.stringify(value),
    )
  )
    return p;
  return editShot(p, (s) => {
    s.camera = { ...s.camera, ...clone(update) };
  });
}
export function updateLighting(p: Project, change: LightingUpdate): Project {
  const before = currentShot(p).lighting;
  const after = mergeLighting(before, change);
  if (JSON.stringify(validateLighting(before)) === JSON.stringify(after))
    return p;
  return editShot(p, (s) => {
    s.lighting = after;
  });
}
export function addObject(
  p: Project,
  kind: AssetKind,
): { project: Project; objectId: string } {
  const n = clone(p),
    objectId = id(),
    a = ASSETS.find((a) => a.kind === kind)!;
  n.scene.objects.push({
    id: objectId,
    kind,
    name: `${a.name} ${n.scene.objects.filter((o) => o.kind === kind).length + 1}`,
  });
  currentShot(n).objects[objectId] = transform();
  currentShot(n).savedAt = null;
  return { project: n, objectId };
}
export function duplicateObject(p: Project, objectId: string) {
  const n = clone(p),
    source = n.scene.objects.find((o) => o.id === objectId),
    t = currentShot(n).objects[objectId];
  if (!source || !t) throw new Error('未选中对象');
  const newId = id();
  n.scene.objects.push({ ...source, id: newId, name: source.name + ' 副本' });
  currentShot(n).objects[newId] = clone(t);
  currentShot(n).objects[newId].position[0] += 0.5;
  currentShot(n).savedAt = null;
  return { project: n, objectId: newId };
}
// Asset definitions are shared. Removing an instance only affects the active shot.
export function removeObject(p: Project, objectId: string) {
  return editShot(p, (s) => {
    delete s.objects[objectId];
  });
}
export function switchShot(p: Project, shotId: string) {
  if (!p.shots.some((s) => s.id === shotId)) throw new Error('镜头不存在');
  return { ...p, activeShotId: shotId };
}
export function createShot(p: Project, duplicate = false) {
  const n = clone(p),
    source = clone(currentShot(n));
  source.id = id();
  source.name = duplicate
    ? source.name + ' 副本'
    : `镜头 ${String(n.shots.length + 1).padStart(2, '0')}`;
  source.savedAt = null;
  n.shots.push(source);
  n.activeShotId = source.id;
  return n;
}
export function saveShot(p: Project) {
  const n = clone(p);
  currentShot(n).savedAt = new Date().toISOString();
  return n;
}
export function defaultProject(): Project {
  const objects: [string, AssetKind, string, Transform][] = [
    ['floor', 'floor', '地面', transform()],
    ['back', 'wall', '背景墙', transform([0, 0, -3], [0, 0, 0], [2, 1, 1])],
    [
      'side',
      'wall',
      '侧墙',
      transform([-4, 0, 0], [0, Math.PI / 2, 0], [1.5, 1, 1]),
    ],
    ['door', 'door', '门框', transform([2.3, 0, -2.7])],
    ['bed', 'bed', '床', transform([-2.5, 0, -1.4])],
    ['table', 'table', '桌子', transform([0.1, 0, -0.6])],
    ['chair', 'chair', '椅子', transform([0.1, 0, 0.45])],
    ['actor-a', 'personA', '人物 A', transform([-1.15, 0, 0.9], [0, 0.3, 0])],
    ['actor-b', 'personB', '人物 B', transform([1.55, 0, -0.15], [0, -0.7, 0])],
  ];
  const shot: Shot = {
    id: 'shot-01',
    name: '镜头 01 · 空间关系',
    camera: {
      position: [6, 3.4, 8],
      rotation: [-0.22, 0.588, 0],
      focalLength: 35,
      gateHeight: 24,
      aspect: '16:9',
      locked: false,
    },
    objects: Object.fromEntries(objects.map(([id, , , t]) => [id, t])),
    lighting: defaultLighting(),
    savedAt: null,
  };
  return {
    version: 3,
    units: 'meters',
    title: '室内对白 · 白模预演',
    scene: { objects: objects.map(([id, kind, name]) => ({ id, kind, name })) },
    shots: [shot],
    activeShotId: shot.id,
  };
}

export function validateProject(raw: unknown): Project {
  const p = clone(raw) as Project;
  const previousVersion = (p as { version?: number } | null)?.version;
  if (previousVersion === 1 || previousVersion === 2) p.version = 3;
  const fail = () => {
    throw new Error('不是有效的 FRAME v1 / v2 / v3 项目，或数据超出安全范围。');
  };
  if (
    !p ||
    p.version !== 3 ||
    p.units !== 'meters' ||
    typeof p.title !== 'string' ||
    p.title.length > 200 ||
    !p.scene ||
    !Array.isArray(p.scene.objects) ||
    p.scene.objects.length > 500 ||
    !Array.isArray(p.shots) ||
    p.shots.length < 1 ||
    p.shots.length > 100
  )
    fail();
  const ids = new Set<string>(),
    shotIds = new Set<string>();
  const validId = (x: unknown) =>
    typeof x === 'string' &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(x) &&
    !['__proto__', 'prototype', 'constructor'].includes(x);
  const vec = (v: unknown, scale = false) =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(
      (x) =>
        typeof x === 'number' &&
        Number.isFinite(x) &&
        Math.abs(x) <= 10000 &&
        (!scale || x >= 0.01),
    );
  for (const o of p.scene.objects) {
    if (
      !o ||
      !validId(o.id) ||
      ids.has(o.id) ||
      !ASSETS.some((a) => a.kind === o.kind) ||
      typeof o.name !== 'string' ||
      o.name.length > 200 ||
      (o.color !== undefined &&
        (typeof o.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.color))) ||
      (o.zone !== undefined &&
        (typeof o.zone !== 'string' || o.zone.length > 100))
    )
      fail();
    ids.add(o.id);
  }
  for (const s of p.shots) {
    if (
      !s ||
      !validId(s.id) ||
      shotIds.has(s.id) ||
      typeof s.name !== 'string' ||
      s.name.length > 200 ||
      !s.objects ||
      typeof s.objects !== 'object' ||
      Array.isArray(s.objects)
    )
      fail();
    shotIds.add(s.id);
    s.lighting =
      previousVersion === 1
        ? defaultLighting()
        : validateLighting(
            previousVersion === 2 ? { ...s.lighting, sources: [] } : s.lighting,
          );
    const c = s.camera;
    if (
      !c ||
      !vec(c.position) ||
      !vec(c.rotation) ||
      !Number.isFinite(c.focalLength) ||
      c.focalLength < 12 ||
      c.focalLength > 200 ||
      c.gateHeight !== 24 ||
      !['16:9', '9:16'].includes(c.aspect) ||
      typeof c.locked !== 'boolean'
    )
      fail();
    if (
      s.savedAt !== null &&
      (typeof s.savedAt !== 'string' || !Number.isFinite(Date.parse(s.savedAt)))
    )
      fail();
    for (const [key, t] of Object.entries(s.objects))
      if (
        !ids.has(key) ||
        !t ||
        !vec(t.position) ||
        !vec(t.rotation) ||
        !vec(t.scale, true) ||
        typeof t.visible !== 'boolean'
      )
        fail();
  }
  if (!shotIds.has(p.activeShotId)) fail();
  return clone(p);
}
