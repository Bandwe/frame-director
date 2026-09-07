'use client';
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
} from '@react-three/drei';
import { CameraHelper, PerspectiveCamera } from 'three';
import { Camera, Focus, Lock, Scan, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Director } from '../useDirector';
import type { CameraState, Vec3 } from '../types';
import { configureCamera, captureEditor, frameSpec } from '../camera';
import { configureRenderer, renderFrame } from './exportFrame';
import { SceneContent } from './SceneContent';
import { LightGizmos, EditorLightFocus } from './LightGizmos';

class WebGLBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="webgl-error">
        三维视窗无法启动。请开启浏览器硬件加速，并用本机 Chrome / Edge
        打开此页面。
      </div>
    ) : (
      this.props.children
    );
  }
}
function Rig({
  shot,
  onReady,
}: {
  shot: CameraState;
  onReady: (f: () => CameraState) => void;
}) {
  const { camera } = useThree();
  const latest = useRef(shot);
  latest.current = shot;
  useEffect(
    () =>
      onReady(() => captureEditor(camera as PerspectiveCamera, latest.current)),
    [camera, onReady],
  );
  return null;
}
function ShotFrustum({ state }: { state: CameraState }) {
  const [camera] = useState(() => new PerspectiveCamera()),
    [helper] = useState(() => new CameraHelper(camera));
  useLayoutEffect(() => {
    configureCamera(camera, state);
    // Display a short working frustum instead of a 500m helper across the room.
    camera.near = 0.2;
    camera.far = 5;
    camera.updateProjectionMatrix();
    helper.update();
  }, [camera, helper, state]);
  useEffect(() => () => helper.dispose(), [helper]);
  return <primitive object={helper} />;
}
export type Exporter = () => Promise<{
  blob: Blob;
  width: number;
  height: number;
}>;
function PreviewRig({
  state,
  onReady,
}: {
  state: CameraState;
  onReady: (f: Exporter) => void;
}) {
  const { camera, scene } = useThree();
  const latest = useRef(state);
  latest.current = state;
  useFrame(() => configureCamera(camera as PerspectiveCamera, latest.current));
  useLayoutEffect(() => {
    configureCamera(camera as PerspectiveCamera, state);
  }, [camera, state]);
  useEffect(
    () => onReady(() => renderFrame(scene, latest.current)),
    [scene, onReady],
  );
  return null;
}
export function Viewports({
  d,
  exportRef,
  editorView,
}: {
  d: Director;
  exportRef: React.RefObject<Exporter | null>;
  editorView?: { position: Vec3; target: Vec3 };
}) {
  const capture = useRef<(() => CameraState) | null>(null),
    container = useRef<HTMLDivElement>(null),
    transformGesture = useRef(false);
  const [previewSize, setPreviewSize] = useState({ width: 400, height: 225 }),
    [helpers, setHelpers] = useState(true);
  const spec = frameSpec(d.shot.camera);
  useEffect(() => {
    const e = container.current;
    if (!e) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const w = Math.max(1, Math.min(width, height * spec.aspect));
      setPreviewSize({ width: w, height: w / spec.aspect });
    });
    observer.observe(e);
    return () => observer.disconnect();
  }, [spec.aspect]);
  return (
    <div className="viewports">
      <section className="editor-panel">
        <div className="viewport-heading">
          <span>
            <Scan size={15} /> 空间编辑 <small>透视视图</small>
          </span>
          <div>
            <Button
              variant="ghost"
              size="sm"
              disabled={d.dragging}
              onClick={() => setHelpers((v) => !v)}
            >
              {helpers ? '隐藏辅助' : '显示辅助'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={d.shot.camera.locked || d.dragging}
              onClick={() => {
                if (capture.current) {
                  d.camera(capture.current());
                  d.setMessage(
                    '已复制编辑视角的位置、朝向与垂直视角；拍摄机位按所选画幅取景。',
                  );
                }
              }}
            >
              <Focus />
              设为拍摄机位
            </Button>
          </div>
        </div>
        <div
          className="editor-canvas"
          onPointerDownCapture={() => {
            // Reset at the next gesture, not pointerup: the click following a
            // gizmo drag must not select the floor under the pointer.
            transformGesture.current = false;
          }}
        >
          <WebGLBoundary>
            <Suspense fallback={null}>
              <Canvas
                shadows
                dpr={[1, 1.5]}
                camera={{
                  position: editorView?.position ?? [8, 6.5, 10],
                  fov: 48,
                  near: 0.05,
                  far: 500,
                }}
                gl={{ antialias: true }}
                onCreated={({ gl }) => configureRenderer(gl)}
                onPointerMissed={() => {
                  if (!d.dragging && !transformGesture.current)
                    d.setSelected(null);
                }}
              >
                <SceneContent
                  key={d.shot.id + ':' + d.gestureId}
                  project={d.project}
                  shot={d.shot}
                  edit={{
                    selected: d.selected,
                    mode: d.mode,
                    select: (id) => {
                      if (!transformGesture.current) d.setSelected(id);
                    },
                    begin: () => {
                      transformGesture.current = true;
                      d.begin();
                    },
                    end: d.end,
                    change: d.dragTransform,
                  }}
                />
                {(d.inspectorTab === 'lighting' || d.lightSelection) && (
                  <LightGizmos
                    key={
                      d.shot.id +
                      ':' +
                      d.gestureId +
                      ':' +
                      (d.lightSelection?.id ?? '') +
                      ':' +
                      (d.lightSelection?.handle ?? '')
                    }
                    d={d}
                    showAll={helpers}
                    interactions={{
                      blocked: () => transformGesture.current || d.dragging,
                      begin: () => {
                        transformGesture.current = true;
                      },
                    }}
                  />
                )}
                <EditorLightFocus d={d} />
                <OrbitControls
                  makeDefault
                  enabled={!d.dragging}
                  target={editorView?.target ?? [0, 1, 0]}
                  minDistance={0.3}
                  maxDistance={80}
                  enableDamping={false}
                />
                <Rig
                  shot={d.shot.camera}
                  onReady={(f) => {
                    capture.current = f;
                  }}
                />
                {helpers && (
                  <>
                    <Grid
                      position={[0, 0.005, 0]}
                      args={[50, 50]}
                      cellSize={1}
                      cellThickness={0.5}
                      cellColor="#687679"
                      sectionSize={5}
                      sectionThickness={1}
                      sectionColor="#3f6166"
                      fadeDistance={45}
                    />
                    <ShotFrustum state={d.shot.camera} />
                    <GizmoHelper alignment="bottom-right" margin={[65, 65]}>
                      <GizmoViewport
                        axisColors={['#cb797c', '#8eac80', '#89a9d4']}
                        labelColor="white"
                      />
                    </GizmoHelper>
                  </>
                )}
              </Canvas>
            </Suspense>
          </WebGLBoundary>
          <span className="meter-badge">1 单位 = 1 米</span>
          <span className="editor-hint">
            {d.lightSelection
              ? 'W 灯位 · E 目标 · F 定位 · 方向键微调 · Esc 取消'
              : '左键环绕 · 右键平移 · 滚轮推进'}
          </span>
        </div>
      </section>
      <section className="preview-panel">
        <div className="viewport-heading">
          <span>
            <Video size={15} /> 拍摄机位 <small>独立预览</small>
          </span>
          <span className="live-label">
            <i />
            {d.shot.camera.locked ? (
              <>
                <Lock size={12} />
                已锁定
              </>
            ) : (
              '实时'
            )}
          </span>
        </div>
        <div className="preview-stage" ref={container}>
          <div className="shot-frame" style={previewSize}>
            <WebGLBoundary>
              <Canvas
                shadows
                dpr={1}
                gl={{ antialias: true }}
                onCreated={({ gl }) => configureRenderer(gl)}
              >
                <SceneContent project={d.project} shot={d.shot} />
                <PreviewRig
                  state={d.shot.camera}
                  onReady={(f) => {
                    exportRef.current = f;
                  }}
                />
              </Canvas>
            </WebGLBoundary>
          </div>
        </div>
        <div className="preview-caption">
          <span>
            <Camera size={13} />
            {d.shot.camera.focalLength.toFixed(1)} mm
          </span>
          <span>{d.shot.camera.aspect}</span>
          <span>
            {spec.width} × {spec.height}
          </span>
        </div>
        <div className="shot-note">
          <strong>{d.shot.name}</strong>
          <p>预览仅显示拍摄内容。PNG 与此画面使用同一机位、片门与光照。</p>
        </div>
      </section>
    </div>
  );
}
