<template>
	<view class="map-page">
		<!-- 头部导航栏 -->
		<view class="header" :style="headerStyle">
			<view class="header-container" :style="headerContainerStyle">
				<view class="header-left" :style="headerLeftStyle">
					<text class="header-title">电子钥匙</text>
				</view>
				<view class="header-right" :style="headerRightStyle">
					<text class="header-icon" @click="handleLogin">{{login_status?'个人中心':'请登录'}}</text>
				</view>
			</view>

		</view>

		<!-- 地图主体区域 -->
		<view class="map-container">
			<!-- 左上角：网络/蓝牙模式切换（图片版-上下排列） -->
			<view class="top-left-controls">
				<view class="control-card">
					<view class="mode-item" :class="{ active: currentMode === -4 }" @click="handleControl('-4')">
						<image class="mode-img"
							:src="currentMode === -4 ? '/static/images/wifi_1.png' : '/static/images/wifi.png'"
							mode="widthFix"></image>
					</view>
					<view class="mode-item" :class="{ active: currentMode === -5 }" @click="handleControl('-5')">
						<image class="mode-img"
							:src="currentMode === -5 ? '/static/images/bluetooth_1.png' : '/static/images/bluetooth.png'"
							mode="widthFix"></image>
					</view>
				</view>
			</view>

			<!-- 右下角：导航+回到当前位置悬浮图标 -->
			<view class="bottom-right-controls">
				<view class="float-btn" @click="centerLocation">
					<image class="float-img" src="/static/images/location.png" mode="widthFix"></image>
				</view>
				<view class="float-btn" @click="routePlan">
					<image class="float-img" src="/static/images/route.png" mode="widthFix"></image>
				</view>
			</view>

			<!-- 核心地图组件 -->
			<map class="map" :latitude="latitude" :longitude="longitude" :scale="mapScale" show-location @tap="mapClick"
				:markers="markers"></map>
		</view>

		<!-- 底部控制栏（5个按钮） -->
		<view class="bottom-controls">
			<view class="control-bar">
				<view class="control-btn" @click="handleFooterBtn(3)">
					<image class="btn-img" src="https://k3a.wiselink.net.cn/img/app/desk/ren_unlock.png"
						mode="widthFix"></image>
					<text class="btn-text">开锁</text>
				</view>
				<view class="control-btn" @click="handleFooterBtn(1)">
					<image class="btn-img" src="https://k3a.wiselink.net.cn/img/app/desk/ren_lock.png" mode="widthFix">
					</image>
					<text class="btn-text">关锁</text>
				</view>
				<view class="control-btn" @click="handleFooterBtn(5)">
					<image class="btn-img" src="https://k3a.wiselink.net.cn/img/app/desk/ren_lookFor.png"
						mode="widthFix"></image>
					<text class="btn-text">寻车</text>
				</view>
				<view class="control-btn" @click="handleReturningVehicles">
					<image class="btn-img" src="https://k3a.wiselink.net.cn/img/app/desk/ren_return.png"
						mode="widthFix"></image>
					<text class="btn-text">还车</text>
				</view>
				<view class="control-btn" @click="handleViewPhotos">
					<image class="btn-img" src="https://k3a.wiselink.net.cn/img/app/desk/ren_photo.png" mode="widthFix">
					</image>
					<text class="btn-text">查看</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		deviceDetector
	} from '@/utils/ToolClass.js';
	import bleManager from '@/utils/BleKeyFun-utils-single.js';
	import {
		u_getCarPoisitonByCode,
		u_verifyControlcode,
		u_operation
	} from '@/api';
	export default {
		name: "MapPage",
		data() {
			return {
				// 头部动态样式
				headerStyle: {},
				headerContainerStyle: {},
				headerLeftStyle: {},
				headerRightStyle: {},
				// 地图初始坐标
				latitude: 39.908823,
				longitude: 116.397470,
				// 用户当前位置
				current_latitude: 39.908823,
				current_longitude: 116.397470,
				// 地图缩放级别（范围：3-20）
				mapScale: 16,
				// 当前模式：-4（网络）/-5（蓝牙）
				currentMode: -4,
				// 汽车位置地图标记点
				markers: [],
				// 当前登录状态
				login_status: false,
				c_fin3_link: 'https://fin3.wiselink.net.cn/fin/',
			};
		},
		onLoad(options) {
			// 控车码
			this.InitSharingCode(options)
		},
		onShow() {
			const scene = uni.getStorageSync('scene');
			this.shareCode = scene
			this.handleSearchLink(scene);
			// 获取登录状态
			this.initLoginState()
			// 设备信息获取
			this.InitDetermineEquipment()
		},
		methods: {
			// WEIXIN
			initSystemInfo() {
				const systemInfo = uni.getSystemInfoSync();
				const statusBarHeight = systemInfo.statusBarHeight || 0;
				let menuButtonInfo = uni.getMenuButtonBoundingClientRect?.() || null;
				const systemInfoObj = {
					screen_width: systemInfo.screenWidth || 0,
					screen_height: systemInfo.screenHeight || 0,
					height_from_head: statusBarHeight,
					head_height: !menuButtonInfo ?
						statusBarHeight + 44 : statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top -
							statusBarHeight) * 2,
					capsule_distance_to_the_right: 16,
					capsule_top: 0,
					capsule_left: 0,
					capsule_width: 0,
					capsule_height: 0,
					capsule_bottom: 0,
					capsule_right: 0,
					...(menuButtonInfo && {
						capsule_distance_to_the_right: systemInfo.screenWidth - menuButtonInfo.right,
						capsule_top: menuButtonInfo.top,
						capsule_left: menuButtonInfo.left,
						capsule_width: menuButtonInfo.width,
						capsule_height: menuButtonInfo.height,
						capsule_bottom: menuButtonInfo.bottom,
						capsule_right: menuButtonInfo.right
					})
				};


				Object.assign(this, systemInfoObj);


				const {
					capsule_height,
					capsule_top,
					capsule_left,
					capsule_distance_to_the_right
				} = this;
				const capsuleBaseHeight = capsule_height + capsule_top + 10;
				const capsuleBaseWidth = capsule_left - (capsule_distance_to_the_right * 2);


				this.headerStyle = {
					height: `${Math.max(capsuleBaseHeight, 44)}px`,
					width: `${capsuleBaseWidth}px`
				};
				this.headerContainerStyle = {
					height: `${capsule_top + capsule_height}px`
				};
				this.headerLeftStyle = {
					height: `${capsule_height}px`
				};

				this.headerRightStyle = {
					height: `${this.capsule_height -2}px`,
					width: `${this.capsule_width}px`
				}
			},
			// Android app
			initSystemAndroid() {
				const systemInfo = uni.getSystemInfoSync();
				console.log(systemInfo);

				// ========== 1. 定义App端核心参数（对齐小程序端字段结构） ==========
				const statusBarHeight = systemInfo.statusBarHeight || 0; // 状态栏高度
				const navBarHeight = 48; // Android App导航栏标准高度（可根据UI设计调整）
				const headHeight = statusBarHeight + navBarHeight; // 头部总高度（状态栏+导航栏）
				// App端无胶囊按钮，模拟胶囊相关字段（保证样式计算不报错）
				const capsuleDefault = {
					capsule_distance_to_the_right: 16, // 默认右侧间距（和小程序端一致）
					capsule_top: statusBarHeight + 8, // 胶囊模拟top值（状态栏下8px）
					capsule_left: systemInfo.screenWidth - 120, // 模拟胶囊left值（右侧120px）
					capsule_width: 80, // 模拟胶囊宽度
					capsule_height: 32, // 模拟胶囊高度
					capsule_bottom: statusBarHeight + 8 + 32, // 模拟胶囊bottom值
					capsule_right: systemInfo.screenWidth - 16 // 模拟胶囊right值
				};

				// ========== 2. 挂载字段到this（对齐小程序端） ==========
				Object.assign(this, {
					screen_width: systemInfo.screenWidth || 0,
					screen_height: systemInfo.screenHeight || 0,
					height_from_head: statusBarHeight,
					head_height: headHeight,
					...capsuleDefault // 挂载模拟的胶囊字段
				});

				// ========== 3. 计算样式（和小程序端逻辑完全对齐） ==========
				const {
					capsule_height,
					capsule_top,
					capsule_left,
					capsule_distance_to_the_right,
					capsule_width // 新增这一行
				} = this;
				const capsuleBaseHeight = capsule_height + capsule_top + 10; // 基础高度（+10间距）
				const capsuleBaseWidth = capsule_left - (capsule_distance_to_the_right * 2); // 基础宽度

				// ========== 4. 赋值样式（和小程序端字段完全一致） ==========
				this.headerStyle = {
					height: `${Math.max(capsuleBaseHeight, navBarHeight)}px`, // 取最大值（保证不小于导航栏高度）
					width: `${Math.max(capsuleBaseWidth, systemInfo.screenWidth - 40)}px` // 宽度兜底（屏幕宽度-40px）
				};
				this.headerContainerStyle = {
					height: `${capsule_top + capsule_height}px` // 容器高度（模拟胶囊top+高度）
				};
				this.headerLeftStyle = {
					height: `${capsule_height}px` // 左侧区域高度（模拟胶囊高度）
				};
				this.headerRightStyle = {
					height: `${capsule_height - 2}px`, // 右侧区域高度（模拟胶囊高度-2px）
					width: `${capsule_width}px` // 右侧区域宽度（模拟胶囊宽度）
				};
				console.log(`${capsule_height - 2}px`)
				console.log(`${capsule_width}px`)
			},
			// 判断当前设备参数
			InitDetermineEquipment() {
				const deviceInfo = deviceDetector.getDeviceInfo();
				if (deviceInfo.isMiniProgram && deviceInfo.isWechatMini) { //小程序环境
					this.initSystemInfo()
				}
				if (deviceInfo.isApp && deviceInfo.isAndroid) { //安卓应用
					this.initSystemAndroid()
				}
			},
			// 获取控车码并设置缓存,然后执行其他地图操作
			InitSharingCode(evt) {
				const shareCode = evt?.scene || evt?.query || '1760_A55F97D9C2384D82AFC0D8DC40B86636';
				if (shareCode) {
					this.$nextTick(() => {
						try {
							this.handleSearchLink(shareCode)
							this.shareCode = shareCode
							uni.setStorageSync('scene', shareCode)
						} catch (e) {}
					});
				}
			},
			// 获取车辆位置
			handleSearchLink(evt) {
				u_getCarPoisitonByCode({
					code: evt
				}).then(res => {
					if (res?.code !== 1000) return;
					const i = res.content || {};
					Object.assign(this, {
						...i,
						latitude: i.latitude,
						longitude: i.longitude,
						g_images: [
							i?.uploadImgUrl,
							i?.uploadImgUrlFive,
							i?.uploadImgUrlFour,
							i?.uploadImgUrlThree,
							i?.uploadImgUrlTwo
						],
						markers: [{
							id: 1,
							latitude: i.latitude,
							longitude: i.longitude,
							title: i.plateNumber,
							iconPath: '/static/images/car_icon.png',
							width: 20,
							height: 43,
							callout: {
								content: `${i.plateNumber || ''}
			          当前位置：${i.address || '未知'}
			          定位时间：${i.showtime || '未知'}`,
								display: 'ALWAYS',
								padding: 8
							}
						}]
					});
				});
			},
			// 切换网络/蓝牙模式
			handleControl(evt) {
				const control_id = Number(evt);
				if (control_id === this.currentMode) return;
				const showToastAndSetData = (message, newControlType) => {
					uni.showToast({
						title: message,
						icon: 'none',
						duration: 2000
					});
					this.currentMode = newControlType;
				};
				switch (control_id) {
					case -4:
						showToastAndSetData('已经切换成网络控车模式', control_id);
						bleManager.releaseBle();
						break;
					case -5:
						showToastAndSetData('已经切换成蓝牙控车模式', control_id);
						break;
					default:
						break;
				}
			},
			// 开锁、关锁、寻车核心逻辑（精简版）
			handleFooterBtn(evt) {
				// 增加标识，记录loading是否成功显示
				let loadingShowed = false;
				const safeLoading = {
					show: () => {
						try {
							uni.showLoading({
								title: '正在控制...',
								mask: true
							});
							loadingShowed = true; // 标记loading已显示
							return true;
						} catch (e) {
							console.warn('显示加载失败:', e);
							loadingShowed = false; // 标记loading未显示
							return false;
						}
					},
					hide: () => {
						// 只有loading成功显示过，才执行隐藏操作
						if (loadingShowed) {
							try {
								uni.hideLoading();
							} catch (e) {
								console.warn('隐藏加载失败:', e);
							} finally {
								loadingShowed = false; // 重置标识
							}
						}
					}
				};

				const showErrorToast = (msg) => uni.showToast({
					title: msg || '控制请求异常',
					icon: 'none',
					duration: 2000
				});

				const handleCore = () => {
					// 尝试显示loading，失败则直接返回
					if (!safeLoading.show()) return;

					// 校验设备标识
					if (!this.sn) {
						showErrorToast('未找到有效设备标识');
						safeLoading.hide(); // 此时loading已显示，可安全隐藏
						return;
					}

					const {
						currentMode: controlType
					} = this;

					// 蓝牙分支（暂未开发）
					if (controlType === -5) {
						uni.showModal({
							title: '温馨提示',
							content: '蓝牙模式响应存在轻微延迟，为确保正常使用，请勿快速重复操作。',
							showCancel: false,
							success: (res) => {
								if (res.confirm) {
									this.handleExecuteBluetooth(evt);
								}
							}
						})
						safeLoading.hide();
						return;
					}

					// 网络分支（仅处理-4模式）
					if (controlType === -4) {
						const requestParams = {
							operationType: evt,
							sn: this.sn
						};

						u_operation(requestParams)
							.then(res => {
								safeLoading.hide(); // 请求完成后隐藏loading
								if (res?.code === 1000) {
									const successMsg = requestParams.operationType === 5 ?
										'寻车成功，请注意附近鸣笛车辆!' :
										'控制成功!';
									uni.showToast({
										title: successMsg,
										icon: 'none'
									});
								} else {
									showErrorToast(res?.msg || '请求失败');
								}
							})
							.catch(err => {
								safeLoading.hide(); // 请求失败也隐藏loading
								showErrorToast(err.message || '网络请求异常');
							});
					} else {
						safeLoading.hide();
					}
				};

				handleCore();
			},
			// 蓝牙控制车辆
			handleExecuteBluetooth(type) {
				console.log(this)
				const COMMAND_MAPPING = {
					5: 5, // 远程寻车
					1: (this?.deviceType == 'F1' || this?.deviceType == 'F0') ? 4 : 3, // 锁门
					3: this?.deviceType == 'F1' ? 1 : 2, // 开门
				};

				const BLUETOOTH_HANDLERS = {
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_PRE_EXECUTE]: () => {
						uni.showLoading({
							title: '指令执行中...',
							icon: 'none'
						});
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR]: () => {

						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ADAPTER_UNAVAILABLE]: () => {

						uni.showToast({
							title: '请打开蓝牙',
							icon: 'none'
						});
						uni.hideLoading();

					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NOT_FOUND]: () => {
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_CONNECT_FAILED]: () => {
						uni.showToast({
							title: '蓝牙连接失败，请重试!',
							icon: 'none'
						});
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_UNSUPPORTED]: () => {
						uni.showToast({
							title: '您的手机不支持低功耗蓝牙',
							icon: 'none'
						});
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_SEND_FAILED]: () => {
						uni.showToast({
							title: '数据发送失败，请重试!',
							icon: 'none'
						});
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NO_RESPONSE]: () => {
						uni.showToast({
							title: '设备超时无响应，请重试!',
							icon: 'none'
						});
						uni.hideLoading();
					}
				};

				try {
					if (!COMMAND_MAPPING.hasOwnProperty(type)) return;
					const command = COMMAND_MAPPING[type];
					if (type == 5) {
						bleManager.sendData(
							this.idc || `19${this.sn}`,
							this.blueKey,
							command,
							state => BLUETOOTH_HANDLERS[state]?.(),
							data => {
								uni.hideLoading();
								if (data.controlType === 4) {
									uni.showToast({
										title: data.result,
										icon: 'none'
									});
									if (data.result.includes("控制成功")) {
										// 上传服务器逻辑
									}
								}
							}
						);
						return;
					}

					if ([1, 3].includes(type)) {
						bleManager.sendData(this.idc || `19${this.sn}`, this.blueKey, command, state =>
							BLUETOOTH_HANDLERS[state]?.(), data => {
								uni.hideLoading();
								if (data.controlType === 4) {
									uni.showToast({
										title: data.result,
										icon: 'none'
									});
									if (data.result.includes("控制成功")) {
										// 上传服务器逻辑
									}
								}
							});
					}
				} finally {
					//  统一清理 (如果需要)
				}
			},
			// 归还车辆
			handleReturningVehicles() {
				console.log(this)
				if (!this.shareCode) {
					showToast('无可用车辆')
					return
				}
				uni.navigateTo({
					url: `/pages/returnPhotos/index?code=${this.shareCode}`
				})
			},
			// 查看照片
			handleViewPhotos() {
				// 校验车辆编号是否存在
				console.log(this)
				if (!this.shareCode) {
					// Uniapp 统一的提示框API
					uni.showToast({
						title: '无可用车辆',
						icon: 'none', // 小程序默认是success，这里显式指定none更符合原逻辑
						duration: 2000
					});
					return
				}

				// 处理图片链接，拼接完整URL并替换路径分隔符
				const images = this.g_images.map(ele => {
					let temp = this.c_fin3_link + ele.replace(/\\/g, "/")
					console.log(temp)
					return temp
				})

				// Uniapp 统一的图片预览API
				uni.previewImage({
					urls: images, // 需要预览的图片http链接列表
					// 可选：添加失败回调，增强代码健壮性
					fail: (err) => {
						console.error('图片预览失败：', err)
						uni.showToast({
							title: '图片预览失败',
							icon: 'none'
						})
					}
				});
			},
			// 定位到当前位置
			centerLocation() {
				uni.getLocation({
					type: 'gcj02', // 国测局坐标系，适配map组件
					success: (res) => {
						this.latitude = res.latitude;
						this.longitude = res.longitude;

						uni.showToast({
							title: '已定位到当前位置',
							icon: 'none'
						});
					},
					fail: (err) => {
						uni.showToast({
							title: '定位失败：' + err.errMsg,
							icon: 'none'
						});
					}
				});
			},
			// 导航规划
			routePlan() {
				const latitude = Number(this.latitude);
				const longitude = Number(this.longitude);
				uni.openLocation({
					latitude,
					longitude,
					scale: 18,
					fail: (err) => {
						console.error('打开位置失败', err);
						uni.showToast({
							title: '导航失败，请检查定位权限',
							icon: 'none',
							duration: 3000
						});
					}
				});
			},
			// 跳转登录页面or个人中心页面
			handleLogin() {
				const config = this.login_status ? {
					method: 'navigateTo',
					url: '/pages/userCenter/index'
				} : {
					method: 'redirectTo',
					url: '/pages/login/index'
				};

				uni[config.method]({
					url: config.url
				});
			},
			// 判断当前页面登录状态
			initLoginState() {
				uni.getStorage({
					key: 'userKey',
					success: (res) => {
						this.login_status = !!res.data && typeof res.data === 'object';
					},
					fail: () => {
						this.login_status = false;
					}
				});
			},
			// 地图点击事件
			mapClick(e) {
				console.log('地图点击坐标：', e.detail.longitude, e.detail.latitude);
			}
		}
	};
