<template>
	<view class="page-container">
		<view class="status-safe-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 全屏弹窗（默认显示） -->
		<view class="modal-mask" v-if="showModal">
			<view class="modal-box" @click.stop>
				<view class="modal-title">{{ modalTitle[lang] }}</view>
				<view class="modal-content">
					<text class="text-content">{{ tipText[lang] }}</text>
				</view>
				<view class="btn-box">
					<button class="confirm-btn" @click="goToIndex">{{ btnText[lang] }}</button>
				</view>
			</view>
		</view>

	</view>
</template>

<script>
	export default {
		data() {
			return {
				lang: 'zhCn',
				showModal: true,
				statusBarHeight: 0,
				safeBottom: 0,
				// 标题双语
				modalTitle: {
					zhCn: '离线蓝牙控车功能使用须知',
					enUs: 'Offline Bluetooth Control Usage Instructions'
				},
				// 按钮双语
				btnText: {
					zhCn: '我已阅读',
					enUs: 'I have read and agree'
				},
				// 内容双语
				tipText: {
					zhCn: `离线蓝牙控车功能使用须知
本车辆智能设备支持离线蓝牙控车功能，在无网络、网络信号薄弱或断网等无法联网的场景下，需用户手动切换至蓝牙模式，支持用户完成开关车门、近距离寻车等基础车辆操作，为无网络环境下的用车提供便捷保障。

该功能需依托手机系统机制、APP缓存及存储权限运行，受移动设备系统限制，出现以下任意情况将导致蓝牙控车功能失效，无法正常操控车辆：
1. 使用APP功能期间重启手机，会中断蓝牙连接与本地缓存数据，造成控车异常；
2. 手动清理车辆APP缓存，删除蓝牙配对及控车校验数据，导致功能无法使用；
3. 手机省电机制自动清理APP后台进程与缓存，中断控车数据支撑；
4. 未对APP开启存储访问权限，应用无法读写控车配对数据；
5. 本地缓存数据超出有效周期自动失效，需重新配对后方可恢复功能。`,
					enUs: `This vehicle's smart device supports offline Bluetooth control. In scenarios without network, weak signal or disconnected network, you need to manually switch to Bluetooth mode to perform basic operations such as lock/unlock doors and find car nearby.

This function relies on mobile system settings, APP cache and storage permissions. Due to system limitations, the function may fail under any of the following conditions:
1. Restarting the phone while using the function will interrupt Bluetooth connection and local cache;
2. Manually clearing APP cache will delete Bluetooth pairing and verification data;
3. Power-saving mode automatically clears APP background process and cache;
4. Without enabling storage permission for the APP, pairing data cannot be read or written;
5. Local cache expires automatically and requires re-pairing to restore function.`
				}
			};
		},
		onShow() {
			this.initSafeArea()
			this.getSystemLanguage()
		},
		methods: {
			initSafeArea() {
				try {
					const sys = uni.getSystemInfoSync();
					this.statusBarHeight = sys.statusBarHeight || 0;
					this.safeBottom = sys.safeAreaInsets && typeof sys.safeAreaInsets.bottom === 'number' ? sys.safeAreaInsets.bottom : 0;
					// #ifdef APP-PLUS
					if (typeof plus !== 'undefined') {
						plus.navigator.setStatusBarStyle('dark');
						plus.navigator.setStatusBarBackground('#F5F5F5');
					}
					// #endif
				} catch (e) {
					this.statusBarHeight = 0;
					this.safeBottom = 0;
				}
			},
			goToIndex() {
				uni.redirectTo({
					url: "/pages/index/index"
				});
			},

			getSystemLanguage() {
				// ==================== 1. 语言映射配置（扩展语言只改这里） ====================
				const LANG_MAP = {
					zh: 'zhCn', // 中文
					en: 'enUs', // 英文
					// 想加新语言直接在这里加
					// ja: 'jaJp',
					// ko: 'koKr',
					// fr: 'frFr',
				}

				// ==================== 2. 优先使用缓存 ====================
				const cacheLang = uni.getStorageSync('language')
				if (cacheLang) {
					this.lang = cacheLang
					return
				}

				// ==================== 3. 无缓存 → 获取系统语言 ====================
				const systemInfo = uni.getSystemInfoSync()
				console.log(systemInfo,'0000')
				const systemLanguage = systemInfo.language || 'zh' // 兜底中文

				// 统一处理语言码：提取前缀（如 zh-CN → zh，en_US → en）
				const langPrefix = systemLanguage.split(/[-_]/)[0].toLowerCase()

				// ==================== 4. 映射成我们需要的格式（自动兜底） ====================
				const finalLang = LANG_MAP[langPrefix] || 'zhCn'

				// 赋值并缓存
				this.lang = finalLang
				uni.setStorageSync('language', finalLang)

			}

		}
	};
</script>

<style scoped>
	.page-container {
		width: 750rpx;
		min-height: 100vh;
		background: #f5f5f5;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.status-safe-bar {
		width: 100%;
		background: #f5f5f5;
		flex-shrink: 0;
	}

	.modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.modal-box {
		width: 620rpx;
		background: #fff;
		border-radius: 24rpx;
		padding: 40rpx 32rpx;
		box-sizing: border-box;
	}

	.modal-title {
		font-size: 34rpx;
		font-weight: bold;
		color: #333;
		text-align: center;
		margin-bottom: 30rpx;
	}

	.modal-content {
		max-height: 700rpx;
		overflow-y: auto;
		margin-bottom: 40rpx;
	}

	.text-content {
		font-size: 28rpx;
		color: #555;
		line-height: 1.6;
		white-space: pre-line;
	}

	.btn-box {
		display: flex;
		justify-content: center;
	}

	.confirm-btn {
		width: 400rpx;
		height: 88rpx;
		line-height: 88rpx;
		background: #007aff;
		color: #fff;
		border-radius: 44rpx;
		font-size: 30rpx;
		border: none;
	}
</style>