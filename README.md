# FRAME 白模导演台 V03

本地静态 AI 动画分镜预演编辑器。使用 React 19、TypeScript、Three.js、React Three Fiber、Drei。没有 AI 接口、账号、时间线或服务端上传。未读取或调用任何 RunningHub / Seedance 凭证。

## 安装与打开

从 GitHub 克隆后，需要 Node.js **22.13 或更新版本**（本机验证使用 Node.js 24）及随附的 npm。在项目目录运行：

```powershell
npm ci
npm run build
npm start
```

然后打开 <http://127.0.0.1:8766/>。`npm ci` 首次需要联网下载依赖；构建后的本地运行不需要 AI 服务、API Key 或账号。仓库不包含 `node_modules`、构建产物和本机缓存，首次使用不能跳过安装和构建。

新增参考户型独立项目：<http://127.0.0.1:8766/apartment>。按用户图片重建 147 个可编辑对象、5 个机位；原导演台存档保持不变。尺寸为估算，详见 [APARTMENT.md](./APARTMENT.md)。当前全套自动验证共 40 项。

双击本目录 `启动导演台.cmd`，或在本目录运行 `npm start`，访问 <http://127.0.0.1:8766/>。仅监听本机；默认浏览器需支持 WebGL2 与硬件加速。建议桌面窗口宽度至少 1200px；窄面板可以横向滚动。

Windows 在完成安装与构建后可双击 `启动导演台.cmd`。启动器优先使用 PATH 中的 `node.exe`；原开发电脑的 E 盘运行时仅作为后备路径。关闭网页不停止本地服务，重复启动会复用同一端口。其他系统使用 `npm start`。

## 核心操作

- 左侧资产库点选添加，场景树选中和控制可见性。包含地面、墙体、门框、床、桌、椅以及青色 A / 赭色 B 两个人物。
- 选中后拖三轴手柄：W 移动、E 旋转、R 缩放；Ctrl+D 复制，Delete 删除。Ctrl+Z 撤销，Ctrl+Shift+Z / Ctrl+Y 重做。
- 完整拖拽作为一次历史操作；Escape、窗口失焦或 pointercancel 会取消并恢复初始状态。拖动时 OrbitControls 被禁用。
- 编辑视窗：左键环绕、右键平移、滚轮推进。拍摄视窗不接受导航；“设为拍摄机位”复制编辑相机的位置、朝向和垂直 FOV。
- 右侧可编辑对象变换，以及摄影机位置、朝向、焦距、画幅。摄影机锁定后不能改相机或复制视角，但仍可编辑对象。
- 右侧“灯光”页签：添加平行光、点光和聚光；每盏灯分别命名、选中、开关、复制、删除，调整强度、颜色、位置和阴影。总计最多 8 盏空间灯光（含固定主光），最多 3 盏同时开启投影；新增灯默认关闭阴影。原主光不可删除，可以关闭。环境光与天空/地面半球补光独立控制，不占空间灯数量。
- 选灯后，在编辑视窗拖金色灯位或青色目标的三轴手柄。W 切灯位，E 切目标，F 定位灯光；方向键沿世界 X/Z 移动，PageUp / PageDown 沿 Y 升降，每步 0.1 米；Shift 精调 0.01 米，Alt 大步 1 米。点光向四周照明，没有目标/方向。拖灯时不旋转编辑视角，完整拖拽记一次撤销，Esc、失焦、pointercancel 取消；拖回原位不产生空历史。定位只移动编辑相机，不影响拍摄机位。
- 平行光、聚光由位置→照射目标决定方向，位置与目标不能重合。聚光可调锥角（轴线到锥边的半角 5–89°）与边缘柔度；点光/聚光距离 0 为无限，否则至少 0.1 米。平行光投影范围 24×24 米，深度随灯位距离调整。主光阴影贴图 2048、附加平行光/聚光 1024、点光每面 512；多阴影会增加 GPU 开销。强度直接使用 Three.js 参数，各类灯的量纲不同，不保证与现场测光一致。
- 滑杆松开后应用，一次调整记一次撤销；数值输入按 Enter 或移开焦点应用。灯光随镜头独立保存，复制后互不影响；“重置基础光”保留新增灯。编辑、拍摄预览和 PNG 共用同一布光模块，灯光图标、方向线、标签、手柄只出现在编辑视窗。
- 新镜头沿用当前状态；复制镜头产生独立快照；切换镜头自动保留未保存草稿。“保存镜头”标记当前快照已保存。
- 本机自动保存以浏览器原点为单位。“保存项目”下载 `.frame.json`（包含全部镜头）；“打开”会先检查版本与结构，再确认替换。浏览器换端口/换浏览器/清理站点数据不会保留本机自动存档，请使用项目文件备份。
- PNG 只包含拍摄内容，不含网格、坐标轴、相机线框与界面。横屏固定 1920×1080，竖屏固定 1080×1920。导出不依赖显示器 DPR。镜头卡中的图片是最近一次导出，不会冒充实时缩略图。

## 坐标、片门与数据约定

`1 world unit = 1 m`，Y 轴向上，相机看向本地 −Z。物体和相机的权威旋转均保存为弧度 Euler 三元组，物体采用 XYZ、相机采用 YXZ；面板以度显示，未编辑的字段不回写显示取整值。