</script>

<style scoped>
	/* 全局样式重置 */
	page {
		background-color: darkblue;
	}

	/* 页面整体布局 */
	.map-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: linear-gradient(to bottom, #e6f4ff, #FFFFFF);
	}

	/* 头部导航栏（沉浸式+渐变） */
	.header {
		display: flex;
		padding-left: 7px;
	}

	.header-container {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.header-right {
		border-radius: 25px;
		border: 1rpx solid #f1f1f1;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #FFFFFF;
	}

	.header-title {
		color: #333;
		font-weight: bold;
		font-size: 20px;
		font-weight: 600;
	}

	.header-icon {
		color: #333;
		font-size: 14px;
	}

	/* 地图容器 */
	.map-container {
		flex: 1;
		position: relative;
	}

	.map {
		width: 100%;
		height: 100%;
	}

	/* 左上角控件（图片版+上下排列） */
	.top-left-controls {
		position: absolute;
		top: 16px;
		left: 16px;
		z-index: 999;
	}

	.control-card {
		background: rgba(255, 255, 255, 0.92);
		border-radius: 12px;
		padding: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
		/* 垂直布局 */
		gap: 8px;
		/* 垂直间距 */
		width: 35px;
		/* 适配垂直布局的宽度 */
	}

	.mode-item {
		width: 35px;
		height: 35px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mode-item.active {
		background: #e6f4ff;
		box-shadow: 0 2px 8px rgba(22, 119, 255, 0.4);
	}

	.mode-item:active {
		transform: scale(0.95);
	}

	.mode-img {
		width: 20px;
		height: 20px;
	}

	/* 右下角悬浮控件 */
	.bottom-right-controls {
		position: absolute;
		bottom: 30px;
		/* 避开底部导航栏 */
		right: 16px;
		z-index: 999;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.float-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.95);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.float-btn:active {
		transform: scale(0.95);
		opacity: 0.9;
	}

	.float-img {
		width: 32px;
		height: 32px;
	}

	/* 底部控制栏（5个按钮） */
	.bottom-controls {
		padding: 10px 5px;
		position: relative;
		z-index: 1000;
	}

	.control-bar {
		display: flex;
		gap: 8px;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 16px;
		padding: 8px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
	}

	.control-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 8px 4px;
		border-radius: 12px;
		background: #f5f7fa;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.control-btn.primary {
		background: #1677ff;
		color: #ffffff;
	}

	.control-btn:active {
		transform: scale(0.96);
		opacity: 0.9;
	}

	.btn-img {
		width: 30px;
		height: 30px;
		margin-bottom: 4px;
	}

	/* 主按钮图片适配白色 */
	.control-btn.primary .btn-img {
		filter: invert(1);
	}

	.btn-text {
		font-size: 14px;
		font-weight: 500;
		text-align: center;
	}

	/* 适配深色模式 */
	@media (prefers-color-scheme: dark) {
		.control-card {
			background: rgba(30, 30, 30, 0.92);
		}

		.mode-item.active {
			background: #1e40af;
		}

		.float-btn {
			background: rgba(30, 30, 30, 0.95);
		}

		.control-bar {
			background: rgba(30, 30, 30, 0.95);
			color: #ffffff;
		}

		.control-btn {
			background: #374151;
			color: #ffffff;
		}

		.control-btn.primary {
			background: #1e40af;
		}
	}
</style>