import type {
  LightingState,
  LightingUpdate,
  LightSource,
  LightKind,
} from './types.ts';
export const MAX_ADDITIONAL_LIGHTS = 7;
export const LIGHT_NAMES: Record<LightKind, string> = {
  directional: '平行光',
  point: '点光',
  spot: '聚光',
};
export function allLights(l: LightingState): LightSource[] {
  return [
    {
      ...l.key,
      id: 'main',
      name: '主光',
      kind: 'directional',
      distance: 0,
      angle: 45,
      penumbra: 0.35,
    },
    ...l.sources,
  ];
}

// Matches the original V01 renderer exactly, preserving migrated projects.
export function defaultLighting(): LightingState {
  return {
    sources: [],
    ambient: { intensity: 0.85, color: '#ffffff' },
    hemisphere: { intensity: 1.2, skyColor: '#e6eef6', groundColor: '#66645e' },
    key: {
      enabled: true,
      intensity: 2.5,
      color: '#ffffff',
      position: [5, 9, 6],
      target: [0, 0, 0],
      castShadow: true,
    },
  };
}

export function validateLighting(raw: unknown): LightingState {
  const l = raw as LightingState;
  const intensity = (v: unknown, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  const color = (v: unknown) =>
    typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  const vector = (v: unknown): v is [number, number, number] =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(
      (x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1000,
    );
  if (
    !l ||
    !l.ambient ||
    !l.hemisphere ||
    !l.key ||
    !intensity(l.ambient.intensity, 5) ||
    !color(l.ambient.color) ||
    !intensity(l.hemisphere.intensity, 5) ||
    !color(l.hemisphere.skyColor) ||
    !color(l.hemisphere.groundColor) ||
    !intensity(l.key.intensity, 10) ||
    !color(l.key.color) ||
    typeof l.key.enabled !== 'boolean' ||
    typeof l.key.castShadow !== 'boolean' ||
    !vector(l.key.position) ||
    !vector(l.key.target)
  ) {
    throw new Error('灯光参数无效：请检查强度、六位色值和位置。');
  }
  if (Math.hypot(...l.key.position.map((x, i) => x - l.key.target[i])) < 0.01)
    throw new Error('主光位置与照射目标需相距至少 0.01 米。');
  if (!Array.isArray(l.sources) || l.sources.length > MAX_ADDITIONAL_LIGHTS)
    throw new Error('最多支持 8 盏空间灯光（含主光）。');
  const ids = new Set(['main']);
  for (const s of l.sources) {
    if (
      !s ||
      typeof s.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(s.id) ||
      ['__proto__', 'constructor', 'prototype'].includes(s.id) ||
      ids.has(s.id) ||
      typeof s.name !== 'string' ||
      !s.name.trim() ||
      s.name.length > 100 ||
      !['directional', 'point', 'spot'].includes(s.kind) ||
      !intensity(s.intensity, s.kind === 'directional' ? 10 : 2000) ||
      !color(s.color) ||
      !vector(s.position) ||
      !vector(s.target) ||
      typeof s.enabled !== 'boolean' ||
      typeof s.castShadow !== 'boolean' ||
      !intensity(s.distance, 1000) ||
      (s.distance > 0 && s.distance < 0.1) ||
      !intensity(s.angle, 89) ||
      s.angle < 5 ||
      !intensity(s.penumbra, 1) ||
      (s.kind !== 'point' &&
        Math.hypot(...s.position.map((x, i) => x - s.target[i])) < 0.01)
    )
      throw new Error('灯光数据无效：请检查灯的名称、类型、方向和参数范围。');
    ids.add(s.id);
  }
  if (allLights(l).filter((s) => s.enabled && s.castShadow).length > 3)
    throw new Error(
      '为保证编辑流畅，同时投射阴影的灯最多 3 盏。请先关闭其他灯的阴影。',
    );
  // Canonical property order keeps no-op comparisons stable across old files
  // and object spreads, and excludes unrecognized imported light fields.
  const keyFields = (s: LightingState['key']) => ({
    enabled: s.enabled,
    intensity: s.intensity,
    color: s.color,
    position: [...s.position] as [number, number, number],
    target: [...s.target] as [number, number, number],
    castShadow: s.castShadow,
  });
  return {
    sources: l.sources.map((s) => ({
      ...keyFields(s),
      id: s.id,
      name: s.name,
      kind: s.kind,
      distance: s.distance,
      angle: s.angle,
      penumbra: s.penumbra,
    })),
    ambient: { intensity: l.ambient.intensity, color: l.ambient.color },
    hemisphere: {
      intensity: l.hemisphere.intensity,
      skyColor: l.hemisphere.skyColor,
      groundColor: l.hemisphere.groundColor,
    },
    key: keyFields(l.key),
  };
}

export function mergeLighting(
  before: LightingState,
  change: LightingUpdate,
): LightingState {
  return validateLighting({
    ambient: { ...before.ambient, ...change.ambient },
    hemisphere: { ...before.hemisphere, ...change.hemisphere },
    key: { ...before.key, ...change.key },
    sources: change.sources ?? before.sources,
  });
}
