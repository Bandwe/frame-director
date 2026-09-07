'use client';
import { RotateCcw, CloudSun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Director } from '../useDirector';
import { defaultLighting } from '../lighting';
import { Intensity, ColorField } from './LightFields';
import { LightSourcesPanel } from './LightSourcesPanel';

export function LightingPanel({ d }: { d: Director }) {
  const l = d.shot.lighting;
  return (
    <div className="lighting-panel" key={d.shot.id}>
      <div className="light-intro">
        <strong>{d.shot.name}</strong>
        <p>灯光随镜头保存，预览与 PNG 共用。强度为相对值，不是测光读数。</p>
        <Button
          size="sm"
          variant="outline"
          disabled={d.dragging}
          onClick={() =>
            d.lighting({ ...defaultLighting(), sources: l.sources })
          }
        >
          <RotateCcw />
          重置基础光
        </Button>
      </div>
      <fieldset disabled={d.dragging}>
        <LightSourcesPanel d={d} />
        <section className="light-section">
          <h3>
            <CloudSun size={16} />
            环境填充
          </h3>
          <p>均匀提亮暗部，不产生阴影。</p>
          <Intensity
            label="环境光强度"
            value={l.ambient.intensity}
            max={5}
            disabled={d.dragging}
            onCommit={(intensity) => d.lighting({ ambient: { intensity } })}
          />
          <ColorField
            label="环境光颜色"
            value={l.ambient.color}
            disabled={d.dragging}
            onCommit={(color) => d.lighting({ ambient: { color } })}
          />
        </section>
        <section className="light-section">
          <h3>
            <CloudSun size={16} />
            天空 / 地面补光
          </h3>
          <p>分别为朝上、朝下的表面补光。</p>
          <Intensity
            label="天空补光强度"
            value={l.hemisphere.intensity}
            max={5}
            disabled={d.dragging}
            onCommit={(intensity) => d.lighting({ hemisphere: { intensity } })}
          />
          <ColorField
            label="天空颜色"
            value={l.hemisphere.skyColor}
            disabled={d.dragging}
            onCommit={(skyColor) => d.lighting({ hemisphere: { skyColor } })}
          />
          <ColorField
            label="地面反射色"
            value={l.hemisphere.groundColor}
            disabled={d.dragging}
            onCommit={(groundColor) =>
              d.lighting({ hemisphere: { groundColor } })
            }
          />
        </section>
      </fieldset>
    </div>
  );
}
