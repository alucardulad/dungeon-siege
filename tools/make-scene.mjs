/**
 * 生成 assets/scenes/main.scene。
 *
 * 场景文件本身是 Creator 的序列化 JSON（一堆 __id__ 互相引用），手写容易错，
 * 所以用脚本生成：既保证内部引用自洽，也顺便把格式记录在案。
 * 改完脚本执行 `npm run scene` 重新生成即可。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputPath = resolve(root, 'assets/scenes/main.scene')

const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Cocos 在场景文件里用「压缩 uuid」标识脚本类：前 5 位保留，其余每 3 个十六进制压成 2 个 base64 字符。 */
function compressUuid(uuid) {
  const hex = uuid.replace(/-/g, '')
  let out = hex.slice(0, 5)
  for (let i = 5; i < hex.length; i += 3) {
    const value = parseInt(hex.slice(i, i + 3), 16)
    out += BASE64_KEYS[value >> 6] + BASE64_KEYS[value & 63]
  }
  return out
}

const metaPath = resolve(root, 'assets/scripts/cocos/GameRoot.ts.meta')
const gameRootUuid = JSON.parse(readFileSync(metaPath, 'utf8')).uuid
const gameRootClassId = compressUuid(gameRootUuid)

const vec3 = (x = 0, y = 0, z = 0) => ({ __type__: 'cc.Vec3', x, y, z })
const quat = () => ({ __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 })
const nodeBase = () => ({
  _name: '',
  _objFlags: 0,
  __editorExtras__: {},
  _parent: null,
  _children: [],
  _active: true,
  _components: [],
  _prefab: null,
  _lpos: vec3(),
  _lrot: quat(),
  _lscale: vec3(1, 1, 1),
  _mobility: 0,
  _layer: 33554432,
  _euler: vec3(),
})
const componentBase = () => ({ _name: '', _objFlags: 0, __editorExtras__: {}, node: null, _enabled: true, __prefab: null })

const UI_2D = 33554432
const UI_VISIBILITY = 41943040 // UI_3D | UI_2D，2D 模板相机的标准可见层

