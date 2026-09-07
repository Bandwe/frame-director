'use client';
import { Copy, Trash2, Camera, Lock, Unlock, Move3D, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { NumberField, VectorFields } from './PropertyFields';
import type { Director } from '../useDirector';
import { frameSpec } from '../camera';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LightingPanel } from './LightingPanel';

export function Inspector({ d }: { d: Director }) {
  const object = d.project.scene.objects.find((o) => o.id === d.selected),
    t = d.selected ? d.shot.objects[d.selected] : null,
    c = d.shot.camera,
    spec = frameSpec(c);
  return (
    <aside className="inspector">
      <div className="panel-title">
        <span>镜头控制</span>
        <Move3D size={15} />
      </div>
      <Tabs
        value={d.inspectorTab}
        onValueChange={(v) => d.setInspectorTab(String(v))}
        className="inspector-tabs"
      >
        <TabsList className="inspector-tab-list" aria-label="镜头控制面板">
          <TabsTrigger value="properties" disabled={d.dragging}>
            <Move3D size={14} />
            属性
          </TabsTrigger>
          <TabsTrigger value="lighting" disabled={d.dragging}>
            <Sun size={14} />
            灯光
          </TabsTrigger>
        </TabsList>
        <TabsContent value="properties">
          {object && t ? (
            <div className="object-properties">
              <div className="object-name">
                <strong>{object.name}</strong>
                <div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="复制对象"
                    disabled={d.dragging}
                    onClick={d.duplicate}
                  >
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="删除对象"
                    disabled={d.dragging}
                    onClick={d.remove}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <VectorFields
                title="位置"
                value={t.position}
                onCommit={(v) => d.transform(object.id, { position: v })}
              />
              <VectorFields
                title="旋转"
                value={t.rotation}
                angle
                onCommit={(v) => d.transform(object.id, { rotation: v })}
              />
              <VectorFields
                title="缩放"
                value={t.scale}
                scale
                onCommit={(v) => d.transform(object.id, { scale: v })}
              />
              <p className="property-note">
                修改仅影响当前镜头。删除对象不影响其他镜头。
              </p>
            </div>
          ) : (
            <div className="nothing-selected">
              点击场景物体或场景树
              <br />
              查看并编辑对象属性
            </div>
          )}
          <div className="camera-title">
            <span>
              <Camera size={16} />
              摄影机
            </span>
            <Button
              variant={c.locked ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => d.camera({ locked: !c.locked })}
            >
              {c.locked ? <Lock /> : <Unlock />}
              {c.locked ? '已锁定' : '锁定'}
            </Button>
          </div>
          <div className={'camera-properties ' + (c.locked ? 'locked' : '')}>
            <VectorFields
              title="机位位置"
              value={c.position}
              disabled={c.locked}
              onCommit={(v) => d.camera({ position: v })}
            />
            <VectorFields
              title="机位朝向"
              value={c.rotation}
              angle
              disabled={c.locked}
              onCommit={(v) => d.camera({ rotation: v })}
            />
            <div className="lens-row">
              <label>
                焦距 <small>mm</small>
                <NumberField
                  value={c.focalLength}
                  min={12}
                  max={200}
                  step={1}
                  label="摄影机焦距"
                  disabled={c.locked}
                  onCommit={(focalLength) => d.camera({ focalLength })}
                />
              </label>
              <label>
                拍摄画幅
                <NativeSelect
                  aria-label="拍摄画幅"
                  disabled={c.locked}
                  value={c.aspect}
                  onChange={(e) =>
                    d.camera({ aspect: e.target.value as '16:9' | '9:16' })
                  }
                >
                  <NativeSelectOption value="16:9">
                    16:9 横屏
                  </NativeSelectOption>
                  <NativeSelectOption value="9:16">
                    9:16 竖屏
                  </NativeSelectOption>
                </NativeSelect>
              </label>
            </div>
            <div className="lens-presets">
              {[24, 35, 50, 85].map((f) => (
                <button
                  key={f}
                  className={Math.abs(c.focalLength - f) < 0.01 ? 'chosen' : ''}
                  disabled={c.locked}
                  onClick={() => d.camera({ focalLength: f })}
                >
                  {f} mm
                </button>
              ))}
            </div>
            <dl className="sensor-info">
              <div>
                <dt>片门 · 固定垂直</dt>
                <dd>{spec.gateWidth.toFixed(2)} × 24 mm</dd>
              </div>
              <div>
                <dt>垂直视角</dt>
                <dd>{spec.fov.toFixed(2)}°</dd>
              </div>
              <div>
                <dt>PNG 输出</dt>
                <dd>
                  {spec.width} × {spec.height}
                </dd>
              </div>
            </dl>
            <details className="camera-rules">
              <summary>取景计算规则</summary>
              <p>
                垂直片门恒为 24 mm。垂直 FOV = 2 × atan(24 ÷ (2 ×
                焦距))。横竖切换仅改变水平覆盖范围；不是旋转同一块传感器。Y
                轴向上，相机看向本地 −Z；朝向以 YXZ 欧拉角存储，面板显示角度。
              </p>
            </details>
          </div>
        </TabsContent>
        <TabsContent value="lighting">
          <LightingPanel d={d} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
