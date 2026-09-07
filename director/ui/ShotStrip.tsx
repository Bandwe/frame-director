import { Plus, Copy, Clapperboard, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Director } from '../useDirector';
import { createShot, saveShot, editShot } from '../project';
export function ShotStrip({
  d,
  thumbnails,
}: {
  d: Director;
  thumbnails: Record<string, string>;
}) {
  return (
    <section className="shot-strip">
      <div className="shot-toolbar">
        <span>
          <Clapperboard size={16} />
          镜头列表{' '}
          <small>{d.project.shots.length.toString().padStart(2, '0')}</small>
        </span>
        <div>
          <Input
            aria-label="当前镜头名称"
            value={d.shot.name}
            maxLength={200}
            onChange={(e) =>
              d.update((p) =>
                editShot(p, (s) => {
                  s.name = e.target.value;
                }),
              )
            }
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={d.dragging}
            onClick={() => {
              d.update(saveShot);
              d.setMessage('当前镜头的摄影机与对象状态已保存。');
            }}
          >
            <Save />
            保存镜头
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={d.dragging}
            onClick={() => {
              d.update((p) => createShot(p, true));
              d.setSelected(null);
            }}
          >
            <Copy />
            复制
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={d.dragging}
            onClick={() => {
              d.update((p) => createShot(p));
              d.setSelected(null);
            }}
          >
            <Plus />
            新镜头
          </Button>
        </div>
      </div>
      <div className="shot-cards">
        {d.project.shots.map((shot, i) => (
          <button
            disabled={d.dragging}
            key={shot.id}
            className={
              'shot-card ' +
              (shot.id === d.project.activeShotId ? 'active' : '')
            }
            onClick={() => d.selectShot(shot.id)}
          >
            <div className="shot-thumb">
              {thumbnails[shot.id] ? (
                <img
                  src={thumbnails[shot.id]}
                  alt={`${shot.name}最近导出画面`}
                />
              ) : (
                <Clapperboard size={27} />
              )}
              <b>{String(i + 1).padStart(2, '0')}</b>
              {shot.camera.locked && <Lock size={11} className="thumb-lock" />}
              <span>{shot.camera.aspect}</span>
            </div>
            <strong>{shot.name}</strong>
            <small>
              {shot.camera.focalLength.toFixed(0)} mm <i>·</i>{' '}
              {shot.savedAt ? '已保存' : '草稿自动保留'}
            </small>
          </button>
        ))}
        <button
          className="new-shot-card"
          disabled={d.dragging}
          onClick={() => {
            d.update((p) => createShot(p));
            d.setSelected(null);
          }}
        >
          <Plus size={22} />
          <span>新建镜头</span>
          <small>沿用当前场景状态</small>
        </button>
      </div>
    </section>
  );
}