const objects = [
  // 0
  {
    __type__: 'cc.SceneAsset',
    _name: 'main',
    _objFlags: 0,
    __editorExtras__: {},
    _native: '',
    scene: { __id__: 1 },
  },
  // 1
  {
    __type__: 'cc.Scene',
    ...nodeBase(),
    _name: 'main',
    _layer: 1073741824,
    _children: [{ __id__: 2 }],
    _globals: { __id__: 11 },
    autoReleaseAssets: false,
    _id: '1a2b3c4d-5e6f-4a70-9b81-c2d3e4f5a6b7',
  },
  // 2 Canvas
  {
    __type__: 'cc.Node',
    ...nodeBase(),
    _name: 'Canvas',
    _layer: UI_2D,
    _parent: { __id__: 1 },
    _children: [{ __id__: 3 }, { __id__: 4 }],
    _components: [{ __id__: 5 }, { __id__: 6 }, { __id__: 7 }],
    _id: '2b3c4d5e-6f70-4b81-9c92-d3e4f5a6b7c8',
  },
  // 3 Camera node
  {
    __type__: 'cc.Node',
    ...nodeBase(),
    _name: 'Camera',
    _layer: UI_2D,
    _parent: { __id__: 2 },
    _components: [{ __id__: 8 }],
    _lpos: vec3(0, 0, 1000),
    _id: '3c4d5e6f-7081-4c92-9da3-e4f5a6b7c8d9',
  },
  // 4 GameRoot node
  {
    __type__: 'cc.Node',
    ...nodeBase(),
    _name: 'GameRoot',
    _layer: UI_2D,
    _parent: { __id__: 2 },
    _components: [{ __id__: 9 }, { __id__: 10 }],
    _id: '4d5e6f70-8192-4da3-9eb4-f5a6b7c8d9e0',
  },
  // 5 Canvas UITransform
  {
    ...componentBase(),
    __type__: 'cc.UITransform',
    node: { __id__: 2 },
    _contentSize: { __type__: 'cc.Size', width: 960, height: 640 },
    _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
    _id: '5e6f7081-92a3-4eb4-9fc5-a6b7c8d9e0f1',
  },
  // 6 Canvas
  {
    ...componentBase(),
    __type__: 'cc.Canvas',
    node: { __id__: 2 },
    _cameraComponent: { __id__: 8 },
    _alignCanvasWithScreen: true,
    _id: '6f708192-a3b4-4fc5-90d6-b7c8d9e0f1a2',
  },
  // 7 Widget
  {
    ...componentBase(),
    __type__: 'cc.Widget',
    node: { __id__: 2 },
    _alignFlags: 45,
    _target: null,
    _left: 0,
    _right: 0,
    _top: 0,
    _bottom: 0,
    _horizontalCenter: 0,
    _verticalCenter: 0,
    _isAbsLeft: true,
    _isAbsRight: true,
    _isAbsTop: true,
    _isAbsBottom: true,
    _isAbsHorizontalCenter: true,
    _isAbsVerticalCenter: true,
    _originalWidth: 0,
    _originalHeight: 0,
    _alignMode: 2,
    _lockFlags: 0,
    _id: '708192a3-b4c5-40d6-91e7-c8d9e0f1a2b3',
  },
  // 8 Camera
  {
    ...componentBase(),
    __type__: 'cc.Camera',
    node: { __id__: 3 },
    _projection: 0,
    _priority: 1073741824,
    _fov: 45,
    _fovAxis: 0,
    _orthoHeight: 320,
    _near: 1,
    _far: 2000,
    _color: { __type__: 'cc.Color', r: 13, g: 16, b: 23, a: 255 },
    _depth: 1,
    _stencil: 0,
    _clearFlags: 7,
    _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
    _aperture: 19,
    _shutter: 7,
    _iso: 0,
    _screenScale: 1,
    _visibility: UI_VISIBILITY,
    _targetTexture: null,
    _postProcess: null,
    _usePostProcess: false,
    _cameraType: -1,
    _trackingType: 0,
    _id: '8192a3b4-c5d6-41e7-92f8-d9e0f1a2b3c4',
  },
  // 9 GameRoot UITransform
  {
    ...componentBase(),
    __type__: 'cc.UITransform',
    node: { __id__: 4 },
    _contentSize: { __type__: 'cc.Size', width: 100, height: 100 },
    _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
    _id: '92a3b4c5-d6e7-42f8-9309-e0f1a2b3c4d5',
  },
  // 10 GameRoot 脚本组件
  {
    ...componentBase(),
    __type__: gameRootClassId,
    node: { __id__: 4 },
    sidePanelWidth: 520,
    maxScale: 1.6,
    mountWebUI: true,
    _id: 'a3b4c5d6-e7f8-4309-941a-f1a2b3c4d5e6',
  },
  // 11 SceneGlobals
  {
    __type__: 'cc.SceneGlobals',
    ambient: { __id__: 12 },
    shadows: { __id__: 15 },
    _skybox: { __id__: 13 },
    fog: { __id__: 14 },
    octree: { __id__: 16 },
    skin: { __id__: 17 },
    lightProbeInfo: { __id__: 18 },
    postSettings: { __id__: 19 },
    bakedWithStationaryMainLight: false,
    bakedWithHighpLightmap: false,
  },
  // 12~19：环境、天空盒、雾、阴影等设置，留默认值即可
  { __type__: 'cc.AmbientInfo' },
  { __type__: 'cc.SkyboxInfo' },
  { __type__: 'cc.FogInfo' },
  { __type__: 'cc.ShadowsInfo' },
  { __type__: 'cc.OctreeInfo' },
  { __type__: 'cc.SkinInfo' },
  { __type__: 'cc.LightProbeInfo' },
  { __type__: 'cc.PostSettingsInfo' },
]

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(objects, null, 2)}\n`, 'utf8')
console.log(`已生成 ${outputPath}`)
console.log(`GameRoot 脚本类 ID：${gameRootClassId}`)
