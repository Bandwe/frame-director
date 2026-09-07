'use client';
import { useRef, useState } from 'react';
import { TransformHandle } from './TransformHandle';
import type { Group } from 'three';
import type { Project, Shot, SceneObject, Transform, Mode } from '../types';
import { AssetGeometry } from './AssetGeometry';
import { LightingRig } from './LightingRig';

type EditProps = {
  selected: string | null;
  mode: Mode;
  select: (id: string) => void;
  begin: () => void;
  end: () => void;
  change: (id: string, t: Partial<Transform>) => void;
};
function Item({
  object,
  state,
  edit,
}: {
  object: SceneObject;
  state: Transform;
  edit?: EditProps;
}) {
  const [group, setGroup] = useState<Group | null>(null),
    drag = useRef(false);
  const read = () => {
    if (!group) return;
    edit?.change(object.id, {
      position: group.position.toArray(),
      rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
      scale: group.scale.toArray().map((s) => Math.max(0.01, s)) as [
        number,
        number,
        number,
      ],
    });
  };
  if (!state.visible) return null;
  return (
    <>
      <group
        ref={setGroup}
        name={`asset:${object.id}`}
        position={state.position}
        rotation={state.rotation}
        scale={state.scale}
        onPointerDown={
          edit
            ? (e) => {
                e.stopPropagation();
              }
            : undefined
        }
        onClick={
          edit
            ? (e) => {
                e.stopPropagation();
                if (!drag.current && e.delta <= 3) edit.select(object.id);
              }
            : undefined
        }
      >
        <AssetGeometry kind={object.kind} color={object.color} />
      </group>
      {edit && edit.selected === object.id && group && (
        <TransformHandle
          object={group}
          mode={edit.mode}
          space="world"
          size={0.85}
          onMouseDown={() => {
            drag.current = true;
            edit.begin();
          }}
          onObjectChange={() => {
            if (drag.current) read();
          }}
          onMouseUp={() => {
            if (drag.current) {
              read();
              drag.current = false;
              edit.end();
            }
          }}
        />
      )}
    </>
  );
}
export function SceneContent({
  project,
  shot,
  edit,
}: {
  project: Project;
  shot: Shot;
  edit?: EditProps;
}) {
  return (
    <>
      <color attach="background" args={['#aeb8bd']} />
      <LightingRig lighting={shot.lighting} />
      {project.scene.objects
        .filter((o) => shot.objects[o.id])
        .map((o) => (
          <Item key={o.id} object={o} state={shot.objects[o.id]} edit={edit} />
        ))}
    </>
  );
}
