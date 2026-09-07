'use client';
import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { Scene } from 'three';
import { SceneContent } from '@/director/scene/SceneContent';
import { configureRenderer } from '@/director/scene/exportFrame';
import { configureCamera } from '@/director/camera';
import { defaultProject, currentShot } from '@/director/project';
import { validatePNGs, type CheckResult } from '@/tests/png.browser';
import { Button } from '@/components/ui/button';
import { PerspectiveCamera } from 'three';
const fixture = defaultProject(),
  shot = currentShot(fixture);
function Ready({ ready }: { ready: (s: Scene) => void }) {
  const { scene, camera } = useThree();
  useEffect(() => {
    configureCamera(camera as PerspectiveCamera, shot.camera);
    ready(scene);
  }, [scene, camera, ready]);
  return null;
}
export default function Verify() {
  const [mounted, setMounted] = useState(false),
    [scene, setScene] = useState<Scene | null>(null),
    [checks, setChecks] = useState<CheckResult[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => setMounted(true), []);
  return (
    <main style={{ maxWidth: 900, margin: '30px auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>PNG 导出验证</h1>
      <p style={{ fontSize: 14, marginBottom: 20, color: '#aabac5' }}>
        只使用内置测试场景，不读取或修改你的项目。检查两种画幅的真实 PNG
        解码尺寸、像素内容与重复导出一致性。
      </p>
      <div style={{ width: 480, height: 270, marginBottom: 20 }}>
        {mounted && (
          <Canvas shadows dpr={1} onCreated={({ gl }) => configureRenderer(gl)}>
            <SceneContent project={fixture} shot={shot} />
            <Ready ready={setScene} />
          </Canvas>
        )}
      </div>
      <Button
        disabled={!scene || busy}
        onClick={async () => {
          if (!scene) return;
          setBusy(true);
          setError('');
          try {
            setChecks(await validatePNGs(scene, shot.camera));
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '验证中…' : '运行 PNG 验证'}
      </Button>
      <a style={{ marginLeft: 20, color: '#b8d9ba' }} href="/">
        返回导演台
      </a>
      {error && <p role="alert">{error}</p>}
      <div role="status" style={{ marginTop: 24 }}>
        {checks.length > 0 && (
          <h2 style={{ fontSize: 20 }}>
            {checks.every((c) => c.passed) ? '全部通过' : '存在失败项'} ·{' '}
            {checks.filter((c) => c.passed).length} / {checks.length}
          </h2>
        )}
        {checks.map((c) => (
          <div
            key={c.name}
            style={{ borderBottom: '1px solid #45525c', padding: '10px 0' }}
          >
            <strong
              style={{ fontSize: 14, color: c.passed ? '#b8d9ba' : '#eeac93' }}
            >
              {c.passed ? 'PASS' : 'FAIL'} · {c.name}
            </strong>
            <p style={{ fontSize: 12, color: '#98aab7', margin: '6px 0 0' }}>
              {c.detail}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
