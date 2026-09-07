import type {
  Project,
  LightKind,
  LightSource,
  LightHandle,
  Vec3,
} from './types.ts';
import { allLights, LIGHT_NAMES, MAX_ADDITIONAL_LIGHTS } from './lighting.ts';
import { currentShot, updateLighting } from './project.ts';

export function addLight(p: Project, kind: LightKind) {
  if (!(kind in LIGHT_NAMES)) throw new Error('未知灯光类型');
  const l = currentShot(p).lighting;
  if (l.sources.length >= MAX_ADDITIONAL_LIGHTS)
    throw new Error('最多 8 盏空间灯光（含主光）。');
  const source: LightSource = {
    id: crypto.randomUUID(),
    name: `${LIGHT_NAMES[kind]} ${l.sources.length + 1}`,
    kind,
    enabled: true,
    intensity: kind === 'directional' ? 2 : kind === 'spot' ? 80 : 40,
    color: '#ffffff',
    position: [2, 3, 3],
    target: [0, 1, 0],
    castShadow: false,
    distance: 20,
    angle: 40,
    penumbra: 0.35,
  };
  return {
    project: updateLighting(p, { sources: [...l.sources, source] }),
    lightId: source.id,
  };
}
export function updateLight(
  p: Project,
  lightId: string,
  change: Partial<LightSource>,
): Project {
  const l = currentShot(p).lighting;
  if (lightId === 'main') {
    const { enabled, intensity, color, position, target, castShadow } = {
      ...l.key,
      ...change,
    };
    return updateLighting(p, {
      key: { enabled, intensity, color, position, target, castShadow },
    });
  }
  if (!l.sources.some((s) => s.id === lightId))
    throw new Error('此镜头中没有这盏灯');
  return updateLighting(p, {
    sources: l.sources.map((s) =>
      s.id === lightId ? { ...s, ...change, id: s.id, kind: s.kind } : s,
    ),
  });
}
export function removeLight(p: Project, lightId: string): Project {
  if (lightId === 'main') return updateLight(p, lightId, { enabled: false });
  const l = currentShot(p).lighting;
  if (!l.sources.some((s) => s.id === lightId)) return p;
  return updateLighting(p, {
    sources: l.sources.filter((s) => s.id !== lightId),
  });
}
export function duplicateLight(p: Project, lightId: string) {
  const l = currentShot(p).lighting,
    source = allLights(l).find((s) => s.id === lightId);
  if (!source) throw new Error('没有选中灯光');
  if (l.sources.length >= MAX_ADDITIONAL_LIGHTS)
    throw new Error('最多 8 盏空间灯光（含主光）。');
  const copy = structuredClone(source);
  copy.id = crypto.randomUUID();
  copy.name = (source.name + ' 副本').slice(0, 100);
  copy.position[0] += 0.5;
  copy.target[0] += 0.5;
  return {
    project: updateLighting(p, { sources: [...l.sources, copy] }),
    lightId: copy.id,
  };
}
// Reject late events, a degenerate light direction, or a removed light without
// crashing a native pointer gesture. Caller also gates events by history transaction.
export function moveLightHandle(
  p: Project,
  shotId: string,
  lightId: string,
  handle: LightHandle,
  position: Vec3,
): Project {
  if (p.activeShotId !== shotId) return p;
  const source = allLights(currentShot(p).lighting).find(
    (s) => s.id === lightId,
  );
  if (!source || (source.kind === 'point' && handle === 'target')) return p;
  try {
    return updateLight(p, lightId, { [handle]: position });
  } catch {
    return p;
  }
}