固定**垂直片门 24 mm**，焦距 12–200 mm。

```text
aspect = width / height
gateWidth = 24 × aspect
verticalFov = 2 × atan(24 / (2 × focalLength))
```

16:9 的片门为 42.6667×24 mm；9:16 为 13.5×24 mm。横竖切换保持垂直 FOV，相当于改变水平片门，不是旋转同一块传感器。50 mm 两种画幅的垂直 FOV 均为 26.99146656°。预览与导出均调用同一个 `configureCamera`，`zoom=1`、无 filmOffset / viewOffset。

项目 `version=3`、`units=meters`。`scene.objects` 只保存共享的稳定 ID、资产类型和名称；每个 `shot.objects` 独立保存对象成员、位置、旋转、缩放及可见性；`shot.camera` 保存完整摄影机参数与锁定状态，`shot.lighting` 保存环境、半球补光、主光与新增灯列表 `sources`。添加/删除对象或灯只影响当前镜头，其他镜头不变。新建、复制采用深复制。导航不进入撤销栈；撤销编辑时会恢复该编辑所属的镜头。历史保留最近 80 个编辑，项目文件不含撤销栈。

载入 v1 项目补上原默认布光，载入 v2 保留原布光并补空新增灯列表；均不改变相机、物体、镜头名称或保存标记。新的本机存档使用 `frame-director-project-v3`，原 `frame-director-project-v1` / `frame-director-project-v2` 原文保留作为旧版备份。按 v3、v2、v1 顺序选择现存存档；遇到损坏存档明确报错，不静默回退或覆盖。新保存的 v3 文件不适用于旧版程序。关闭页面时若正在拖拽，保存拖拽开始前的已接受状态。

## 模块

- `director/types.ts` / `project.ts`：数据结构、验证、场景与镜头命令。
- `director/history.ts` / `useDirector.ts`：事务式撤销重做、取消拖拽、状态协调。
- `director/camera.ts`：统一摄影机和画幅数学。
- `director/lighting.ts` / `scene/LightingRig.tsx` / `ui/LightingPanel.tsx`：灯光数据校验、共用布光与控制面板。
- `director/multiLights.ts` / `ui/LightSourcesPanel.tsx`：多光源命令与列表/属性编辑。
- `director/scene/LightGizmos.tsx` / `TransformHandle.tsx`：灯位/目标拖动、编辑相机定位与原生控件生命周期管理。
- `director/persistence.ts`：版本化项目文件、本机存储。
- `director/scene/`：参数化白模、两套独立 R3F 场景、编辑手柄、PNG 导出。
- `director/ui/`：资产树、属性面板、镜头列表。
- `director/DirectorApp.tsx`：布局与用户操作编排；没有将全部逻辑塞入页面组件。
- `scripts/serve.mjs`：不处理用户输入文件、不运行 SSR 的本地静态服务。

## 验证与开发

```powershell
npm test
npm run typecheck
npm run build
npm start
```

共 40 项自动验证：14 项基础导演台、6 项基础灯光、12 项多灯/手柄及 8 项参考户型验证。覆盖 v1/v2 迁移、灯光增删复制与数量上限、镜头与 JSON 往返、百次拖动一步撤销、取消/迟到事件、距离/方向/投影上限校验、旧本机备份保留、户型尺寸与相对布局、机位及存档隔离；直接使用 Three.js 原生控件进行 CPU 射线拖动与 30 次连接/销毁检查；以真实 hook 代码配合批处理队列验证快速拖回原位、取消旧 token、保存标记与 redo 保留。这些检查不能替代浏览器交互与 GPU 像素检查。

浏览器打开 <http://127.0.0.1:8766/verify>，点击“运行 PNG 验证”：使用独立内置场景，不修改你的项目；检查 10 项真实 WebGL → PNG → 解码、像素内容、连续静态导出哈希、辅助对象排除与摄影机不变性。

`npm run dev` 用于修改时的热更新，也使用端口 8766，不能与 `npm start` 同时运行。正常使用只运行静态服务。Windows 上 Vinext beta.5 退出时有原生句柄断言，`scripts/graceful-exit.mjs` 仅让成功构建自然退出，保留非零失败状态；不修改第三方包。

依赖审计在 2026-09-07 报告了脚手架中的开发/服务端依赖问题；本次没有进行越界的强制依赖升级。交付使用纯静态文件和 Node 标准库服务，不运行这些 SSR、图像解析、代理或开发服务器接口。不要把开发服务器对公网暴露。

## 本轮边界

这是可运行的静态镜头编辑器，不是动画系统：无骨骼姿态编辑、关键帧、时间线、AI 调用、连线生成或账号。资产为几何白模，不从网络下载模型/字体；所有制作数据留在本机。本轮在原无限画布项目目录内按新需求实现导演台，后续 API 对接需另行确认。

实现依据：项目内安装的 R3F/Drei/Three.js 类型与源码；文档入口 [R3F](https://r3f.docs.pmnd.rs/getting-started/installation)、[Three TransformControls](https://threejs.org/docs/pages/TransformControls.html)、[Three PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html)。
