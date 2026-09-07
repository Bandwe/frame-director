'use client';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { NumberField } from './PropertyFields';

export function Intensity({
  label,
  value,
  max,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  max: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="light-intensity">
      <div>
        <span>{label}</span>
        <NumberField
          label={label}
          value={value}
          min={0}
          max={max}
          step={0.05}
          disabled={disabled}
          onCommit={onCommit}
        />
      </div>
      <Slider
        aria-label={`${label}滑杆`}
        value={[draft]}
        min={0}
        max={max}
        step={0.05}
        disabled={disabled}
        onValueChange={(v) => setDraft(Array.isArray(v) ? v[0] : v)}
        onValueCommitted={(v) => onCommit(Array.isArray(v) ? v[0] : v)}
      />
      <small>
        0 — {max} · {draft.toFixed(2)} · 松开应用
      </small>
    </div>
  );
}

export function ColorField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onCommit: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const canceled = useRef(false);
  useEffect(() => setText(value), [value]);
  return (
    <div className="light-color">
      <span>{label}</span>
      <div>
        <input
          aria-label={`${label}拾色器`}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onCommit(e.target.value)}
        />
        <Input
          aria-label={`${label}色值`}
          value={text}
          disabled={disabled}
          maxLength={7}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (canceled.current) {
              canceled.current = false;
              return;
            }
            if (/^#[0-9a-f]{6}$/i.test(text)) onCommit(text.toLowerCase());
            else setText(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              canceled.current = true;
              setText(value);
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    </div>
  );
}
