'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { Object3D } from 'three';
import type { Mode } from '../types';

// Construct native controls inside the effect, so StrictMode and repeated
// cancel/select unmounts always disconnect listeners and dispose resources.
export function TransformHandle(props: {
  object: Object3D;
  mode: Mode;
  space?: 'world' | 'local';
  size?: number;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onObjectChange: () => void;
}) {
  const { camera, gl, controls: orbit, invalidate } = useThree();
  const latest = useRef(props);
  latest.current = props;
  const [control, setControl] = useState<TransformControls | null>(null);
  useLayoutEffect(() => {
    const c = new TransformControls(camera, gl.domElement);
    const orbitControl = orbit as unknown as { enabled: boolean } | null;
    const previousEnabled = orbitControl?.enabled;
    c.attach(props.object);
    c.setMode(latest.current.mode);
    c.setSpace(latest.current.space ?? 'world');
    c.setSize(latest.current.size ?? 0.85);
    const down = () => latest.current.onMouseDown();
    const up = () => latest.current.onMouseUp();
    const changed = () => {
      latest.current.onObjectChange();
      invalidate();
    };
    const dragging = (e: { value: unknown }) => {
      if (orbitControl) orbitControl.enabled = !e.value;
    };
    c.addEventListener('mouseDown', down);
    c.addEventListener('mouseUp', up);
    c.addEventListener('objectChange', changed);
    c.addEventListener('dragging-changed', dragging);
    setControl(c);
    return () => {
      c.removeEventListener('mouseDown', down);
      c.removeEventListener('mouseUp', up);
      c.removeEventListener('objectChange', changed);
      c.removeEventListener('dragging-changed', dragging);
      c.detach();
      c.dispose();
      if (orbitControl && previousEnabled !== undefined)
        orbitControl.enabled = previousEnabled;
    };
  }, [camera, gl, orbit, props.object, invalidate]);
  useLayoutEffect(() => {
    control?.setMode(props.mode);
    control?.setSpace(props.space ?? 'world');
    control?.setSize(props.size ?? 0.85);
  }, [control, props.mode, props.space, props.size]);
  return control ? (
    <primitive
      object={control.getHelper()}
      name="helper:transform"
      dispose={null}
    />
  ) : null;
}
