import type { AssetKind, Vec3 } from '../types';
import { HomeGeometry } from './HomeGeometry';

function Box({
  size,
  at = [0, 0, 0],
  color = '#c9ccd0',
}: {
  size: Vec3;
  at?: Vec3;
  color?: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.84} />
    </mesh>
  );
}
function Sphere({
  at,
  radius,
  color,
}: {
  at: Vec3;
  radius: number;
  color: string;
}) {
  return (
    <mesh position={at} castShadow>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}
function Person({ second = false }: { second?: boolean }) {
  const color = second ? '#cb9c73' : '#81aea9',
    height = second ? 1.65 : 1.75;
  return (
    <group scale={[1, height / 1.75, 1]}>
      <Sphere at={[0, 1.59, 0]} radius={0.16} color={color} />
      <mesh position={[0, 1.12, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.39, 5, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.11, 0.4, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.65, 4, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh
            position={[side * 0.27, 1.0, 0]}
            rotation={[0, 0, side * 0.08]}
            castShadow
          >
            <capsuleGeometry args={[0.056, 0.44, 4, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <Box
            size={[0.15, 0.1, 0.27]}
            at={[side * 0.11, 0.05, 0.05]}
            color={color}
          />
        </group>
      ))}
      <Box
        size={[0.06, 0.025, 0.035]}
        at={[0, 1.6, 0.157]}
        color={second ? '#705244' : '#405f5d'}
      />
    </group>
  );
}
export function AssetGeometry({
  kind,
  color,
}: {
  kind: AssetKind;
  color?: string;
}) {
  switch (kind) {
    case 'floor':
      return <Box size={[8, 0.12, 6]} at={[0, -0.06, 0]} color="#929b9e" />;
    case 'wall':
      return <Box size={[4, 3, 0.16]} at={[0, 1.5, 0]} color="#c1c4c4" />;
    case 'door':
      return (
        <group>
          <Box size={[0.12, 2.4, 0.24]} at={[-0.54, 1.2, 0]} color="#e2dfd5" />
          <Box size={[0.12, 2.4, 0.24]} at={[0.54, 1.2, 0]} color="#e2dfd5" />
          <Box size={[0.96, 0.14, 0.24]} at={[0, 2.33, 0]} color="#e2dfd5" />
        </group>
      );
    case 'bed':
      return (
        <group>
          <Box size={[1.6, 0.32, 2.1]} at={[0, 0.3, 0]} />
          <Box size={[1.54, 0.18, 2.04]} at={[0, 0.55, 0]} color="#ecebe5" />
          <Box size={[1.6, 0.9, 0.12]} at={[0, 0.65, -1.01]} />
          <Box
            size={[0.63, 0.12, 0.4]}
            at={[-0.38, 0.7, -0.68]}
            color="#f5f4ec"
          />
          <Box
            size={[0.63, 0.12, 0.4]}
            at={[0.38, 0.7, -0.68]}
            color="#f5f4ec"
          />
          {[-0.65, 0.65].flatMap((x) =>
            [-0.85, 0.85].map((z) => (
              <Box key={`${x}${z}`} size={[0.12, 0.2, 0.12]} at={[x, 0.1, z]} />
            )),
          )}
        </group>
      );
    case 'table':
      return (
        <group>
          <Box size={[1.6, 0.08, 0.8]} at={[0, 0.74, 0]} color="#d9d5cc" />
          {[-0.7, 0.7].flatMap((x) =>
            [-0.3, 0.3].map((z) => (
              <Box
                key={`${x}${z}`}
                size={[0.08, 0.7, 0.08]}
                at={[x, 0.35, z]}
              />
            )),
          )}
        </group>
      );
    case 'chair':
      return (
        <group>
          <Box size={[0.5, 0.07, 0.5]} at={[0, 0.46, 0]} />
          <Box size={[0.5, 0.43, 0.06]} at={[0, 0.71, -0.22]} />
          {[-0.19, 0.19].flatMap((x) =>
            [-0.19, 0.19].map((z) => (
              <Box
                key={`${x}${z}`}
                size={[0.06, 0.43, 0.06]}
                at={[x, 0.215, z]}
              />
            )),
          )}
        </group>
      );
    case 'personA':
      return <Person />;
    case 'personB':
      return <Person second />;
    default:
      return <HomeGeometry kind={kind} color={color} />;
  }
}
