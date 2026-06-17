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
