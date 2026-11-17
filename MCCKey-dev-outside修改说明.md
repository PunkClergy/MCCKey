# Google Play 权限整改说明

本版本按“最小必要权限”原则做了权限整改，目标是避免 Google Play 因后台定位或过度敏感权限拒审。

## 已删除/移除

- 移除 `Barcode` 模块，因为当前页面没有扫码入口。
- 移除地图/定位 SDK 配置：`maps`、`geolocation`。
- 移除 Android 无必要敏感权限：
  - `ACCESS_COARSE_LOCATION`
  - `CHANGE_NETWORK_STATE`
  - `ACCESS_WIFI_STATE`
  - `CHANGE_WIFI_STATE`
  - `WAKE_LOCK`
  - `FLASHLIGHT`
  - `VIBRATE`
- 移除微信小程序位置声明：`scope.userLocation`、`requiredPrivateInfos: getLocation`。
- 移除旧版未引用的 `components/MapCom` 地图组件，该组件包含位置调用且依赖文件不完整。
- H5 地图页 `hybrid/html/js/sendKey.js` 不再主动调用浏览器定位。

## 当前保留权限

Android 当前只保留：

- `INTERNET`：登录、上传图片、车辆控制接口需要。
- `ACCESS_NETWORK_STATE`：网络状态判断需要。
- `CAMERA`：安装检测、还车拍照需要。
- `BLUETOOTH_SCAN`：扫描车辆蓝牙设备需要。
- `BLUETOOTH_CONNECT`：连接车辆蓝牙设备需要。
- `BLUETOOTH` / `BLUETOOTH_ADMIN`：仅限 Android 11 及以下兼容使用，已加 `maxSdkVersion="30"`。
- `ACCESS_FINE_LOCATION`：仅限 Android 11 及以下 BLE 扫描兼容使用，已加 `maxSdkVersion="30"`。

`BLUETOOTH_SCAN` 已添加：

```xml
android:usesPermissionFlags="neverForLocation"
```

表示蓝牙扫描不用于推断用户地理位置。提交前请真机测试车辆蓝牙设备在 Android 12+ 上是否仍能正常被扫描到。





## 2026-05-31 编译修复

- 移除 `pages/userCenter/index.vue` 中未必要的 `url-search-params-polyfill` 引入。
- `utils/request/http.js` 改为内置 query 参数序列化函数，避免 HBuilderX 导出本地打包资源时因未安装 npm 包导致 Rollup 解析失败。
- 清空未使用的 npm 依赖，导出本地资源不再依赖 node_modules。

## 2026-11-13 修复 Google Play「照片/视频权限」拒审

**问题**：Play 审核报「您的应用应使用系统照片选择器访问照片/视频，而不是请求 READ_MEDIA_IMAGES / READ_MEDIA_VIDEO」。

**根因**：源码 `manifest.json` 里本来就没有这两个权限，是 HBuilderX 云打包时由 `Camera` 模块（targetSdkVersion ≥ 33）自动注入到最终 `AndroidManifest.xml` 的，所以只删 `permissions` 里的条目没用。

**改动**（`manifest.json` → `app-plus.distribute.android`）：

```json
"permissions" : [
    "...INTERNET...",
    "...ACCESS_NETWORK_STATE...",
    "...CAMERA...",
    "<uses-permission android:name=\"android.permission.READ_EXTERNAL_STORAGE\" android:maxSdkVersion=\"32\" />"
],
"removepermissions" : [
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO"
]
```

- 用官方的「强制移除的权限」(`removepermissions`) 在最终合并阶段删掉 `Camera` 模块注入的两个媒体权限。
- `READ_EXTERNAL_STORAGE` 加 `maxSdkVersion="32"`：Android 12 及以下走相册选图仍需它，Android 13+ 由系统照片选择器接管，符合 Play 政策。
- 同时把 `versionCode` 由 `20261030` 升到 `20261113`、`versionName` 升到 `1.1.3`，避免 Google 复审时仍指向旧包。

