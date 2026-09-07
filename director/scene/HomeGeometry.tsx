'use client';
import { useLayoutEffect, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import { Color, InstancedMesh, Object3D } from 'three';
import type { Vec3 } from '../types';
import type { HomeAssetKind } from '../homeCatalog';

const wood = '#a17a53',
  darkWood = '#715540',
  linen = '#e1d9c7',
  metal = '#4e514c';
function B({
  size,
  at = [0, 0, 0],
  color = wood,
  round = false,
}: {
  size: Vec3;
  at?: Vec3;
  color?: string;
  round?: boolean;
}) {
  const material = <meshStandardMaterial color={color} roughness={0.83} />;
  return round ? (
    <RoundedBox
      args={size}
      radius={Math.min(...size) * 0.25}
      smoothness={2}
      position={at}
      castShadow
      receiveShadow
    >
      {material}
    </RoundedBox>
  ) : (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      {material}
    </mesh>
  );
}
function C({
  at,
  radius,
  height,
  color = metal,
  top = radius,
  rotation = [0, 0, 0],
}: {
  at: Vec3;
  radius: number;
  height: number;
  color?: string;
  top?: number;
  rotation?: Vec3;
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[top, radius, height, 16]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}
function Soft({
  at,
  size,
  color = linen,
  rotation = [0, 0, 0],
}: {
  at: Vec3;
  size: Vec3;
  color?: string;
  rotation?: Vec3;
}) {
  return (
    <group position={at} rotation={rotation}>
      <B size={size} color={color} round />
    </group>
  );
}
function Glass({ at, size }: { at: Vec3; size: Vec3 }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#b0ccc5"
        transparent
        opacity={0.17}
        depthWrite={false}
        roughness={0.15}
        metalness={0.05}
      />
    </mesh>
  );
}
function Legs({
  x,
  z,
  h,
  color = darkWood,
}: {
  x: number;
  z: number;
  h: number;
  color?: string;
}) {
  return (
    <>
      {[-x, x].flatMap((a) =>
        [-z, z].map((b) => (
          <B
            key={`${a},${b}`}
            size={[0.055, h, 0.055]}
            at={[a, h / 2, b]}
            color={color}
          />
        )),
      )}
    </>
  );
}

// Geometry, not an external bitmap: one draw call for each floor's planks/tiles.
function Floor({ tile = false, color }: { tile?: boolean; color?: string }) {
  const ref = useRef<InstancedMesh>(null);
  const cols = tile ? 6 : 16,
    rows = tile ? 6 : 5,
    count = cols * rows;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D(),
      base = new Color(color ?? (tile ? '#a8a399' : '#b28a5d'));
    for (let x = 0; x < cols; x++)
      for (let z = 0; z < rows; z++) {
        const i = x * rows + z;
        o.position.set((x + 0.5) / cols - 0.5, -0.027, (z + 0.5) / rows - 0.5);
        o.scale.set(1 / cols - 0.002, 0.052, 1 / rows - 0.0018);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
        mesh.setColorAt(
          i,
          base.clone().multiplyScalar(0.91 + ((i * 17 + x * 11) % 19) / 100),
        );
      }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [color, tile, cols, rows]);
  return (
    <>
      <B
        size={[1, 0.06, 1]}
        at={[0, -0.035, 0]}
        color={tile ? '#7e7c73' : '#6e5941'}
      />
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, count]}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.88} />
      </instancedMesh>
    </>
  );
}

