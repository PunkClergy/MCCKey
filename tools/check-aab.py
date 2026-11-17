# -*- coding: utf-8 -*-
"""
打包产物自检脚本（Android AAB / APK）

用途：上传 Google Play 之前，先确认打出来的包是否满足两条硬性要求：
  1) targetSdkVersion >= 36（Android 16），否则 Play 会拒绝更新；
  2) 不含 READ_MEDIA_IMAGES / READ_MEDIA_VIDEO，否则会被「照片和视频权限」政策拒审。

用法：
  python tools/check-aab.py                    # 自动检查 unpackage/release 下最新的 .aab
  python tools/check-aab.py <aab或apk路径>      # 检查指定文件

说明：AAB 内的 AndroidManifest.xml 是 protobuf 格式，这里用轻量方式解析
      权限名与 uses-sdk 的属性值，不依赖 aapt2 / bundletool / java。
"""

import glob
import os
import sys
import zipfile

MEDIA_PERMS = [b'READ_MEDIA_IMAGES', b'READ_MEDIA_VIDEO']


def read_manifest(path):
    """返回 manifest 二进制内容；AAB 与 APK 的路径不同。"""
    z = zipfile.ZipFile(path)
    if path.lower().endswith('.aab'):
        return z.read('base/manifest/AndroidManifest.xml'), True
    return z.read('AndroidManifest.xml'), False


def get_permission_strings(data):
    """粗解析：把 uses-permission 的 name 属性值全部抽出来。"""
    found = []
    for m in MEDIA_PERMS:
        if m in data:
            found.append(m.decode())
    return found


def attr_value(data, key):
    """读取 XmlAttribute 的 value 字符串（protobuf: 0x1a len text）。"""
    idx = data.find(key)
    if idx == -1:
        return None
    tail = data[idx + len(key): idx + len(key) + 40]
    if len(tail) >= 2 and tail[0] == 0x1A:
        return tail[2:2 + tail[1]].decode('utf-8', 'ignore')
    return None


def check(path):
    print('=' * 72)
    print('文件:', path)
    print('大小: %.1f MB' % (os.path.getsize(path) / 1024 / 1024))

    try:
        data, is_aab = read_manifest(path)
    except Exception as e:
        print('  [ERROR] 无法读取清单:', e)
        return False

    target = attr_value(data, b'targetSdkVersion')
    ver_code = attr_value(data, b'versionCode')
    ver_name = attr_value(data, b'versionName')
    media = get_permission_strings(data)

    print('  versionName :', ver_name)
    print('  versionCode :', ver_code)
    print('  targetSdk   :', target)

    ok = True
    if target is None or int(target) < 36:
        print('  [FAIL] targetSdkVersion 低于 36，Play 会拒绝更新')
        ok = False
    else:
        print('  [OK]   targetSdk = %s，满足 Play 的 API 36 要求' % target)

    if media:
        print('  [FAIL] 仍声明了媒体权限:', ', '.join(media))
        ok = False
    else:
        print('  [OK]   未声明 READ_MEDIA_IMAGES / READ_MEDIA_VIDEO')

    print('  结论:', '可上传' if ok else '不要上传，先修配置/代码')
    return ok


def main():
    if len(sys.argv) > 1:
        targets = sys.argv[1:]
    else:
        root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            'unpackage', 'release')
        targets = sorted(glob.glob(os.path.join(root, '*.aab')), key=os.path.getmtime)
        targets = targets[-1:]
        if not targets:
            print('未找到 .aab，请指定路径：python tools/check-aab.py <path>')
            return 2

    results = [check(p) for p in targets]
    return 0 if all(results) else 1


if __name__ == '__main__':
    sys.exit(main())
