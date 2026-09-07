'use client';
import { useEffect, useRef, useState } from 'react';
import type {
  Project,
  Mode,
  Transform,
  CameraState,
  AssetKind,
  LightingUpdate,
  LightSelection,
  LightKind,
  LightHandle,
  LightSource,
  Vec3,
} from './types';
import * as L from './multiLights';
import { allLights } from './lighting';
import * as P from './project';
import * as H from './history';
import { loadLocal, saveLocal } from './persistence';

export function useDirector(initialProject?: Project, storageScope?: string) {
  const [history, setHistory] = useState(() =>
    H.newHistory(initialProject ?? P.defaultProject()),
  );
  const ref = useRef(history);
  ref.current = history;
  const [selected, setObjectSelection] = useState<string | null>('actor-a');
  const [mode, setObjectMode] = useState<Mode>('translate');
  const [lightSelection, setLightSelection] = useState<LightSelection | null>(
    null,
  );
  const [inspectorTab, setTab] = useState('properties');
  const [focusRequest, setFocusRequest] = useState(0);
  const lightDrag = useRef<{
    token: number;
    shotId: string;
    id: string;
    handle: LightHandle;
  } | null>(null);
  const dragSequence = useRef(0);
  const [ready, setReady] = useState(false),
    [saved, setSaved] = useState('正在恢复'),
    [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const [gestureId, setGestureId] = useState(0);
  const update = (fn: (p: Project) => Project) =>
    setHistory((h) => H.apply(h, fn(h.present)));
  useEffect(() => {
    try {
      const p = loadLocal(storageScope);
      if (p) setHistory(H.newHistory(p));
      setSaved('本机自动保存');
    } catch {
      setSaved('恢复失败');
      setMessage('本机存档无法读取，暂未覆盖。请打开有效项目文件后继续。');
      return;
    }
    setReady(true);
  }, [storageScope]);
  useEffect(() => {
    if (!ready || history.transaction) return;
    setSaved('保存中…');
    const t = setTimeout(() => {
      try {
        saveLocal(history.present, storageScope);
        setSaved('已保存到本机');
      } catch {
        setSaved('自动保存失败');
        setMessage('本机存储不足，请立即保存项目文件。');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [history.present, history.transaction, ready, storageScope]);
  const project = history.present,
    shot = P.currentShot(project);
  useEffect(() => {
    const flush = () => {
      if (ready) {
        try {
          saveLocal(
            ref.current.transaction ?? ref.current.present,
            storageScope,
          );
        } catch {
          /* explicit project export remains available */
        }
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [ready, storageScope]);
  function begin() {
    lightDrag.current = null;
    setHistory(H.begin);
    setDragging(true);
  }
  function end() {
    lightDrag.current = null;
    setHistory(H.commit);
    setDragging(false);
  }
  function cancel() {
    lightDrag.current = null;
    setHistory(H.cancel);
    setDragging(false);
    // Remount controls and their target to terminate native pointer capture.
    setGestureId((v) => v + 1);
  }
  function undo() {
    setHistory(H.undo);
    setDragging(false);
  }
  function redo() {
    setHistory(H.redo);
    setDragging(false);
  }
  function transform(objectId: string, change: Partial<Transform>) {
    update((p) => P.updateTransform(p, objectId, change));
  }
  function dragTransform(objectId: string, change: Partial<Transform>) {
    setHistory((h) =>
      H.dragApply(h, (p) => P.updateTransform(p, objectId, change)),
    );
  }
  function camera(change: Partial<CameraState>) {
    update((p) => P.updateCamera(p, change));
  }
  function lighting(change: LightingUpdate) {
    try {
      // Validate before entering React's updater, so invalid direction is recoverable.
      const next = P.updateLighting(ref.current.present, change);
      update(() => next);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '灯光参数无效');
      return false;
    }
  }
  function setSelected(id: string | null) {
    if (ref.current.transaction) return;
    setObjectSelection(id);
    setLightSelection(null);
    if (id) setTab('properties');
  }
  function selectLight(id: string, handle: LightHandle = 'position') {
    if (ref.current.transaction) return;
    const source = allLights(P.currentShot(ref.current.present).lighting).find(
      (s) => s.id === id,
    );
    if (!source) return;
    setObjectSelection(null);
    setLightSelection({
      id,
      handle: source.kind === 'point' ? 'position' : handle,
    });
    setTab('lighting');
  }
  function setInspectorTab(tab: string) {
    if (ref.current.transaction) return;
    setTab(tab);
    if (tab === 'lighting' && !lightSelection) {
      selectLight('main');
      setFocusRequest((v) => v + 1);
    }
    if (tab === 'properties') setLightSelection(null);
  }
  function setMode(next: Mode) {
    if (ref.current.transaction) return;
    if (lightSelection) {
      if (next === 'scale') return;
      selectLight(lightSelection.id, next === 'rotate' ? 'target' : 'position');
    } else setObjectMode(next);
  }
  function lightAction(action: () => Project) {
    if (ref.current.transaction) return false;
    try {
      const p = action();
      update(() => p);
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '灯光操作失败');
      return false;
    }
  }
  function light(id: string, change: Partial<LightSource>) {
    return lightAction(() => L.updateLight(ref.current.present, id, change));
  }
  function addLight(kind: LightKind) {
    let added = '';
    if (
      lightAction(() => {
        const r = L.addLight(ref.current.present, kind);
        added = r.lightId;
        return r.project;
      })
    ) {
      setLightSelection({ id: added, handle: 'position' });
      setObjectSelection(null);
      setTab('lighting');
      setFocusRequest((v) => v + 1);
    }
  }
  function copyLight(id: string) {
    let added = '';
    if (
      lightAction(() => {
        const r = L.duplicateLight(ref.current.present, id);
        added = r.lightId;
        return r.project;
      })
    ) {
      setLightSelection({ id: added, handle: 'position' });
      setObjectSelection(null);
      setTab('lighting');
    }
  }
  function deleteLight(id: string) {
    if (
      lightAction(() => L.removeLight(ref.current.present, id)) &&
      id !== 'main'
    )
      setLightSelection(null);
  }
  function beginLight(id: string, handle: LightHandle) {
    const token = ++dragSequence.current;
    lightDrag.current = {
      token,
      shotId: ref.current.present.activeShotId,
      id,
      handle,
    };
    setHistory(H.begin);
    setDragging(true);
    return token;
  }
  function dragLight(
    shotId: string,
    id: string,
    handle: LightHandle,
    token: number,
    position: Vec3,
  ) {
    const session = lightDrag.current;
    if (
      !session ||
      session.token !== token ||
      session.shotId !== shotId ||
      session.id !== id ||
      session.handle !== handle
    )
      return false;
    const p = ref.current.present;
    const next = L.moveLightHandle(p, shotId, id, handle, position);
    // A previous move may still be queued by React. Always enqueue the final
    // position, including a return to the render-time position, against latest h.
    setHistory((h) =>
      H.dragApply(h, (p) => L.moveLightHandle(p, shotId, id, handle, position)),
    );
    return next !== p;
  }
  function nudgeLight(delta: Vec3) {
    if (!lightSelection) return;
    const source = allLights(P.currentShot(ref.current.present).lighting).find(
      (s) => s.id === lightSelection.id,
    );
    if (source)
      light(source.id, {
        [lightSelection.handle]: source[lightSelection.handle].map(
          (v, i) => v + delta[i],
        ) as Vec3,
      });
  }
  function selectShot(shotId: string) {
    if (ref.current.transaction) return;
    setHistory((h) => H.navigate(h, shotId));
    setSelected(null);
    setDragging(false);
  }
  function add(kind: AssetKind) {
    const r = P.addObject(ref.current.present, kind);
    update(() => r.project);
    setSelected(r.objectId);
  }
  function duplicate() {
    if (lightSelection) {
      copyLight(lightSelection.id);
      return;
    }
    if (!selected || !P.currentShot(ref.current.present).objects[selected])
      return;
    const r = P.duplicateObject(ref.current.present, selected);
    update(() => r.project);
    setSelected(r.objectId);
  }
  function remove() {
    if (lightSelection) {
      deleteLight(lightSelection.id);
      return;
    }
    if (!selected || !P.currentShot(ref.current.present).objects[selected])
      return;
    update((p) => P.removeObject(p, selected));
    setSelected(null);
  }
  function restore(p: Project) {
    setHistory(H.newHistory(P.validateProject(p)));
    setSelected(null);
    setReady(true);
    setMessage('项目已恢复，包括每个镜头的摄影机、对象与灯光状态。');
  }
  const activeSelected = selected && shot.objects[selected] ? selected : null;
  const activeLight =
    lightSelection &&
    allLights(shot.lighting).some((s) => s.id === lightSelection.id)
      ? lightSelection
      : null;
  return {
    project,
    shot,
    selected: activeSelected,
    setSelected,
    mode,
    setMode,
    lightSelection: activeLight,
    selectLight,
    inspectorTab,
    setInspectorTab,
    focusRequest,
    focusLight: () => setFocusRequest((v) => v + 1),
    light,
    addLight,
    copyLight,
    deleteLight,
    beginLight,
    dragLight,
    nudgeLight,
    history,
    ready,
    saved,
    message,
    setMessage,
    dragging,
    gestureId,
    dragTransform,
    begin,
    end,
    cancel,
    undo,
    redo,
    transform,
    camera,
    lighting,
    selectShot,
    add,
    duplicate,
    remove,
    restore,
    update,
  };
}
export type Director = ReturnType<typeof useDirector>;
