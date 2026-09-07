import { PerspectiveCamera, Euler } from 'three';
import type {
  Project,
  SceneObject,
  Transform,
  Vec3,
  AssetKind,
  CameraState,
} from '../types.ts';
import { transform, clone, validateProject } from '../project.ts';
import { defaultLighting } from '../lighting.ts';

export const APARTMENT_SCOPE = 'reference-apartment-01';
export const APARTMENT_EDITOR = {
  position: [8, 19, 20] as Vec3,
  target: [0, 0, 0] as Vec3,
};
export const APARTMENT_NOTE =
  '参考图重建 · 外轮廓约 8.4 × 14.8 m，层高 2.7 m；均为估算尺寸，非测绘。';

export function lookAtCamera(
  position: Vec3,
  target: Vec3,
  focalLength: number,
  aspect: CameraState['aspect'] = '16:9',
): CameraState {
  const c = new PerspectiveCamera();
  c.position.fromArray(position);
  c.lookAt(...target);
  const r = new Euler().setFromQuaternion(c.quaternion, 'YXZ');
  return {
    position,
    rotation: [r.x, r.y, r.z],
    focalLength,
    gateHeight: 24,
    aspect,
    locked: false,
  };
}

// Image north is -Z, image east is +X. All dimensions are inferred, not measured.
// Each wall/furniture item is an ordinary editable scene object, not a baked room.
export function createApartmentProject(): Project {
  const objects: SceneObject[] = [],
    states: Record<string, Transform> = {};
  const foregroundWalls: string[] = [];
  let zone = '建筑';
  function put(
    id: string,
    kind: AssetKind,
    name: string,
    x: number,
    z: number,
    scale: Vec3 = [1, 1, 1],
    turn = 0,
    y = 0,
    color?: string,
  ) {
    objects.push({ id, kind, name, zone, ...(color ? { color } : {}) });
    states[id] = transform([x, y, z], [0, turn, 0], scale);
    return id;
  }
  function block(
    id: string,
    name: string,
    x: number,
    z: number,
    w: number,
    h: number,
    depth: number,
    y = 0,
    color = '#d7cdb8',
  ) {
    return put(id, 'block', name, x, z, [w, h, depth], 0, y, color);
  }
  function wx(id: string, x1: number, x2: number, z: number, h = 2.7, y = 0) {
    return block(id, '墙 · ' + id, (x1 + x2) / 2, z, x2 - x1, h, 0.16, y);
  }
  function wz(id: string, x: number, z1: number, z2: number, h = 2.7, y = 0) {
    return block(id, '墙 · ' + id, x, (z1 + z2) / 2, 0.16, h, z2 - z1, y);
  }
  function floor(
    id: string,
    name: string,
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    tile = false,
  ) {
    put(
      id,
      tile ? 'tileFloor' : 'woodFloor',
      name,
      (x1 + x2) / 2,
      (z1 + z2) / 2,
      [x2 - x1, 1, z2 - z1],
    );
  }
  function northWindow(
    id: string,
    x1: number,
    x2: number,
    z: number,
    sill = 0.72,
  ) {
    wx(id + '-sill', x1, x2, z, sill);
    wx(id + '-lintel', x1, x2, z, 0.18, 2.52);
    put(
      id,
      'window',
      '北向窗',
      (x1 + x2) / 2,
      z,
      [x2 - x1, 2.52 - sill, 1],
      0,
      sill,
    );
    for (const side of [-1, 1])
      put(
        id + '-curtain-' + (side + 1),
        'curtain',
        '落地窗帘',
        (side < 0 ? x1 : x2) + side * -0.15,
        z + 0.16,
        [0.48, 2.4, 1],
        0,
        0.08,
      );
  }
  function westWindow(
    id: string,
    x: number,
    z1: number,
    z2: number,
    sill = 0.62,
  ) {
    wz(id + '-sill', x, z1, z2, sill);
    wz(id + '-lintel', x, z1, z2, 0.18, 2.52);
    put(
      id,
      'window',
      '西向窗',
      x,
      (z1 + z2) / 2,
      [z2 - z1, 2.52 - sill, 1],
      Math.PI / 2,
      sill,
    );
    for (const side of [-1, 1])
      put(
        id + '-curtain-' + (side + 1),
        'curtain',
        '西窗窗帘',
        x + 0.17,
        (side < 0 ? z1 : z2) - side * 0.15,
        [0.46, 2.4, 1],
        Math.PI / 2,
        0.08,
      );
  }

  zone = '主卧';
  floor('master-floor', '主卧木地板', -4.2, 0.65, -7.4, -2.1);
  zone = '次卧书房';
  floor('study-floor', '次卧木地板', 0.65, 4.2, -7.4, -3.4);
  zone = '客餐厅';
  floor('living-floor', '客餐厅木地板', -3.02, 0.66, -2.1, 4.65);
  zone = '走廊';
  floor('hall-floor', '连通走廊', 0.66, 1.85, -3.4, 4.65);
  zone = '阳台';
  floor('balcony-floor', '阳台瓷砖', -4.2, -3.02, -2.1, 2.55, true);
  zone = '厨房';
  floor('kitchen-floor', '厨房木地板', -4.2, 1.02, 4.65, 7.4);
  floor('dining-extension', '餐区西侧', -4.2, -3.02, 2.55, 4.65);
  zone = '卫生间';
  floor('bath-floor', '卫浴瓷砖', 1.85, 4.2, -3.4, -0.12, true);
  zone = '洗衣区';
  floor('laundry-floor', '洗衣区瓷砖', 1.85, 4.2, -0.12, 1.3, true);
  zone = '储物间';
  floor('storage-floor', '储物间木地板', 1.85, 4.2, 1.3, 3.0);
  zone = '玄关';
  floor('entry-floor', '玄关瓷砖', 1.02, 4.2, 4.65, 7.4, true);
  floor('entry-wood', '玄关内侧木地板', 1.85, 4.2, 3.0, 4.65);

  zone = '建筑';
  wx('north-west', -4.2, -3.22, -7.4);
  wx('north-center', -0.46, 1.24, -7.4);
  wx('north-east', 3.02, 4.2, -7.4);
  zone = '主卧';
  northWindow('master-north-window', -3.22, -0.46, -7.4, 0.24);
  wz('master-west-top', -4.2, -7.4, -6.54);
  wz('master-west-bottom', -4.2, -3.12, -2.1);
  westWindow('master-west-window', -4.2, -6.54, -3.12, 0.68);
  wz('bedroom-partition', 0.65, -7.4, -2.1);
  wx('master-south', -4.2, -0.4, -2.1);
  wx('master-door-post', 0.48, 0.65, -2.1);
  wx('master-door-lintel', -0.4, 0.48, -2.1, 0.56, 2.14);
  put(
    'master-door',
    'doorPanel',
    '主卧门 · 向内开启',
    0.46,
    -2.13,
    [1, 1, 1],
    2.18,
  );
  zone = '次卧书房';
  northWindow('study-north-window', 1.24, 3.02, -7.4);
  wx('study-south', 1.68, 4.2, -3.4);
  wx('study-door-lintel', 0.73, 1.68, -3.4, 0.56, 2.14);
  put(
    'study-door',
    'doorPanel',
    '次卧门 · 向内开启',
    1.64,
    -3.45,
    [1, 1, 1],
    2.15,
  );
  zone = '建筑';
  wz('east-exterior', 4.2, -7.4, 7.4);
  foregroundWalls.push(wx('south-kitchen', -4.2, 1.02, 7.4));
  foregroundWalls.push(wx('south-entry-left', 1.02, 2.65, 7.4));
  foregroundWalls.push(wx('south-entry-right', 3.61, 4.2, 7.4));
  wx('entry-door-lintel', 2.65, 3.61, 7.4, 0.5, 2.2);
  zone = '玄关';
  put(
    'entry-door',
    'doorPanel',
    '入户门 · 向内开启',
    3.58,
    7.33,
    [1.1, 1, 1],
    2.48,
    0,
    '#76583f',
  );
  wz('kitchen-entry-partition', 1.02, 4.65, 7.4);
  zone = '阳台';
  wz('living-west-header', -3.02, -2.1, 2.55, 0.25, 2.45);
  put(
    'balcony-glass',
    'window',
    '客厅阳台推拉门',
    -3.02,
    0.2,
    [4.42, 2.38, 1],
    Math.PI / 2,
    0.05,
  );
  put(
    'balcony-curtain-n',
    'curtain',
    '客厅窗帘 · 北',
    -2.86,
    -1.78,
    [0.54, 2.4, 1],
    Math.PI / 2,
    0.05,
  );
  put(
    'balcony-curtain-s',
    'curtain',
    '客厅窗帘 · 南',
    -2.86,
    2.25,
    [0.54, 2.4, 1],
    Math.PI / 2,
    0.05,
  );
  put(
    'balcony-railing',
    'railing',
    '阳台西栏杆',
    -4.13,
    0.2,
    [4.55, 1, 1],
    Math.PI / 2,
  );
  wx('balcony-north-end', -4.2, -3.02, -2.1, 1.05);
  wx('balcony-south-end', -4.2, -3.02, 2.55, 1.05);
  zone = '厨房';
  wz('kitchen-west-top', -4.2, 2.55, 4.3);
  wz('kitchen-west-bottom', -4.2, 6.53, 7.4);
  westWindow('kitchen-west-window', -4.2, 4.3, 6.53, 1.03);

  // Service rooms have actual 0.88 m door gaps, not solid partition slabs.
  const service = [
    {
      zone: '卫生间',
      id: 'bath',
      z1: -3.4,
      z2: -0.12,
      door1: -2.57,
      door2: -1.69,
    },
    {
      zone: '洗衣区',
      id: 'laundry',
      z1: -0.12,
      z2: 1.3,
      door1: 0.12,
      door2: 1.0,
    },
    {
      zone: '储物间',
      id: 'storage',
      z1: 1.3,
      z2: 3.0,
      door1: 1.66,
      door2: 2.54,
    },
  ];
  for (const room of service) {
    zone = room.zone;
    wx(room.id + '-south', 1.85, 4.2, room.z2);
    wz(room.id + '-west-n', 1.85, room.z1, room.door1);
    wz(room.id + '-west-s', 1.85, room.door2, room.z2);
    wz(room.id + '-door-lintel', 1.85, room.door1, room.door2, 0.56, 2.14);
    put(
      room.id + '-door',
      'doorPanel',
      room.zone + '门',
      1.89,
      room.door2 - 0.01,
      [1, 1, 1],
      0.18,
    );
  }

  zone = '主卧';
  put('master-rug', 'rug', '主卧床下地毯', -1.62, -4.39, [3.08, 1, 2.9]);
  put(
    'master-bed',
    'dressedBed',
    '双人床 · 床头朝东',
    -0.82,
    -4.42,
    [1, 1, 1],
    -Math.PI / 2,
  );
  for (const [id, z] of [
    ['north', -5.82],
    ['south', -3.19],
  ] as const) {
    put(
      'nightstand-' + id,
      'cabinet',
      '主卧床头柜',
      0.16,
      z,
      [0.44, 0.83, 1.05],
      -Math.PI / 2,
    );
    put(
      'bedside-lamp-' + id,
      'lamp',
      '主卧床头灯',
      0.13,
      z,
      [1, 1, 1],
      0,
      0.59,
    );
  }
  put(
    'master-tv-console',
    'cabinet',
    '主卧电视矮柜',
    -3.79,
    -4.71,
    [1.43, 1, 1],
    Math.PI / 2,
  );
  put(
    'master-tv',
    'tv',
    '主卧电视 · 朝床',
    -3.73,
    -4.7,
    [1.05, 1.05, 1],
    Math.PI / 2,
    0.71,
  );
  put(
    'master-desk',
    'woodTable',
    '主卧西窗书桌',
    -3.72,
    -3.32,
    [0.9, 1, 0.72],
    Math.PI / 2,
  );
  put(
    'master-chair',
    'woodChair',
    '主卧书桌椅',
    -3.1,
    -3.34,
    [1, 1, 1],
    -Math.PI / 2,
  );
  put(
    'master-bookcase',
    'bookshelf',
    '主卧南墙书柜',
    -2.45,
    -2.42,
    [2.05, 0.73, 1.1],
    Math.PI,
  );
  put('master-plant', 'plant', '主卧北窗绿植', -3.6, -6.71, [1.05, 1.15, 1.05]);
  block(
    'master-laptop',
    '主卧桌面电脑',
    -3.72,
    -3.34,
    0.25,
    0.025,
    0.32,
    0.775,
    '#d8dbcc',
  );

  zone = '次卧书房';
  put('study-rug', 'rug', '次卧地毯', 2.66, -5.12, [2.1, 1, 2.8]);
  put('study-bed', 'singleBed', '单人床 · 床头朝北', 3.46, -5.63);
  put('study-desk', 'woodTable', '北窗书桌', 1.59, -6.59, [0.91, 1, 0.75]);
  put(
    'study-chair',
    'woodChair',
    '次卧工作椅',
    1.54,
    -5.88,
    [1, 1, 1],
    Math.PI,
  );
  put(
    'study-side-shelf',
    'bookshelf',
    '书桌旁矮书架',
    2.54,
    -6.65,
    [0.51, 0.46, 1.3],
  );
  put(
    'study-tall-shelf',
    'bookshelf',
    '床头高书柜',
    3.51,
    -7.0,
    [0.88, 1.17, 1.03],
  );
  put(
    'study-wardrobe',
    'wardrobe',
    '次卧南墙衣柜',
    2.93,
    -3.78,
    [1.4, 1, 1],
    Math.PI,
  );
  put(
    'study-low-cabinet',
    'cabinet',
    '次卧西墙矮柜',
    1.01,
    -4.78,
    [0.8, 1.2, 1],
    Math.PI / 2,
  );
  put(
    'study-picture',
    'picture',
    '次卧东墙挂画',
    4.09,
    -4.85,
    [0.9, 0.9, 1],
    -Math.PI / 2,
    1.15,
  );
  put(
    'study-plant',
    'plant',
    '书桌小盆栽',
    2.52,
    -6.66,
    [0.34, 0.34, 0.34],
    0,
    0.84,
  );
  block(
    'study-laptop',
    '次卧桌面电脑',
    1.5,
    -6.61,
    0.35,
    0.025,
    0.25,
    0.775,
    '#c7cdc4',
  );

  zone = '客餐厅';
  put('living-rug', 'rug', '客厅大地毯', -1.22, 0.24, [2.65, 1, 2.67]);
  put(
    'living-sofa-south',
    'sofa',
    '南侧双人沙发 · 朝北',
    -1.32,
    1.46,
    [1, 1, 1],
    Math.PI,
  );
  put(
    'living-sofa-east',
    'sofa',
    '东侧双人沙发 · 朝西',
    0.1,
    0.14,
    [1, 1, 1],
    -Math.PI / 2,
  );
  put('coffee-table', 'woodTable', '客厅茶几', -1.27, 0.14, [0.66, 0.56, 0.76]);
  block(
    'coffee-book',
    '茶几上的书',
    -1.44,
    0.19,
    0.22,
    0.04,
    0.28,
    0.44,
    '#d5cfb7',
  );
  put(
    'living-tv-console',
    'cabinet',
    '客厅北墙电视柜',
    -1.17,
    -1.76,
    [1.48, 0.8, 1.1],
  );
  put(
    'living-tv',
    'tv',
    '客厅电视 · 朝南',
    -1.17,
    -1.84,
    [1.08, 1.08, 1],
    0,
    0.57,
  );
  put('living-side-table', 'cabinet', '沙发边几', 0.15, 1.79, [0.4, 0.73, 1]);
  put(
    'living-plant-nw',
    'plant',
    '电视柜左侧盆栽',
    -2.35,
    -1.65,
    [0.66, 0.82, 0.66],
  );
  put(
    'living-plant-ne',
    'plant',
    '电视柜右侧绿植',
    0.12,
    -1.57,
    [0.92, 1.02, 0.92],
  );
  put(
    'living-plant-sw',
    'plant',
    '客餐厅大绿植',
    -2.39,
    2.46,
    [1.25, 1.3, 1.25],
  );
  put('dining-table', 'woodTable', '四人餐桌', -1.11, 3.47, [1.02, 1, 1.13]);
  for (const x of [-1.48, -0.76])
    for (const [side, z] of [
      ['north', 2.8],
      ['south', 4.16],
    ] as const) {
      put(
        'dining-chair-' + side + '-' + String(Math.abs(x) * 100),
        'woodChair',
        '餐椅 · ' + side,
        x,
        z,
        [1, 1, 1],
        side === 'north' ? 0 : Math.PI,
        0,
        '#c7b995',
      );
    }
  put(
    'dining-centerpiece',
    'plant',
    '餐桌小盆栽',
    -1.11,
    3.47,
    [0.23, 0.23, 0.23],
    0,
    0.78,
  );
  zone = '阳台';
  put(
    'balcony-plant-n',
    'plant',
    '阳台北端植物',
    -3.63,
    -1.61,
    [0.83, 0.9, 0.83],
  );
  put('balcony-plant-s', 'plant', '阳台南端植物', -3.61, 2.11, [0.95, 1, 0.95]);

  zone = '厨房';
  put(
    'kitchen-counter-west',
    'counter',
    'L 形橱柜 · 西侧',
    -3.79,
    5.45,
    [2.8, 1, 1],
    Math.PI / 2,
  );
  put(
    'kitchen-counter-south',
    'counter',
    'L 形橱柜 · 南侧',
    -1.9,
    6.68,
    [3.08, 1, 1],
    Math.PI,
  );
  put(
    'kitchen-sink',
    'kitchenSink',
    '西侧洗菜池',
    -3.7,
    5.22,
    [1.12, 1, 1],
    Math.PI / 2,
    0.902,
  );
  put(
    'kitchen-stove',
    'cooktop',
    '南侧双灶',
    -1.84,
    6.7,
    [1.1, 1, 1],
    0,
    0.902,
  );
  put(
    'kitchen-fridge',
    'fridge',
    '厨房东侧冰箱',
    0.16,
    6.19,
    [1, 1, 1],
    -Math.PI / 2,
  );
  put(
    'kitchen-upper-west',
    'cabinet',
    '西侧吊柜',
    -3.91,
    3.41,
    [1.5, 1.55, 0.83],
    Math.PI / 2,
    1.35,
  );
  block(
    'kitchen-board',
    '台面砧板',
    -2.62,
    6.65,
    0.36,
    0.025,
    0.25,
    0.902,
    '#bc9865',
  );
  put(
    'kitchen-picture-1',
    'picture',
    '厨房南墙小画一',
    -2.15,
    7.28,
    [0.76, 0.65, 1],
    Math.PI,
    1.2,
  );
  put(
    'kitchen-picture-2',
    'picture',
    '厨房南墙小画二',
    -1.23,
    7.28,
    [0.76, 0.65, 1],
    Math.PI,
    1.2,
  );

  zone = '卫生间';
  put('bath-basin', 'basin', '洗手台', 2.39, -2.96, [1, 1, 1]);
  put(
    'bath-mirror',
    'picture',
    '洗手台镜面',
    2.39,
    -3.28,
    [1.15, 0.8, 1],
    0,
    1.15,
    '#b4c5bd',
  );
  put('bath-toilet', 'toilet', '马桶', 3.38, -2.79, [1, 1, 1]);
  put('bath-screen', 'shower', '淋浴玻璃隔断', 3.27, -1.53, [1.15, 1, 1]);
  put('bath-tub', 'bathtub', '南侧浴缸', 2.94, -0.66, [1.25, 1, 1.05]);
  zone = '洗衣区';
  put(
    'washing-machine',
    'washer',
    '滚筒洗衣机',
    3.46,
    0.58,
    [1.12, 1.05, 1.1],
    -Math.PI / 2,
  );
  block(
    'laundry-worktop',
    '洗衣台面',
    3.44,
    0.58,
    0.81,
    0.055,
    1.1,
    0.91,
    '#cabba0',
  );
  put(
    'laundry-rug',
    'rug',
    '洗衣区地垫',
    2.46,
    0.58,
    [0.55, 1, 0.93],
    0,
    0,
    '#bbae90',
  );
  zone = '储物间';
  put(
    'storage-wardrobe',
    'wardrobe',
    '储物间东侧衣柜',
    3.77,
    2.13,
    [0.85, 1, 1],
    -Math.PI / 2,
  );
  put(
    'storage-shelf',
    'bookshelf',
    '储物间北侧置物架',
    2.6,
    1.53,
    [0.84, 1.1, 1.05],
  );
  zone = '玄关';
  put(
    'entry-shoe-cabinet',
    'cabinet',
    '玄关东墙鞋柜',
    3.85,
    6.14,
    [1.3, 1.1, 1],
    -Math.PI / 2,
  );
  block(
    'entry-coat-board',
    '玄关挂衣板',
    4.02,
    4.85,
    0.1,
    0.48,
    1.9,
    1.36,
    '#967553',
  );
  for (let i = 0; i < 5; i++)
    block(
      'entry-hook-' + i,
      '玄关挂钩 ' + (i + 1),
      3.93,
      4.15 + i * 0.33,
      0.12,
      0.065,
      0.025,
      1.58,
      '#54594e',
    );
  put(
    'entry-mat',
    'rug',
    '入户地垫',
    2.87,
    6.74,
    [1.02, 1, 0.62],
    0,
    0,
    '#99886e',
  );
  block(
    'entry-step',
    '玄关木地板高差',
    2.62,
    4.66,
    3.1,
    0.075,
    0.12,
    0,
    '#ae895c',
  );

  const lighting = defaultLighting();
  lighting.ambient = { intensity: 0.95, color: '#fff4dc' };
  lighting.hemisphere = {
    intensity: 1.1,
    skyColor: '#e6ede4',
    groundColor: '#a58b68',
  };
  lighting.key = {
    enabled: true,
    intensity: 2.5,
    color: '#ffe6b5',
    position: [-9, 13, -8],
    target: [0, 0, 0],
    castShadow: true,
  };
  lighting.sources = [
    {
      id: 'apartment-fill',
      name: '室内柔和补光',
      kind: 'directional',
      enabled: true,
      intensity: 0.6,
      color: '#dae7ef',
      position: [7, 8, 5],
      target: [0, 0, 0],
      castShadow: false,
      distance: 0,
      angle: 40,
      penumbra: 0.5,
    },
  ];
  const views: [string, string, CameraState][] = [
    [
      'apartment-overview',
      '01 · 户型剖切总览',
      lookAtCamera([0, 28.5, 10], [0, 0, 0], 35, '9:16'),
    ],
    [
      'apartment-living',
      '02 · 客厅看向阳台',
      lookAtCamera([1.15, 1.65, 2.6], [-1.4, 1, -0.1], 20),
    ],
    [
      'apartment-master',
      '03 · 主卧窗光',
      lookAtCamera([-2.75, 1.65, -2.73], [-0.7, 0.9, -4.8], 21),
    ],
    [
      'apartment-study',
      '04 · 次卧与书桌',
      lookAtCamera([1.52, 1.65, -4.2], [2.8, 0.9, -6.1], 18),
    ],
    [
      'apartment-kitchen',
      '05 · 餐厨空间',
      lookAtCamera([0.5, 1.65, 3.7], [-2.5, 0.85, 5.65], 18),
    ],
  ];
  const shots = views.map(([id, name, camera]) => ({
    id,
    name,
    camera,
    lighting: clone(lighting),
    objects: clone(states),
    savedAt: null,
  }));
  // Only the first shot is a dollhouse cutaway; human-height shots keep real walls.
  for (const id of foregroundWalls) shots[0].objects[id].scale[1] = 0.7;
  shots[0].objects['entry-door'].visible = false;
  shots[0].objects['entry-door-lintel'].visible = false;
  for (const id of ['kitchen-picture-1', 'kitchen-picture-2'])
    shots[0].objects[id].visible = false;
  return validateProject({
    version: 3,
    units: 'meters',
    title: '参考户型重建 · 两居室 V01',
    scene: { objects },
    shots,
    activeShotId: shots[0].id,
  });
}
