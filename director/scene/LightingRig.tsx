'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  Object3D,
  type DirectionalLight,
  type PointLight,
  type SpotLight,
} from 'three';
import type { LightingState, LightSource } from '../types';
import { allLights } from '../lighting';

function SourceLight({ source: s }: { source: LightSource }) {
  const [target] = useState(() => new Object3D());
  const lamp = useRef<DirectionalLight | PointLight | SpotLight | null>(null);
  const distance = Math.hypot(...s.position.map((x, i) => x - s.target[i]));
  useLayoutEffect(() => {
    target.updateMatrixWorld(true);
    if (lamp.current) {
      lamp.current.shadow.camera.updateProjectionMatrix();
      lamp.current.shadow.needsUpdate = true;
    }
  }, [s, target]);
  const shared = {
    name: 'lighting:' + s.id,
    position: s.position,
    intensity: s.enabled ? s.intensity : 0,
    color: s.color,
    castShadow: s.enabled && s.castShadow,
    'shadow-mapSize': [
      s.kind === 'point' ? 512 : s.id === 'main' ? 2048 : 1024,
      s.kind === 'point' ? 512 : s.id === 'main' ? 2048 : 1024,
    ] as [number, number],
    'shadow-camera-near': 0.05,
    'shadow-bias': -0.0003,
  };
  if (s.kind === 'point')
    return (
      <pointLight
        {...shared}
        ref={(v) => {
          lamp.current = v;
        }}
        distance={s.distance}
        decay={2}
        shadow-camera-far={s.distance || 500}
      />
    );
  return (
    <>
      <primitive
        object={target}
        name={'lighting:target:' + s.id}
        position={s.target}
      />
      {s.kind === 'directional' ? (
        <directionalLight
          {...shared}
          ref={(v) => {
            lamp.current = v;
          }}
          target={target}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-camera-far={Math.max(40, distance + 25)}
        />
      ) : (
        <spotLight
          {...shared}
          ref={(v) => {
            lamp.current = v;
          }}
          target={target}
          angle={(s.angle * Math.PI) / 180}
          penumbra={s.penumbra}
          decay={2}
          distance={s.distance}
          shadow-camera-far={s.distance || 500}
        />
      )}
    </>
  );
}

export function LightingRig({ lighting: l }: { lighting: LightingState }) {
  return (
    <>
      <ambientLight
        name="lighting:ambient"
        intensity={l.ambient.intensity}
        color={l.ambient.color}
      />
      <hemisphereLight
        name="lighting:hemisphere"
        intensity={l.hemisphere.intensity}
        color={l.hemisphere.skyColor}
        groundColor={l.hemisphere.groundColor}
      />
      {allLights(l).map((s) => (
        <SourceLight key={s.id} source={s} />
      ))}
    </>
  );
}
