'use client';
import { useState } from 'react';
import {
  Sun,
  Lightbulb,
  Flashlight,
  Copy,
  Trash2,
  Focus,
  Move3D,
  Crosshair,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { allLights, LIGHT_NAMES, MAX_ADDITIONAL_LIGHTS } from '../lighting';
import type { Director } from '../useDirector';
import type { LightSource, LightKind } from '../types';
import { Intensity, ColorField } from './LightFields';
import { NumberField, VectorFields } from './PropertyFields';

const icons = { directional: Sun, point: Lightbulb, spot: Flashlight };
function SourceEditor({ d, s }: { d: Director; s: LightSource }) {
  const [name, setName] = useState(s.name);
  return (
    <div className="source-properties">
      <label className="source-name">
        灯光名称
        <Input
          aria-label="灯光名称"
          value={name}
          disabled={s.id === 'main' || d.dragging}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          onBlur={() => {
            if (!d.light(s.id, { name: name.trim() })) setName(s.name);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </label>
      <div className="light-edit-actions">
        <Button
          size="sm"
          variant="outline"
          disabled={d.dragging}
          onClick={() => d.copyLight(s.id)}
        >
          <Copy />
          复制
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={s.id === 'main' || d.dragging}
          onClick={() => d.deleteLight(s.id)}
        >
          <Trash2 />
          删除
        </Button>
      </div>
      <div className="light-edit-actions">
        <Button
          size="sm"
          variant={
            d.lightSelection?.id === s.id &&
            d.lightSelection.handle === 'position'
              ? 'secondary'
              : 'outline'
          }
          disabled={d.dragging}
          onClick={() => d.selectLight(s.id, 'position')}
        >
          <Move3D />
          拖灯位 W
        </Button>
        <Button
          size="sm"
          variant={
            d.lightSelection?.id === s.id &&
            d.lightSelection.handle === 'target'
              ? 'secondary'
              : 'outline'
          }
          disabled={d.dragging || s.kind === 'point'}
          onClick={() => d.selectLight(s.id, 'target')}
        >
          <Crosshair />
          拖目标 E
        </Button>
      </div>
      <Button
        className="light-focus"
        size="sm"
        variant="outline"
        disabled={d.dragging}
        onClick={() => {
          d.selectLight(s.id, d.lightSelection?.handle ?? 'position');
          d.focusLight();
        }}
      >
        <Focus />
        定位灯光 F
      </Button>
      <p>
        拖动三轴箭头或平面手柄。方向键沿 X/Z 微调，PageUp/Down 调高度；默认 0.1
        米，Shift 0.01 米，Alt 1 米。Esc 取消拖拽。
      </p>
      <Intensity
        label="灯光强度"
        value={s.intensity}
        max={s.kind === 'directional' ? 10 : 2000}
        disabled={d.dragging}
        onCommit={(intensity) => d.light(s.id, { intensity })}
      />
      <ColorField
        label="灯光颜色"
        value={s.color}
        disabled={d.dragging}
        onCommit={(color) => d.light(s.id, { color })}
      />
      <VectorFields
        title="灯位"
        value={s.position}
        min={-1000}
        max={1000}
        disabled={d.dragging}
        onCommit={(position) => d.light(s.id, { position })}
      />
      {s.kind !== 'point' ? (
        <VectorFields
          title="照射目标"
          value={s.target}
          min={-1000}
          max={1000}
          disabled={d.dragging}
          onCommit={(target) => d.light(s.id, { target })}
        />
      ) : (
        <p>点光向四周发光，没有方向手柄。</p>
      )}
      {s.kind !== 'directional' && (
        <label className="source-number">
          照射距离（米，0 为不限）
          <NumberField
            label="照射距离"
            value={s.distance}
            min={0}
            max={1000}
            step={1}
            disabled={d.dragging}
            onCommit={(distance) => d.light(s.id, { distance })}
          />
        </label>
      )}
      {s.kind === 'spot' && (
        <>
          <label className="source-number">
            聚光半角（度）
            <NumberField
              label="聚光半角"
              value={s.angle}
              min={5}
              max={89}
              step={1}
              disabled={d.dragging}
              onCommit={(angle) => d.light(s.id, { angle })}
            />
          </label>
          <label className="source-number">
            边缘柔化（0—1）
            <NumberField
              label="聚光边缘柔化"
              value={s.penumbra}
              min={0}
              max={1}
              step={0.05}
              disabled={d.dragging}
              onCommit={(penumbra) => d.light(s.id, { penumbra })}
            />
          </label>
        </>
      )}
      <label className="light-toggle">
        投射阴影
        <Switch
          aria-label="选中灯投射阴影"
          checked={s.castShadow}
          disabled={d.dragging}
          onCheckedChange={(castShadow) => d.light(s.id, { castShadow })}
        />
      </label>
      <p>
        {s.kind === 'directional'
          ? '平行光阴影覆盖目标周围 24 × 24 米。'
          : '点光与聚光按距离衰减，强度量级与平行光不同。'}
        最多 3 盏灯同时投射阴影。
      </p>
      {s.id === 'main' && <p>主光为固定基础灯，可以关闭或复制。</p>}
    </div>
  );
}

export function LightSourcesPanel({ d }: { d: Director }) {
  const lights = allLights(d.shot.lighting),
    source = lights.find((s) => s.id === d.lightSelection?.id) ?? lights[0];
  return (
    <section className="light-section">
      <h3>
        <Sun size={16} />
        空间光源 <small>{lights.length} / 8</small>
      </h3>
      <div className="light-add-actions">
        {(['directional', 'point', 'spot'] as LightKind[]).map((kind) => {
          const Icon = icons[kind];
          return (
            <Button
              key={kind}
              size="sm"
              variant="outline"
              disabled={
                d.dragging ||
                d.shot.lighting.sources.length >= MAX_ADDITIONAL_LIGHTS
              }
              onClick={() => d.addLight(kind)}
            >
              <Icon />
              {LIGHT_NAMES[kind]}
            </Button>
          );
        })}
      </div>
      <p>上方添加灯光；选中列表或编辑视窗中的金色灯标。</p>
      <div className="light-source-list">
        {lights.map((s) => {
          const Icon = icons[s.kind];
          return (
            <div
              key={s.id}
              className={
                'light-source-row ' +
                (s.id === d.lightSelection?.id ? 'active' : '')
              }
            >
              <button disabled={d.dragging} onClick={() => d.selectLight(s.id)}>
                <Icon size={16} />
                <span>
                  {s.name}
                  <small>{LIGHT_NAMES[s.kind]}</small>
                </span>
              </button>
              <Switch
                aria-label={`${s.name}开关`}
                checked={s.enabled}
                disabled={d.dragging}
                onCheckedChange={(enabled) => d.light(s.id, { enabled })}
              />
            </div>
          );
        })}
      </div>
      <SourceEditor
        key={d.shot.id + ':' + source.id + ':' + source.name}
        d={d}
        s={source}
      />
    </section>
  );
}