function Bed({ single, color }: { single: boolean; color?: string }) {
  const w = single ? 1 : 1.8;
  return (
    <>
      <B size={[w, 0.32, 2.1]} at={[0, 0.27, 0]} color={darkWood} />
      <B size={[w + 0.06, 1.05, 0.09]} at={[0, 0.53, -1.06]} color={wood} />
      <Soft size={[w - 0.03, 0.22, 2.06]} at={[0, 0.5, 0]} color="#ece5d7" />
      <Soft
        size={[w + 0.04, 0.18, 1.43]}
        at={[0, 0.63, 0.31]}
        color={color ?? (single ? '#92946c' : '#b2a190')}
      />
      <Soft
        size={[w + 0.04, 0.12, 0.3]}
        at={[0, 0.735, -0.25]}
        color="#e6dfcf"
      />
      {(single ? [0] : [-0.44, 0.44]).map((x) => (
        <Soft
          key={x}
          size={[single ? 0.7 : 0.73, 0.16, 0.43]}
          at={[x, 0.7, -0.73]}
          color="#f1e9d9"
          rotation={[-0.09, 0, x * 0.03]}
        />
      ))}
    </>
  );
}
function Sofa({ color = '#d7cbb4' }: { color?: string }) {
  return (
    <>
      <Legs x={0.73} z={0.28} h={0.16} />
      <Soft size={[1.85, 0.3, 0.85]} at={[0, 0.3, 0]} color={color} />
      <Soft size={[1.65, 0.51, 0.18]} at={[0, 0.67, -0.34]} color={color} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Soft
            size={[0.16, 0.43, 0.8]}
            at={[side * 0.86, 0.51, 0]}
            color={color}
          />
          <Soft
            size={[0.72, 0.15, 0.62]}
            at={[side * 0.39, 0.52, 0.05]}
            color="#e8ddc8"
          />
          <Soft
            size={[0.37, 0.34, 0.11]}
            at={[side * 0.54, 0.77, -0.15]}
            color={side === -1 ? '#a3a27b' : '#b38f77'}
            rotation={[-0.15, 0, side * 0.22]}
          />
        </group>
      ))}
    </>
  );
}
function Shelf({ color = wood }: { color?: string }) {
  return (
    <>
      <B size={[1.2, 1.75, 0.045]} at={[0, 0.875, -0.15]} color={darkWood} />
      {[-0.575, 0.575].map((x) => (
        <B key={x} size={[0.05, 1.8, 0.35]} at={[x, 0.9, 0]} color={color} />
      ))}
      {[0.04, 0.47, 0.9, 1.33, 1.76].map((y, row) => (
        <group key={y}>
          <B size={[1.2, 0.04, 0.35]} at={[0, y, 0]} color={color} />
          {row < 4 &&
            Array.from({ length: 9 }, (_, i) => (
              <group
                key={i}
                position={[-0.5 + i * 0.114, y + 0.18, 0.025]}
                rotation={[0, 0, i % 4 === 0 ? 0.11 : 0]}
              >
                <B
                  size={[0.067, 0.27 + (i % 3) * 0.025, 0.22]}
                  color={['#ada58d', '#626e61', '#856652', '#cbc0a4'][i % 4]}
                />
              </group>
            ))}
        </group>
      ))}
    </>
  );
}
function Tap({ at = [0, 0, 0] }: { at?: Vec3 }) {
  return (
    <group position={at}>
      <C at={[0, 0.13, 0]} radius={0.022} height={0.26} color="#929893" />
      <C
        at={[0, 0.24, 0.06]}
        radius={0.021}
        height={0.15}
        color="#929893"
        rotation={[Math.PI / 2, 0, 0]}
      />
      <B size={[0.07, 0.025, 0.025]} at={[0.035, 0.15, 0]} color="#929893" />
    </group>
  );
}