**功能影响**：`pages/returnPhotos/index.vue` 的 `uni.chooseImage({ sourceType: ['album', 'camera'] })`——拍照只依赖 `CAMERA`（保留）；相册选图在 Android 13+ 走系统照片选择器（免权限），Android ≤12 仍有 `READ_EXTERNAL_STORAGE`。上传走 `uni.uploadFile` 的临时文件路径，与存储权限无关。

**验证方式**：重新云打包后，用 Android Studio 打开生成的 `.aab` / `.apk`，查看 `AndroidManifest.xml` 全局搜索 `READ_MEDIA`，应搜不到；再上传到 Play Console 的**所有轨道**（内部测试、封闭测试、正式版）重新送审。

---

## 2026-11-16 复核：上一条的移除配置没生效，改为从 API 层根治

**复核结论**（`python tools/check-aab.py` 解析 11-13 打出的包）：

```
versionName 1.1.3 / versionCode 20261113 / targetSdk 36
[FAIL] 仍声明了媒体权限: READ_MEDIA_IMAGES, READ_MEDIA_VIDEO
```

`removepermissions` 确实被 HBuilderX 带进了编译配置（见 `unpackage/dist/build/app-plus/manifest.json`），但**最终 AAB 里这两个权限依然存在**。说明它们在 SDK/模块侧的清单里声明，应用层"删除"不生效。

**真正的原因**：`uni.chooseImage` 在 App 端是直接读相册的实现，用它就会连带申请 `READ_MEDIA_*`，撞上 Play 的「照片和视频权限」政策。官方给出的两条路：改用 `uni.chooseMedia`（App 端走系统相册选择器，不需要本地媒体权限），或改用原生插件 `uni-chooseSystemMedia`。

**改动一：`pages/returnPhotos/index.vue`**

- `inputCardBtnTap` 改为调用新增的 `pickOneImage()`，交互不变（1 张、原图/压缩、相册+相机）。
- `pickOneImage()` 用条件编译：
  - App / 小程序：`uni.chooseMedia({ mediaType: ['image'], sourceType: ['album', 'camera'] })`，取 `res.tempFiles[0].tempFilePath`；
  - H5：`uni.chooseMedia` 不支持，退回 `uni.chooseImage`（H5 无 Android 权限概念，不影响 Play 上架）。
- 顺带修掉原 `fail` 回调里 `err.errMsg.includes('auth')` 在 `errMsg` 缺失时会抛异常的问题；用户主动取消不再提示"失败"。

**改动二：`manifest.json`** 增加官方可视化界面「强制移除的权限」对应的 `excludePermissions`（完整 `<uses-permission/>` 字符串），与 `removepermissions` 并存做双保险。

**改动三：新增 `tools/check-aab.py`** —— 上传前自检，直接解析 AAB 内的 protobuf 清单，输出 `versionCode / targetSdkVersion / 是否含 READ_MEDIA` 并给结论：

```
python tools/check-aab.py            # 自动检查 unpackage/release 下最新的 aab
python tools/check-aab.py <路径>      # 检查指定 aab/apk
```

---

## 2026-11-16 targetSdk 36 复核（Play「目标 API 级别」报错）

Play 提示「不合规的最高目标 API 级别为 Android 15（API 35）」，但本地产物均已是 36：

| 打包时间 | versionCode | targetSdk | READ_MEDIA |
|---|---|---|---|
| 08-21 16:33 | 20260821 | 35 | YES |
| 09-04 15:42 | 20260904 | 35 | YES |
| 09-16 18:46 | 20260916 | 35 | no |
| 09-17 | 20260917 | 35 | no |
| 10-30 15:06 | 20261030 | **36** | YES |
| 11-13 18:29 | 20261113 | **36** | YES |

- git 记录显示 `targetSdkVersion` 是 **10-30 才从 35 改成 36** 的，之前所有包都是 35。
- 因此该报错指向的是**仍挂在某个轨道（内部测试/封闭测试/正式版）里的旧版本包**（1.0.x ~ 1.1.3，8 月至 9 月那批，targetSdk 35），而不是新包没配好。
- 处理：把 `20261113` 发布到**正式版**，并把各测试轨道里的旧版本停用/替换（Play 会扫描所有轨道，包括测试轨道）。
- 后续每次发版都先跑 `python tools/check-aab.py` 再上传。
