import type { Project } from './types.ts';
import { validateProject } from './project.ts';
const KEY = 'frame-director-project-v3';
const LEGACY_KEY = 'frame-director-project-v1';
export function encodeProject(p: Project) {
  return JSON.stringify(validateProject(p), null, 2);
}
export function decodeProject(text: string) {
  if (text.length > 8_000_000) throw new Error('项目文件超过 8 MB 上限。');
  return validateProject(JSON.parse(text));
}
function scopedKey(scope?: string) {
  if (scope && !/^[a-zA-Z0-9_-]{1,80}$/.test(scope))
    throw new Error('无效的本机项目标识');
  return scope ? `${KEY}:${scope}` : KEY;
}
export function loadLocal(scope?: string): Project | null {
  // Preserve old raw backups. A corrupt current version must surface, not fall back.
  const raw = scope
    ? localStorage.getItem(scopedKey(scope))
    : (localStorage.getItem(KEY) ??
      localStorage.getItem('frame-director-project-v2') ??
      localStorage.getItem(LEGACY_KEY));
  return raw ? decodeProject(raw) : null;
}
export function saveLocal(p: Project, scope?: string) {
  localStorage.setItem(scopedKey(scope), encodeProject(p));
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function downloadProject(p: Project) {
  downloadBlob(
    new Blob([encodeProject(p)], { type: 'application/json' }),
    `${p.title.replace(/[\\/:*?"<>|]/g, '_')}.frame.json`,
  );
}
