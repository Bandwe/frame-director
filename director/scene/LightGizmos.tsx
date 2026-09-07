'use client';
import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { Group, Vector3, type PerspectiveCamera } from 'three';
import { allLights } from '../lighting';
import type { Director } from '../useDirector';
import type { LightHandle, LightSource } from '../types';
import { TransformHandle } from './TransformHandle';

type Interactions = { blocked: () => boolean; begin: () => void };
function Marker({
  d,
  source,
  handle,
  interactions,
}: {
  d: Director;
  source: LightSource;
  handle: LightHandle;
  interactions: Interactions;
}) {
  const [group, setGroup] = useState<Group | null>(null);
  const token = useRef<number | null>(null);
  const selected =
    d.lightSelection?.id === source.id && d.lightSelection.handle === handle;
  const position = source[handle];
  const color = handle === 'target' ? '#72ddff' : '#ffd37a';
  const read = () => {
    if (!group || token.current === null) return;
    const accepted = d.dragLight(
      d.shot.id,
      source.id,
      handle,
      token.current,
      group.position.toArray(),
    );
    if (!accepted) group.position.fromArray(position);
  };
  return (
    <>
      <group
        ref={setGroup}
        position={position}
        name={'helper:light:' + source.id + ':' + handle}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= 3 && !interactions.blocked())
            d.selectLight(source.id, handle);
        }}
      >
        <mesh renderOrder={1000}>
          {handle === 'position' ? (
            <octahedronGeometry args={[0.24]} />
          ) : (
            <sphereGeometry args={[0.16, 12, 8]} />
          )}
          <meshBasicMaterial
            color={color}
            depthTest={false}
            depthWrite={false}
            wireframe={!selected}
            transparent
            opacity={source.enabled ? 0.95 : 0.5}
          />
        </mesh>
        <Html
          center
          position={[0, 0.45, 0]}
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        >
          <span className={'light-marker-label ' + (selected ? 'active' : '')}>
            {source.name}
            {handle === 'target' ? ' · 目标' : ''}
          </span>
        </Html>
      </group>
      {selected && group && (
        <TransformHandle
          object={group}
          mode="translate"
          size={0.9}
          space="world"
          onMouseDown={() => {
            interactions.begin();
            token.current = d.beginLight(source.id, handle);
          }}
          onObjectChange={read}
          onMouseUp={() => {
            if (token.current !== null) {
              read();
              token.current = null;
              d.end();
            }
          }}
        />
      )}
    </>
  );
}

export function LightGizmos({
  d,
  interactions,
  showAll = true,
}: {
  d: Director;
  interactions: Interactions;
  showAll?: boolean;
}) {
  return (
    <group name="helper:lights">
      {allLights(d.shot.lighting)
        .filter((s) => showAll || s.id === d.lightSelection?.id)
        .map((s) => (
          <group key={s.id}>
            <Marker
              key={s.id + ':position'}
              d={d}
              source={s}
              handle="position"
              interactions={interactions}
            />
            {d.lightSelection?.id === s.id && s.kind !== 'point' && (
              <>
                <Line
                  name="helper:light-direction"
                  points={[s.position, s.target]}
                  color="#72ddff"
                  lineWidth={1.5}
                  dashed
                  dashSize={0.15}
                  gapSize={0.1}
                  depthTest={false}
                />
                <Marker
                  key={s.id + ':target'}
                  d={d}
                  source={s}
                  handle="target"
                  interactions={interactions}
                />
              </>
            )}
          </group>
        ))}
    </group>
  );
}

export function EditorLightFocus({ d }: { d: Director }) {
  const { camera, controls } = useThree();
  const latest = useRef(d);
  latest.current = d;
  const applied = useRef(0);
  useEffect(() => {
    if (d.focusRequest === applied.current || !controls) return;
    applied.current = d.focusRequest;
    const now = latest.current;
    const source = allLights(now.shot.lighting).find(
      (s) => s.id === now.lightSelection?.id,
    );
    if (!source) return;
    const orbit = controls as unknown as {
      target: Vector3;
      update: () => void;
    };
    if (!orbit.target) return;
    const position = new Vector3(...source.position),
      target = new Vector3(...source.target);
    const center =
      source.kind === 'point' ? position : position.clone().lerp(target, 0.5);
    const radius =
      source.kind === 'point'
        ? 2
        : Math.max(2, position.distanceTo(target) * 0.6);
    const cam = camera as PerspectiveCamera;
    const halfFov = Math.min(
      (cam.fov * Math.PI) / 360,
      Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect),
    );
    const direction = camera.position.clone().sub(orbit.target).normalize();
    if (direction.lengthSq() < 0.01) direction.set(1, 0.7, 1).normalize();
    camera.position
      .copy(center)
      .addScaledVector(direction, Math.min(75, radius / Math.sin(halfFov)));
    orbit.target.copy(center);
    camera.lookAt(center);
    orbit.update();
  }, [d.focusRequest, camera, controls]);
  return null;
}
