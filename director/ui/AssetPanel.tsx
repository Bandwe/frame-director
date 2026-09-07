import {
  Box,
  DoorOpen,
  BedDouble,
  Armchair,
  User,
  Square,
  Grid2X2,
  Table2,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import { ASSETS } from '../types';
import type { AssetKind } from '../types';
import type { Director } from '../useDirector';
import { useState } from 'react';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
const icons: Partial<Record<AssetKind, typeof Box>> = {
  floor: Grid2X2,
  wall: Square,
  door: DoorOpen,
  bed: BedDouble,
  table: Table2,
  chair: Armchair,
  personA: User,
  personB: User,
};
export function AssetIcon({
  kind,
  size = 18,
}: {
  kind: AssetKind;
  size?: number;
}) {
  const Icon = icons[kind] || Box;
  return <Icon size={size} />;
}
export function AssetPanel({ d }: { d: Director }) {
  const [zone, setZone] = useState('all');
  const zones = [
    ...new Set(
      d.project.scene.objects
        .map((o) => o.zone)
        .filter((v): v is string => !!v),
    ),
  ];
  const activeZone = zones.includes(zone) ? zone : 'all';
  const tile = (a: (typeof ASSETS)[number]) => (
    <button
      key={a.kind}
      className={'asset-tile ' + a.kind}
      onClick={() => d.add(a.kind)}
      disabled={d.dragging}
      title={`添加${a.name}到当前镜头`}
    >
      <AssetIcon kind={a.kind} size={25} />
      <span>{a.name}</span>
      <small>{a.size}</small>
    </button>
  );
  return (
    <aside className="asset-panel">
      <div className="panel-title">
        <span>资产库</span>
        <small>内置白模</small>
      </div>
      {zones.length ? (
        <details className="home-assets">
          <summary>基础白模 · 8</summary>
          <div className="asset-grid">{ASSETS.slice(0, 8).map(tile)}</div>
        </details>
      ) : (
        <div className="asset-grid">{ASSETS.slice(0, 8).map(tile)}</div>
      )}
      <details className="home-assets">
        <summary>室内家具与建筑 · {ASSETS.length - 8}</summary>
        <div className="asset-grid">{ASSETS.slice(8).map(tile)}</div>
      </details>
      <div className="scene-title">
        <Layers size={15} />
        <span>场景树</span>
        <small>{Object.keys(d.shot.objects).length}</small>
      </div>
      {zones.length > 0 && (
        <label className="zone-filter">
          按房间选择
          <NativeSelect
            value={activeZone}
            onChange={(e) => setZone(e.target.value)}
            disabled={d.dragging}
            aria-label="场景树房间筛选"
          >
            <NativeSelectOption value="all">全部房间</NativeSelectOption>
            {zones.map((z) => (
              <NativeSelectOption key={z} value={z}>
                {z}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      )}
      <div className="scene-tree">
        {d.project.scene.objects
          .filter(
            (o) =>
              d.shot.objects[o.id] &&
              (activeZone === 'all' || o.zone === activeZone),
          )
          .map((o) => (
            <div
              key={o.id}
              className={'tree-row ' + (d.selected === o.id ? 'active' : '')}
            >
              <button
                disabled={d.dragging}
                title={o.name}
                onClick={() => d.setSelected(o.id)}
              >
                <AssetIcon kind={o.kind} size={15} />
                <span>{o.name}</span>
              </button>
              <button
                className="visibility"
                disabled={d.dragging}
                title="切换当前镜头可见性"
                aria-label={`${o.name}可见性`}
                onClick={() =>
                  d.transform(o.id, { visible: !d.shot.objects[o.id].visible })
                }
              >
                {d.shot.objects[o.id].visible ? (
                  <Eye size={13} />
                ) : (
                  <EyeOff size={13} />
                )}
              </button>
            </div>
          ))}
      </div>
      <div className="panel-footnote">
        资产定义共享
        <br />
        位置、变换与可见性按镜头保存
      </div>
    </aside>
  );
}
