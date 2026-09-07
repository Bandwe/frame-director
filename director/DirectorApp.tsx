'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Aperture,
  Undo2,
  Redo2,
  Move,
  RotateCw,
  Scaling,
  Download,
  FolderOpen,
  Save,
  Check,
  LoaderCircle,
  Keyboard,
  Copy,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useDirector } from './useDirector';
import { AssetPanel } from './ui/AssetPanel';
import { Inspector } from './ui/Inspector';
import { ShotStrip } from './ui/ShotStrip';
import { Viewports, type Exporter } from './scene/Viewports';
import { decodeProject, downloadBlob, downloadProject } from './persistence';
import { frameSpec } from './camera';
import type { Project, Vec3 } from './types';
import { allLights } from './lighting';

export function DirectorApp({
  initialProject,
  storageScope,
  editorView,
  note,
}: {
  initialProject?: Project;
  storageScope?: string;
  editorView?: { position: Vec3; target: Vec3 };
  note?: string;
}) {
  const d = useDirector(initialProject, storageScope),
    input = useRef<HTMLInputElement>(null),
    exporter = useRef<Exporter | null>(null);
  const [mounted, setMounted] = useState(false),
    [exporting, setExporting] = useState(false),
    [pending, setPending] = useState<Project | null>(null),
    [help, setHelp] = useState(false),
    [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const live = useRef(d);
  live.current = d;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,[role=dialog],[role=slider],[role=switch],[role=tab]',
        )
      )
        return;
      const d = live.current;
      if (e.code === 'Escape' && d.dragging) {
        d.cancel();
        return;
      }
      if (d.dragging) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod && d.lightSelection) {
        if (e.code === 'KeyF') {
          e.preventDefault();
          d.focusLight();
          return;
        }
        const step = e.shiftKey ? 0.01 : e.altKey ? 1 : 0.1;
        const delta = (
          {
            ArrowLeft: [-step, 0, 0],
            ArrowRight: [step, 0, 0],
            ArrowUp: [0, 0, -step],
            ArrowDown: [0, 0, step],
            PageUp: [0, step, 0],
            PageDown: [0, -step, 0],
          } as Record<string, [number, number, number]>
        )[e.code];
        if (delta) {
          e.preventDefault();
          d.nudgeLight(delta);
          return;
        }
      }
      if (mod && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) d.redo();
        else d.undo();
      } else if (mod && e.code === 'KeyY') {
        e.preventDefault();
        d.redo();
      } else if (mod && e.code === 'KeyD') {
        e.preventDefault();
        d.duplicate();
      } else if (mod && e.code === 'KeyS') {
        e.preventDefault();
        downloadProject(d.project);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        d.remove();
      } else if (e.code === 'KeyW') d.setMode('translate');
      else if (e.code === 'KeyE') d.setMode('rotate');
      else if (e.code === 'KeyR') d.setMode('scale');
    };
    window.addEventListener('keydown', key);
    const cancelGesture = () => {
      if (live.current.dragging) live.current.cancel();
    };
    window.addEventListener('blur', cancelGesture);
    window.addEventListener('pointercancel', cancelGesture);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancelGesture);
      window.removeEventListener('pointercancel', cancelGesture);
    };
  }, []);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: 'read_director_project',
        description:
          'Read the local static storyboard project, active shot and full object state.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => structuredClone(live.current.project),
      },
      {
        name: 'switch_director_shot',
        description:
          'Switch the active shot, restoring its camera and all object states. Does not generate media.',
        inputSchema: {
          type: 'object',
          properties: { shotId: { type: 'string' } },
          required: ['shotId'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input: any) => {
          if (
            live.current.dragging ||
            !input ||
            typeof input.shotId !== 'string' ||
            !live.current.project.shots.some((s) => s.id === input.shotId)
          )
            throw new Error('镜头不存在或正在拖拽');
          live.current.selectShot(input.shotId);
          return { activeShotId: input.shotId };
        },
      },
    ];
    for (const tool of tools)
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  async function exportPNG() {
    if (!exporter.current || exporting || d.dragging) return;
    setExporting(true);
    try {
      const shotId = d.shot.id;
      const result = await exporter.current();
      const expected = frameSpec(d.shot.camera);
      if (result.width !== expected.width || result.height !== expected.height)
        throw new Error('导出尺寸验证失败');
      downloadBlob(
        result.blob,
        `${d.shot.name.replace(/[\\/:*?"<>|]/g, '_')}_${result.width}x${result.height}.png`,
      );
      const url = URL.createObjectURL(result.blob);
      setThumbnails((t) => {
        if (t[shotId]) URL.revokeObjectURL(t[shotId]);
        return { ...t, [shotId]: url };
      });
      d.setMessage(
        `PNG 已导出：${result.width} × ${result.height}，不含辅助元素。`,
      );
    } catch (e) {
      d.setMessage(`导出失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  }
  return (
    <main className="director-app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Aperture size={26} />
          </div>
          <div>
            <h1>
              FRAME<span>导演台</span>
            </h1>
            <p>
              STATIC PREVIS <b>V03</b>
            </p>
          </div>
        </div>
        <div className="project-heading">
          <span className="green-dot" />
          <span>{d.project.title}</span>
          <small>本地项目</small>
          <a
            className="project-switch"
            href={storageScope ? '/' : '/apartment'}
          >
            {storageScope ? '原导演台' : '参考户型'}
          </a>
        </div>
        <div className="header-actions">
          <span className="saved">
            <Check size={13} />
            {d.saved}
          </span>
          <Button
            variant="ghost"
            onClick={() => input.current?.click()}
            disabled={d.dragging}
          >
            <FolderOpen />
            打开
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              downloadProject(d.project);
              d.setMessage('项目文件已下载；请保存到你的项目目录。');
            }}
            disabled={d.dragging}
          >
            <Save />
            保存项目
          </Button>
          <Button
            className="export-button"
            onClick={exportPNG}
            disabled={!mounted || exporting || d.dragging}
          >
            {exporting ? <LoaderCircle className="spin" /> : <Download />}导出
            PNG
          </Button>
        </div>
      </header>
      {note && (
        <div className="project-notice">
          {note}
          <span>独立存档 · 总览为剖切展示，室内镜头保留完整墙体</span>
          {initialProject && (
            <Button
              variant="ghost"
              size="sm"
              disabled={d.dragging}
              onClick={() => setPending(initialProject)}
            >
              恢复重建稿
            </Button>
          )}
        </div>
      )}
      <div className="editor-shell">
        <AssetPanel d={d} />
        <div className="central-workspace">
          <div className="main-toolbar">
            <div className="transform-tools">
              {[
                { mode: 'translate', Icon: Move, label: '移动', key: 'W' },
                { mode: 'rotate', Icon: RotateCw, label: '旋转', key: 'E' },
                { mode: 'scale', Icon: Scaling, label: '缩放', key: 'R' },
              ].map((t) => (
                <Button
                  key={t.mode}
                  variant={
                    (d.lightSelection
                      ? d.lightSelection.handle === 'position'
                        ? 'translate'
                        : 'rotate'
                      : d.mode) === t.mode
                      ? 'secondary'
                      : 'ghost'
                  }
                  className={
                    (d.lightSelection
                      ? d.lightSelection.handle === 'position'
                        ? 'translate'
                        : 'rotate'
                      : d.mode) === t.mode
                      ? 'tool-active'
                      : ''
                  }
                  disabled={
                    d.dragging ||
                    (!!d.lightSelection &&
                      (t.mode === 'scale' ||
                        (t.mode === 'rotate' &&
                          allLights(d.shot.lighting).find(
                            (s) => s.id === d.lightSelection?.id,
                          )?.kind === 'point')))
                  }
                  onClick={() =>
                    d.setMode(t.mode as 'translate' | 'rotate' | 'scale')
                  }
                >
                  <t.Icon />
                  {d.lightSelection && t.mode !== 'scale'
                    ? t.mode === 'translate'
                      ? '灯位'
                      : '方向'
                    : t.label}
                  <kbd>{t.key}</kbd>
                </Button>
              ))}
            </div>
            <div className="toolbar-actions">
              <Button
                variant="ghost"
                size="icon"
                aria-label={d.lightSelection ? '复制选中灯光' : '复制选中对象'}
                disabled={(!d.selected && !d.lightSelection) || d.dragging}
                onClick={d.duplicate}
              >
                <Copy />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={d.lightSelection ? '删除选中灯光' : '删除选中对象'}
                disabled={(!d.selected && !d.lightSelection) || d.dragging}
                onClick={d.remove}
              >
                <Trash2 />
              </Button>
              <i />
              <Button
                variant="ghost"
                size="icon"
                aria-label="撤销"
                disabled={!d.history.past.length || d.dragging}
                onClick={d.undo}
              >
                <Undo2 />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="重做"
                disabled={!d.history.future.length || d.dragging}
                onClick={d.redo}
              >
                <Redo2 />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="使用说明"
                onClick={() => setHelp(true)}
              >
                <Keyboard />
              </Button>
            </div>
          </div>
          {mounted ? (
            <Viewports d={d} exportRef={exporter} editorView={editorView} />
          ) : (
            <div className="initializing">正在准备三维导演台…</div>
          )}
          <ShotStrip d={d} thumbnails={thumbnails} />
        </div>
        <Inspector d={d} />
      </div>
      <footer className="app-status">
        <span role="status">
          {d.message || '静态镜头编辑器 · 所有操作留在本机，不连接 AI 接口'}
        </span>
        <span>
          {d.dragging ? '正在变换 · 结束拖拽后记入撤销' : 'Y 向上 / 米制'}
          <i>·</i>项目数据 v{d.project.version}
        </span>
      </footer>
      <input
        hidden
        ref={input}
        type="file"
        accept=".json,.frame.json"
        onChange={async (e) => {
          try {
            const f = e.target.files?.[0];
            if (f) setPending(decodeProject(await f.text()));
          } catch (error) {
            d.setMessage(
              error instanceof Error ? error.message : String(error),
            );
          }
          e.target.value = '';
        }}
      />
      <Dialog
        open={!!pending}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
      >
        <DialogContent>
          <DialogTitle>打开这个项目？</DialogTitle>
          <DialogDescription>
            当前项目将被替换。需要保留时，请先保存项目文件。新项目已通过数据版本与结构检查。
          </DialogDescription>
          <strong>{pending?.title}</strong>
          <div className="dialog-actions">
            <Button
              variant="outline"
              onClick={() => downloadProject(d.project)}
            >
              先保存当前项目
            </Button>
            <Button
              onClick={() => {
                if (pending) d.restore(pending);
                setThumbnails({});
                setPending(null);
              }}
            >
              打开项目
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog">
          <DialogTitle>白模导演台 · 操作说明</DialogTitle>
          <DialogDescription>
            先搭建空间，再确定拍摄机位，最后保存镜头与项目。
          </DialogDescription>
          <ul>
            <li>左侧点选内置资产，添加到当前镜头；场景树可选中或隐藏物体。</li>
            <li>
              拖动三轴手柄移动、旋转或缩放。W / E / R
              切换工具；一次完整拖拽只记一次撤销。
            </li>
            <li>
              Ctrl+Z 撤销，Ctrl+Shift+Z 或 Ctrl+Y 重做；Ctrl+D 复制，Delete
              删除。
            </li>
            <li>
              中央编辑视角可自由环绕，不影响右侧拍摄画面。“设为拍摄机位”是唯一的视角复制操作。
            </li>
            <li>
              摄影机朝向为 YXZ 欧拉角：Y 为偏航，X 为俯仰，Z
              为滚转。锁定后不能编辑摄影机参数，物体仍可调整。
            </li>
            <li>
              新建镜头沿用当前状态，之后互不影响；切换时自动保留离开的镜头草稿。
            </li>
            <li>
              右侧“灯光”可添加平行光、点光和聚光，分别控制强度、颜色、阴影与方向。选灯后
              W 拖灯位、E 拖目标、F 定位灯光；方向键微调，PageUp / PageDown
              升降，Shift 精调，Alt 大步移动。点光向四周照明，没有方向目标。
            </li>
            <li>
              最多 8 盏空间灯光，其中最多 3
              盏同时投射阴影；环境与天空补光独立。灯光随镜头保存，完整拖拽记一次撤销，Esc
              取消；灯光手柄不进入拍摄预览与 PNG。
            </li>
            <li>
              本机自动保存不替代备份。“保存项目”下载带版本的
              JSON；“打开”可恢复全部镜头。
            </li>
            <li>
              PNG 固定为 1920×1080 或
              1080×1920，取景与拍摄预览一致。预览周边留黑不属于输出。
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </main>
  );
}
