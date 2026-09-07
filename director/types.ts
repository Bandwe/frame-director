import { HOME_ASSETS, type HomeAssetKind } from './homeCatalog.ts';
export type Vec3 = [number, number, number];
export type AssetKind =
  | 'floor'
  | 'wall'
  | 'door'
  | 'bed'
  | 'table'
  | 'chair'
  | 'personA'
  | 'personB'
  | HomeAssetKind;
export type Transform = {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
};
export type SceneObject = {
  id: string;
  name: string;
  kind: AssetKind;
  color?: string;
  zone?: string;
};
export type CameraState = {
  position: Vec3;
  rotation: Vec3;
  focalLength: number;
  gateHeight: number;
  aspect: '16:9' | '9:16';
  locked: boolean;
};
export type Shot = {
  id: string;
  name: string;
  camera: CameraState;
  lighting: LightingState;
  objects: Record<string, Transform>;
  savedAt: string | null;
};
export type Project = {
  version: 3;
  units: 'meters';
  title: string;
  scene: { objects: SceneObject[] };
  shots: Shot[];
  activeShotId: string;
};
export type History = {
  past: Project[];
  present: Project;
  future: Project[];
  transaction: Project | null;
};
export type Mode = 'translate' | 'rotate' | 'scale';
export type LightingState = {
  sources: LightSource[];
  ambient: { intensity: number; color: string };
  hemisphere: { intensity: number; skyColor: string; groundColor: string };
  key: {
    enabled: boolean;
    intensity: number;
    color: string;
    position: Vec3;
    target: Vec3;
    castShadow: boolean;
  };
};
export type LightingUpdate = {
  [K in Exclude<keyof LightingState, 'sources'>]?: Partial<LightingState[K]>;
} & { sources?: LightSource[] };
export type LightKind = 'directional' | 'point' | 'spot';
export type LightHandle = 'position' | 'target';
export type LightSelection = { id: string; handle: LightHandle };
export type LightSource = LightingState['key'] & {
  id: string;
  name: string;
  kind: LightKind;
  distance: number;
  angle: number;
  penumbra: number;
};
export const ASSETS: { kind: AssetKind; name: string; size: string }[] = [
  { kind: 'floor', name: '地面', size: '8 × 6 m' },
  { kind: 'wall', name: '墙体', size: '4 × 3 m' },
  { kind: 'door', name: '门框', size: '1.2 × 2.4 m' },
  { kind: 'bed', name: '床', size: '1.6 × 2.1 m' },
  { kind: 'table', name: '桌子', size: '1.6 × 0.8 m' },
  { kind: 'chair', name: '椅子', size: '0.5 × 0.5 m' },
  { kind: 'personA', name: '人物 A', size: '1.75 m · 青色' },
  { kind: 'personB', name: '人物 B', size: '1.65 m · 赭色' },
  ...HOME_ASSETS,
];
