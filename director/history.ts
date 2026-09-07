import type { History, Project } from './types.ts';
import { clone } from './project.ts';
import { switchShot } from './project.ts';
const same = (a: Project, b: Project) =>
  JSON.stringify(a) === JSON.stringify(b);
export function newHistory(p: Project): History {
  return { past: [], present: clone(p), future: [], transaction: null };
}
export function begin(h: History): History {
  return h.transaction ? h : { ...h, transaction: clone(h.present) };
}
export function apply(h: History, p: Project): History {
  if (same(h.present, p)) return h;
  if (h.transaction) return { ...h, present: clone(p) };
  return {
    past: [...h.past, clone(h.present)].slice(-80),
    present: clone(p),
    future: [],
    transaction: null,
  };
}
export function commit(h: History): History {
  if (!h.transaction) return h;
  // A gesture can return exactly to its start after marking a saved shot dirty.
  // Ignore only that marker, then restore the original saved state and redo stack.
  const content = (p: Project) =>
    JSON.stringify(p, (key, value) => (key === 'savedAt' ? null : value));
  if (content(h.transaction) === content(h.present))
    return { ...h, present: h.transaction, transaction: null };
  return {
    past: [...h.past, h.transaction].slice(-80),
    present: h.present,
    future: [],
    transaction: null,
  };
}
export function cancel(h: History): History {
  return h.transaction
    ? { ...h, present: h.transaction, transaction: null }
    : h;
}
// Navigation does not consume an undo step or erase redo. Undo restores the
// active shot recorded with the edit, so an edit cannot land in the wrong shot.
export function navigate(h: History, shotId: string): History {
  const next = commit(h);
  return { ...next, present: switchShot(next.present, shotId) };
}
export function dragApply(h: History, fn: (p: Project) => Project): History {
  return h.transaction ? apply(h, fn(h.present)) : h;
}
export function undo(h: History): History {
  h = commit(h);
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past.at(-1)!,
    future: [h.present, ...h.future],
    transaction: null,
  };
}
export function redo(h: History): History {
  h = commit(h);
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
    transaction: null,
  };
}