export function HomeGeometry({
  kind,
  color,
}: {
  kind: HomeAssetKind;
  color?: string;
}) {
  switch (kind) {
    case 'block':
      return <B size={[1, 1, 1]} at={[0, 0.5, 0]} color={color ?? '#d8d0bc'} />;
    case 'woodFloor':
      return <Floor color={color} />;
    case 'tileFloor':
      return <Floor tile color={color} />;
    case 'dressedBed':
      return <Bed single={false} color={color} />;
    case 'singleBed':
      return <Bed single color={color} />;
    case 'sofa':
      return <Sofa color={color} />;
    case 'woodTable':
      return (
        <>
          <Legs x={0.6} z={0.3} h={0.7} />
          <B
            size={[1.4, 0.075, 0.8]}
            at={[0, 0.735, 0]}
            color={color ?? wood}
            round
          />
        </>
      );
    case 'woodChair':
      return (
        <>
          <Legs x={0.19} z={0.2} h={0.46} />
          <Soft
            size={[0.48, 0.075, 0.5]}
            at={[0, 0.47, 0]}
            color={color ?? '#a8aa80'}
          />
          <B
            size={[0.46, 0.36, 0.055]}
            at={[0, 0.71, -0.22]}
            color={darkWood}
            round
          />
          <Soft
            size={[0.39, 0.28, 0.035]}
            at={[0, 0.71, -0.18]}
            color={color ?? '#a8aa80'}
          />
        </>
      );
    case 'cabinet':
      return (
        <>
          <B size={[1.2, 0.6, 0.42]} at={[0, 0.35, 0]} color={color ?? wood} />
          <B size={[1.24, 0.06, 0.46]} at={[0, 0.68, 0]} color={darkWood} />
          {[-0.29, 0.29].map((x) => (
            <group key={x}>
              <B
                size={[0.57, 0.48, 0.025]}
                at={[x, 0.36, 0.222]}
                color={color ?? '#ac835b'}
              />
              <B
                size={[0.1, 0.014, 0.035]}
                at={[x, 0.52, 0.247]}
                color={metal}
              />
            </group>
          ))}
        </>
      );
    case 'bookshelf':
      return <Shelf color={color} />;
    case 'wardrobe':
      return (
        <>
          <B size={[1.6, 2.2, 0.6]} at={[0, 1.1, 0]} color={color ?? wood} />
          {[-0.4, 0.4].map((x) => (
            <group key={x}>
              <B
                size={[0.77, 2.08, 0.035]}
                at={[x, 1.1, 0.317]}
                color={color ?? '#ad865f'}
              />
              <B
                size={[0.018, 0.29, 0.045]}
                at={[x > 0 ? 0.08 : -0.08, 1.05, 0.35]}
                color={metal}
              />
            </group>
          ))}
        </>
      );
    case 'window':
      return (
        <>
          <Glass size={[0.96, 0.96, 0.016]} at={[0, 0.5, 0]} />
          {[-0.48, 0, 0.48].map((x) => (
            <B
              key={x}
              size={[0.035, 1, 0.065]}
              at={[x, 0.5, 0]}
              color={color ?? '#e2dfcf'}
            />
          ))}
          {[0.02, 0.98, 0.33].map((y) => (
            <B
              key={y}
              size={[1, 0.035, 0.065]}
              at={[0, y, 0]}
              color={color ?? '#e2dfcf'}
            />
          ))}
          <B size={[1.08, 0.025, 0.16]} at={[0, 0, 0.025]} color="#c9c3b3" />
        </>
      );
    case 'curtain':
      return (
        <>
          <C
            at={[0, 1.025, 0]}
            radius={0.012}
            height={1.15}
            color={darkWood}
            rotation={[0, 0, Math.PI / 2]}
          />
          {Array.from({ length: 9 }, (_, i) => (
            <C
              key={i}
              at={[-0.45 + i * 0.1125, 0.5, Math.sin(i * 1.5) * 0.015]}
              radius={0.067}
              top={0.047}
              height={1}
              color={i % 2 ? (color ?? '#c8bda0') : '#e1d8bd'}
            />
          ))}
        </>
      );
    case 'doorPanel':
      return (
        <>
          <B
            size={[0.85, 2.1, 0.05]}
            at={[0.425, 1.05, 0]}
            color={color ?? '#987551'}
          />
          <B
            size={[0.68, 1.8, 0.012]}
            at={[0.425, 1.08, 0.032]}
            color={color ?? '#aa8560'}
          />
          <C
            at={[0.73, 1, 0.065]}
            radius={0.025}
            height={0.07}
            color={metal}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <B size={[0.105, 0.025, 0.025]} at={[0.69, 1, 0.104]} color={metal} />
        </>
      );
    case 'rug':
      return (
        <>
          <B
            size={[1, 0.018, 1]}
            at={[0, 0.012, 0]}
            color={color ?? '#c8bda5'}
            round
          />
          <B
            size={[0.975, 0.008, 0.975]}
            at={[0, 0.024, 0]}
            color={color ?? '#d8cdb5'}
            round
          />
        </>
      );
    case 'plant':
      return (
        <>
          <C
            at={[0, 0.16, 0]}
            radius={0.13}
            top={0.2}
            height={0.32}
            color={color ?? '#b4a082'}
          />
          <C at={[0, 0.322, 0]} radius={0.18} height={0.015} color="#584d3b" />
          {Array.from({ length: 9 }, (_, i) => {
            const a = i * 2.4,
              r = 0.2 + (i % 3) * 0.045,
              y = 0.58 + (i % 4) * 0.13;
            return (
              <group key={i}>
                <C
                  at={[
                    (Math.sin(a) * r) / 2,
                    (y + 0.32) / 2,
                    (Math.cos(a) * r) / 2,
                  ]}
                  radius={0.009}
                  height={y - 0.26}
                  color="#647145"
                  rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]}
                />
                <mesh
                  position={[Math.sin(a) * r, y, Math.cos(a) * r]}
                  scale={[0.15, 0.035, 0.24]}
                  rotation={[0.3, a, 0.28]}
                  castShadow
                >
                  <sphereGeometry args={[1, 10, 7]} />
                  <meshStandardMaterial
                    color={['#6d8153', '#83955b', '#4e693f'][i % 3]}
                    roughness={0.8}
                  />
                </mesh>
              </group>
            );
          })}
        </>
      );
    case 'tv':
      return (
        <>
          <B
            size={[1.15, 0.67, 0.06]}
            at={[0, 0.425, 0]}
            color="#383b36"
            round
          />
          <B
            size={[1.06, 0.58, 0.012]}
            at={[0, 0.43, 0.036]}
            color={color ?? '#4d5553'}
          />
          <B size={[0.07, 0.12, 0.05]} at={[0, 0.07, 0]} color={metal} />
          <B size={[0.42, 0.025, 0.19]} at={[0, 0.025, 0.04]} color={metal} />
        </>
      );
    case 'lamp':
      return (
        <>
          <C at={[0, 0.025, 0]} radius={0.1} height={0.04} color={wood} />
          <C at={[0, 0.18, 0]} radius={0.023} height={0.3} color={darkWood} />
          <C
            at={[0, 0.35, 0]}
            radius={0.15}
            top={0.1}
            height={0.23}
            color={color ?? '#e7d6b5'}
          />
        </>
      );
    case 'picture':
      return (
        <>
          <B size={[0.6, 0.8, 0.045]} at={[0, 0.4, 0]} color={darkWood} />
          <B size={[0.54, 0.74, 0.014]} at={[0, 0.4, 0.03]} color="#eee5cd" />
          <B
            size={[0.41, 0.52, 0.01]}
            at={[0, 0.4, 0.044]}
            color={color ?? '#83967b'}
          />
        </>
      );
    case 'counter':
      return (
        <>
          <B size={[1, 0.83, 0.6]} at={[0, 0.435, 0]} color={color ?? wood} />
          <B size={[1.025, 0.045, 0.65]} at={[0, 0.877, 0]} color="#d4cdb9" />
          {[-0.245, 0.245].map((x) => (
            <group key={x}>
              <B
                size={[0.48, 0.67, 0.025]}
                at={[x, 0.46, 0.312]}
                color={color ?? '#ae8356'}
              />
              <B
                size={[0.16, 0.015, 0.025]}
                at={[x, 0.74, 0.334]}
                color={metal}
              />
            </group>
          ))}
        </>
      );
    case 'kitchenSink':
      return (
        <>
          <B
            size={[0.55, 0.025, 0.42]}
            at={[0, 0.013, 0]}
            color="#adb2a8"
            round
          />
          <B
            size={[0.46, 0.018, 0.32]}
            at={[0, 0.029, 0.015]}
            color="#697b78"
            round
          />
          <Tap at={[0, 0, -0.18]} />
        </>
      );
    case 'cooktop':
      return (
        <>
          <B size={[0.6, 0.02, 0.4]} at={[0, 0.01, 0]} color="#5e6058" />
          {[-0.17, 0.17].map((x) => (
            <group key={x}>
              <C
                at={[x, 0.035, 0]}
                radius={0.09}
                height={0.02}
                color="#31382f"
              />
              <B size={[0.22, 0.025, 0.024]} at={[x, 0.055, 0]} color={metal} />
              <B size={[0.024, 0.025, 0.22]} at={[x, 0.055, 0]} color={metal} />
            </group>
          ))}
        </>
      );
    case 'fridge':
      return (
        <>
          <B
            size={[0.72, 1.78, 0.7]}
            at={[0, 0.89, 0]}
            color={color ?? '#d8d6c8'}
            round
          />
          {[0.53, 1.38].map((y, i) => (
            <group key={y}>
              <B
                size={[0.7, i ? 0.72 : 0.9, 0.04]}
                at={[0, y, 0.365]}
                color="#e1ddcf"
                round
              />
              <B
                size={[0.025, 0.35, 0.04]}
                at={[-0.25, y, 0.4]}
                color="#8a8e82"
              />
            </group>
          ))}
        </>
      );
    case 'basin':
      return (
        <>
          <B size={[0.75, 0.67, 0.5]} at={[0, 0.36, 0]} color={wood} />
          <B
            size={[0.78, 0.12, 0.54]}
            at={[0, 0.755, 0]}
            color="#e1dfd0"
            round
          />
          <B
            size={[0.54, 0.008, 0.32]}
            at={[0, 0.82, 0.05]}
            color="#a5b4ad"
            round
          />
          <Tap at={[0, 0.8, -0.19]} />
        </>
      );
    case 'toilet':
      return (
        <>
          <C at={[0, 0.19, 0.05]} radius={0.12} height={0.35} color="#e4e1d3" />
          <Soft size={[0.4, 0.22, 0.55]} at={[0, 0.38, 0.06]} color="#e7e5d8" />
          <Soft
            size={[0.38, 0.055, 0.51]}
            at={[0, 0.51, 0.08]}
            color="#efece0"
          />
          <B
            size={[0.37, 0.44, 0.17]}
            at={[0, 0.53, -0.23]}
            color="#e3e0d1"
            round
          />
          <B
            size={[0.05, 0.01, 0.025]}
            at={[0.09, 0.76, -0.23]}
            color={metal}
          />
        </>
      );
    case 'bathtub':
      return (
        <>
          <B size={[1.6, 0.54, 0.72]} at={[0, 0.28, 0]} color="#e8e1cd" round />
          <B
            size={[1.4, 0.012, 0.52]}
            at={[0, 0.557, 0]}
            color="#aeb9b1"
            round
          />
          <B
            size={[1.21, 0.008, 0.4]}
            at={[0, 0.568, 0]}
            color="#c7d1c7"
            round
          />
          <Tap at={[0.68, 0.55, 0]} />
        </>
      );
    case 'shower':
      return (
        <>
          <Glass size={[1.3, 1.9, 0.018]} at={[0, 1, 0]} />
          {[-0.65, 0.65].map((x) => (
            <B
              key={x}
              size={[0.024, 1.97, 0.03]}
              at={[x, 0.985, 0]}
              color="#acae9d"
            />
          ))}
          <B size={[1.32, 0.025, 0.03]} at={[0, 1.97, 0]} color="#acae9d" />
          <C
            at={[0.62, 1.12, -0.08]}
            radius={0.017}
            height={1.34}
            color="#aeb3a7"
          />
          <C
            at={[0.55, 1.77, -0.08]}
            radius={0.085}
            height={0.025}
            color="#aeb3a7"
          />
        </>
      );
    case 'washer':
      return (
        <>
          <B
            size={[0.6, 0.85, 0.6]}
            at={[0, 0.425, 0]}
            color={color ?? '#d4d3c6'}
            round
          />
          <B size={[0.57, 0.12, 0.02]} at={[0, 0.75, 0.31]} color="#e5e1d4" />
          <C
            at={[0, 0.39, 0.327]}
            radius={0.205}
            height={0.04}
            color="#9a9e96"
            rotation={[Math.PI / 2, 0, 0]}
          />
          <C
            at={[0, 0.39, 0.352]}
            radius={0.16}
            height={0.02}
            color="#586b69"
            rotation={[Math.PI / 2, 0, 0]}
          />
          <C
            at={[0.15, 0.75, 0.328]}
            radius={0.025}
            height={0.02}
            color={metal}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </>
      );
    case 'railing':
      return (
        <>
          <B size={[1, 0.045, 0.055]} at={[0, 1.02, 0]} color={metal} />
          <B size={[1, 0.035, 0.04]} at={[0, 0.14, 0]} color={metal} />
          {Array.from({ length: 8 }, (_, i) => (
            <B
              key={i}
              size={[0.018, 1, 0.022]}
              at={[-0.49 + i * 0.14, 0.51, 0]}
              color={metal}
            />
          ))}
        </>
      );
  }
  const unhandled: never = kind;
  throw new Error(`缺少室内模型: ${unhandled}`);
}
