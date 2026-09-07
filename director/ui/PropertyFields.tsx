'use client';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { Vec3 } from '../types';

export function NumberField({
  value,
  onCommit,
  disabled = false,
  min = -10000,
  max = 10000,
  step = 0.1,
  label,
}: {
  value: number;
  onCommit: (v: number) => boolean | void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  const [text, setText] = useState(String(Number(value.toFixed(4))));
  const dirty = useRef(false);
  useEffect(() => {
    setText(String(Number(value.toFixed(4))));
    dirty.current = false;
  }, [value]);
  function finish() {
    if (!dirty.current) return;
    dirty.current = false;
    const n = Number(text);
    if (text.trim() && Number.isFinite(n) && n >= min && n <= max) {
      if (Math.abs(value - n) > 1e-8 && onCommit(n) === false)
        setText(String(Number(value.toFixed(4))));
    } else setText(String(Number(value.toFixed(4))));
  }
  return (
    <Input
      aria-label={label}
      type="number"
      value={text}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => {
        dirty.current = true;
        setText(e.target.value);
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          dirty.current = false;
          setText(String(Number(value.toFixed(4))));
          e.currentTarget.blur();
        }
      }}
    />
  );
}
export function VectorFields({
  title,
  value,
  onCommit,
  angle = false,
  disabled = false,
  scale = false,
  min = -10000,
  max = 10000,
}: {
  title: string;
  value: Vec3;
  onCommit: (v: Vec3) => boolean | void;
  angle?: boolean;
  disabled?: boolean;
  scale?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div className="vector-field">
      <div>
        {title}
        <small>{angle ? '°' : scale ? '倍率' : 'm'}</small>
      </div>
      <div className="vector-inputs">
        {['X', 'Y', 'Z'].map((axis, i) => (
          <label key={axis}>
            <span className={'axis-' + axis}>{axis}</span>
            <NumberField
              label={`${title} ${axis}`}
              value={value[i] * (angle ? 180 / Math.PI : 1)}
              onCommit={(n) => {
                const v = [...value] as Vec3;
                v[i] = n / (angle ? 180 / Math.PI : 1);
                return onCommit(v);
              }}
              min={scale ? 0.01 : min}
              max={max}
              disabled={disabled}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
