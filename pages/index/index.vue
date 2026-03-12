<template>
	<view class="map-page">
		<!-- 头部导航栏 -->
		<view class="header" :style="headerStyle">
			<view class="header-container" :style="headerContainerStyle">
				<view class="header-left" :style="headerLeftStyle">
					<text class="header-title">智车钥</text>
				</view>
				<view class="header-right" :style="headerRightStyle">
					<text class="header-icon" @click="handleLogin">{{ login_status ? '个人中心' : '请登录' }}</text>
				</view>
			</view>
		</view>

		<!-- 地图主体区域 -->
		<view class="map-container">
			<!-- 左上角：网络/蓝牙模式切换 -->
			<view class="top-left-controls">
				<view class="control-card">
					<view class="mode-item" :class="{ active: currentMode === modeTypes.NETWORK }"
						@click="handleControl(modeTypes.NETWORK)">
						<image class="mode-img"
							:src="currentMode === modeTypes.NETWORK ? '/static/images/wifi_1.png' : '/static/images/wifi.png'"
							mode="widthFix"></image>
					</view>
					<view class="mode-item" :class="{ active: currentMode === modeTypes.BLUETOOTH }"
						@click="handleControl(modeTypes.BLUETOOTH)">
						<image class="mode-img"
							:src="currentMode === modeTypes.BLUETOOTH ? '/static/images/bluetooth_1.png' : '/static/images/bluetooth.png'"
							mode="widthFix"></image>
					</view>
				</view>
			</view>

			<!-- 右上角：联系我们电话图标 -->
			<view class="top-right-controls">
				<view class="contact-btn" @click="makePhoneCall">
					<image class="contact-img" src="/static/images/after_sales.png" mode="widthFix"></image>
					<text class="contact-text">咨询</text>
				</view>
			</view>

			<!-- 右下角：导航+回到当前位置悬浮图标 -->
			<view class="bottom-right-controls">
				<view class="float-btn" @click="handleCenterLocation">
					<image class="float-img" src="/static/images/location.png" mode="widthFix"></image>
				</view>
				<view class="float-btn" @click="handleRoutePlan">
					<image class="float-img" src="/static/images/route.png" mode="widthFix"></image>
				</view>
			</view>

			<!-- 核心地图组件 -->
			<map class="map" :latitude="latitude" :longitude="longitude" :scale="mapScale" show-location
				@tap="handleMapClick" :markers="markers" @regionchange="handleOnMapRegionChange"></map>
		</view>

		<!-- 底部控制栏（5个按钮） -->
		<view class="bottom-controls">
			<view class="control-bar">
				<view class="control-btn" @click="handleFooterBtn(btnTypes.UNLOCK)">
					<image class="btn-img" src="https://k3a.wiselink.net.cn/img/app/desk/ren_unlock.png"
						mode="widthFix"></image>
					<text class="btn-text">开锁</text>
				</view>
				<view class="control-btn" @click="handleFooterBtn(btnTypes.LOCK)">
					<image class="btn-img" src="https://k3a.wiselink.net.cn/img/app/desk/ren_lock.png" mode="widthFix">
					</image>
					<text class="btn-text">关锁</text>
				</view>
				<view class="control-btn" @click="handleFooterBtn(btnTypes.FIND_CAR)">
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
		u_operation,
		u_getControlCodeByMobile
	} from '@/api';
	import 'url-search-params-polyfill';

	// 常量定义（提升可读性和可维护性）
	const MODE_TYPES = {
		NETWORK: -4,
		BLUETOOTH: -5
	};
	const BTN_TYPES = {
		UNLOCK: 3,
		LOCK: 1,
		FIND_CAR: 5
	};
	const DEFAULT_CONTACT_PHONE = '400-090-5050';
	const MAP_SCALE_DEFAULT = 16;

	export default {
		name: "MapPage",
		data() {
			return {
				// 常量挂载（模板可直接使用）
				modeTypes: MODE_TYPES,
				btnTypes: BTN_TYPES,
				// 头部动态样式
				headerStyle: {},
				headerContainerStyle: {},
				headerLeftStyle: {},
				headerRightStyle: {},
				// 地图相关
				latitude: '',
				longitude: '',
				current_latitude: '',
				current_longitude: '',
				mapScale: MAP_SCALE_DEFAULT,
				currentMode: MODE_TYPES.NETWORK,
				markers: [],
				// 状态相关
				login_status: false,
				c_fin3_link: 'https://fin3.wiselink.net.cn/fin/',
				contactPhone: DEFAULT_CONTACT_PHONE,
				// 业务数据
				deviceInfo: {},
				shareCode: '',
				rentCompany: {},
				g_images: [],
				// 临时状态
				sn: '',
				idc: '',
				blueKey: '',
				deviceType: ''
			};
		},
		async onLoad(options) {
			try {
				this.deviceInfo = deviceDetector.getDeviceInfo();
				// await this.InitgetCurrent();
				this.options = options
			} catch (error) {
				console.error('页面初始化失败:', error);
			}
		},
		onShow() {
			try {
				this.initLoginState();
				this.InitDetermineEquipment();
				if (this.options) {
					this.InitgetCurrentLocation(this.options);
				}
			} catch (error) {
				console.error('页面显示失败:', error);
			}
		},
		methods: {
			/**
			 * 拨打咨询电话
			 */
			makePhoneCall() {
				const phoneNumber = this.rentCompany?.contactstel || this.contactPhone;

				if (!phoneNumber) {
					this.$showToast('暂无联系电话');
					return;
				}

				uni.showModal({
					title: '拨打电话',
					content: `是否拨打电话：${phoneNumber}`,
					confirmText: '拨打',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							uni.makePhoneCall({
								phoneNumber,
								fail: (err) => {
									console.error('拨打电话失败：', err);
									this.$showToast('拨打电话失败，请手动拨打');
								}
							});
						}
					}
				});
			},

			/**
			 * 通用提示框封装
			 * @param {string} title 提示文本
			 * @param {string} icon 图标类型
			 * @param {number} duration 显示时长
			 */
			$showToast(title, icon = 'none', duration = 2000) {
				uni.showToast({
					title,
					icon,
					duration
				});
			},

			/**
			 * 微信小程序系统信息初始化
			 */
			initSystemInfo() {
				try {
					const systemInfo = uni.getSystemInfoSync();
					const statusBarHeight = systemInfo.statusBarHeight || 0;
					const menuButtonInfo = uni.getMenuButtonBoundingClientRect?.() || {};

					const systemInfoObj = {
						screen_width: systemInfo.screenWidth || 0,
						screen_height: systemInfo.screenHeight || 0,
						height_from_head: statusBarHeight,
						head_height: !menuButtonInfo.height ?
							statusBarHeight + 44 : statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top -
								statusBarHeight) * 2,
						capsule_distance_to_the_right: systemInfo.screenWidth - (menuButtonInfo.right || systemInfo
							.screenWidth - 16),
						capsule_top: menuButtonInfo.top || 0,
						capsule_left: menuButtonInfo.left || 0,
						capsule_width: menuButtonInfo.width || 0,
						capsule_height: menuButtonInfo.height || 0,
						capsule_bottom: menuButtonInfo.bottom || 0,
						capsule_right: menuButtonInfo.right || 0
					};

					Object.assign(this, systemInfoObj);

					const {
						capsule_height,
						capsule_top,
						capsule_left,
						capsule_distance_to_the_right,
						capsule_width
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
						height: `${(capsule_height || 0) - 2}px`,
						width: `${capsule_width}px`
					};
				} catch (error) {
					console.error('小程序系统信息初始化失败:', error);
				}
			},

			/**
			 * Android app 系统信息初始化
			 */
			initSystemAndroid() {
				try {
					const systemInfo = uni.getSystemInfoSync();
					const statusBarHeight = systemInfo.statusBarHeight || 0;
					const navBarHeight = 48;
					const headHeight = statusBarHeight + navBarHeight;

					const capsuleDefault = {
						capsule_distance_to_the_right: 16,
						capsule_top: statusBarHeight + 8,
						capsule_left: systemInfo.screenWidth - 120,
						capsule_width: 80,
						capsule_height: 32,
						capsule_bottom: statusBarHeight + 8 + 32,
						capsule_right: systemInfo.screenWidth - 16
					};

					Object.assign(this, {
						screen_width: systemInfo.screenWidth || 0,
						screen_height: systemInfo.screenHeight || 0,
						height_from_head: statusBarHeight,
						head_height: headHeight,
						...capsuleDefault
					});

					this._calcHeaderStyle(systemInfo, navBarHeight);
				} catch (error) {
					console.error('Android系统信息初始化失败:', error);
				}
			},

			/**
			 * iOS app 系统信息初始化
			 */
			initSystemIOS() {
				try {
					const systemInfo = uni.getSystemInfoSync();
					const statusBarHeight = systemInfo.statusBarHeight || 20;
					const navBarHeight = 44;
					const headHeight = statusBarHeight + navBarHeight;

					const capsuleDefault = {
						capsule_distance_to_the_right: 16,
						capsule_top: statusBarHeight + 6,
						capsule_left: systemInfo.screenWidth - 110,
						capsule_width: 88,
						capsule_height: 34,
						capsule_bottom: statusBarHeight + 6 + 34,
						capsule_right: systemInfo.screenWidth - 16
					};

					Object.assign(this, {
						screen_width: systemInfo.screenWidth || 0,
						screen_height: systemInfo.screenHeight || 0,
						height_from_head: statusBarHeight,
						head_height: headHeight,
						...capsuleDefault
					});

					this._calcHeaderStyle(systemInfo, navBarHeight);
				} catch (error) {
					console.error('iOS系统信息初始化失败:', error);
				}
			},

			/**
			 * 计算头部样式（复用逻辑）
			 * @param {Object} systemInfo 系统信息
			 * @param {number} navBarHeight 导航栏高度
			 */
			_calcHeaderStyle(systemInfo, navBarHeight) {
				const {
					capsule_height,
					capsule_top,
					capsule_left,
					capsule_distance_to_the_right,
					capsule_width
				} = this;
				const capsuleBaseHeight = capsule_height + capsule_top + 10;
				const capsuleBaseWidth = capsule_left - (capsule_distance_to_the_right * 2);

				this.headerStyle = {
					height: `${Math.max(capsuleBaseHeight, navBarHeight)}px`,
					width: `${Math.max(capsuleBaseWidth, systemInfo.screenWidth - 40)}px`
				};
				this.headerContainerStyle = {
					height: `${capsule_top + capsule_height}px`
				};
				this.headerLeftStyle = {
					height: `${capsule_height}px`
				};
				this.headerRightStyle = {
					height: `${capsule_height - 2}px`,
					width: `${capsule_width}px`
				};
			},

			/**
			 * 判断当前设备并初始化系统信息
			 */
			InitDetermineEquipment() {
				try {
					const deviceInfo = deviceDetector.getDeviceInfo();
					if (deviceInfo.isMiniProgram && deviceInfo.isWechatMini) {
						this.initSystemInfo();
					} else if (deviceInfo.isApp && deviceInfo.isAndroid) {
						this.initSystemAndroid();
					} else if (deviceInfo.isApp && deviceInfo.isIOS) {
						this.initSystemIOS();
					}
				} catch (error) {
					console.error('设备判断失败:', error);
				}
			},

			/**
			 * 安卓App定位权限检查
			 * @returns {Promise<boolean>} 是否有权限
			 */
			checkAndroidLocationPermission() {
				return new Promise((resolve) => {
					// #ifdef APP-PLUS
					if (this.deviceInfo.isAndroid) {
						try {
							const main = plus.android.runtimeMainActivity();
							const Manifest = plus.android.importClass('android.Manifest');
							const PermissionChecker = plus.android.importClass(
								'android.content.pm.PackageManager');

							const hasPermission = main.checkSelfPermission(Manifest.permission
								.ACCESS_FINE_LOCATION) === PermissionChecker.PERMISSION_GRANTED;

							if (hasPermission) {
								resolve(true);
								return;
							}

							// 申请权限
							main.requestPermissions([Manifest.permission.ACCESS_FINE_LOCATION], 1001);
							main.onRequestPermissionsResult = (requestCode, permissions, grantResults) => {
								if (requestCode === 1001) {
									resolve(grantResults[0] === PermissionChecker.PERMISSION_GRANTED);
								}
							};
						} catch (error) {
							console.error('Android权限检查失败:', error);
							resolve(false);
						}
					} else {
						resolve(true);
					}
					// #endif
					// #ifndef APP-PLUS
					resolve(true);
					// #endif
				});
			},

			/**
			 * 获取当前位置（兼容多平台）
			 * @param {Object} options 页面参数
			 */
			async InitgetCurrentLocation(options = {}) {
				const getLoc = async () => {
					try {
						const loc = await new Promise((resolve, reject) => {
							uni.getLocation({
								type: 'gcj02',
								success: resolve,
								fail: reject
							});
						});
						await this.InitSharingCode(options, loc);
						return loc;
					} catch (err) {
						const errMsg = err.errMsg?.includes('auth') ?
							'位置权限已拒绝，请前往设置开启' :
							'获取位置失败';
						this.$showToast(errMsg);
						throw err;
					}
				};

				try {
					if (this.deviceInfo.isMiniProgram && this.deviceInfo.isWechatMini) {
						const authSetting = await new Promise(resolve => {
							uni.getSetting({
								success: res => resolve(res.authSetting)
							});
						});

						if (authSetting['scope.userLocation']) {
							await getLoc();
						} else {
							await new Promise((resolve, reject) => {
								uni.authorize({
									scope: 'scope.userLocation',
									success: resolve,
									fail: () => {
										uni.showModal({
											title: '权限提示',
											content: '需开启位置权限才能使用地图功能',
											confirmText: '去设置',
											success: (r) => {
												if (r.confirm) uni.openSetting();
												reject(new Error('用户拒绝授权'));
											}
										});
									}
								});
							});
							await getLoc();
						}
					} else if (this.deviceInfo.isApp) {
						if (this.deviceInfo.isAndroid) {
							const hasPermission = await this.checkAndroidLocationPermission();
							if (!hasPermission) {
								await new Promise(resolve => {
									uni.showModal({
										title: '权限提示',
										content: '需开启位置权限才能使用地图功能，请前往设置开启',
										confirmText: '去设置',
										success: (res) => {
											if (res.confirm) plus.runtime.openURL('app-settings:');
											resolve();
										}
									});
								});
								return;
							}
						}
						await getLoc();
					} else {
						await getLoc();
					}
				} catch (error) {
					console.error('获取位置失败:', error);
				}
			},

			/**
			 * 获取控车码并设置缓存
			 * @param {Object} evt 页面参数
			 * @param {Object} loc 位置信息
			 */
			async InitSharingCode(evt = {}, loc = {}) {
				try {
					let finalShareCode = evt.scene || evt.query || '';
					let needSetLocation = true;

					if (!finalShareCode) {
						const {
							token = '', mobile = ''
						} = uni.getStorageSync('userKey') ?? {};
						if (token) {
							try {
								const {
									code,
									content
								} = await u_getControlCodeByMobile({
									mobile
								}) || {};
								if (code === 1000 && content) {
									needSetLocation = false;
									let targetCar = null;

									if (Array.isArray(content) && content.length > 1) {
										while (!targetCar) {
											try {
												const {
													tapIndex
												} = await uni.showActionSheet({
													itemList: content.map(car =>
														`${car.vehicleSerialName || ''}${car.vehicleModeName || ''}(${car.platenumber || '未上牌'})`
													),
													showCancel: false,
													mask: true
												});
												targetCar = content[tapIndex];
											} catch (error) {
												this.$showToast('请选择一辆车辆', 'none', 1500);
											}
										}
									} else {
										targetCar = Array.isArray(content) ? content[0] : content;
									}
									finalShareCode = targetCar?.controlcode || uni.getStorageSync('scene') || '';
								}
							} catch (err) {
								console.error('接口获取分享码失败，降级缓存：', err);
								finalShareCode = uni.getStorageSync('scene') || '';
							}
						} else {
							finalShareCode = uni.getStorageSync('scene') || '';
						}
					} else {
						needSetLocation = false;
					}

					if (finalShareCode) {
						this.shareCode = finalShareCode;
						this.handleSearchLink(finalShareCode);
						uni.setStorageSync('scene', finalShareCode);
					} else if (needSetLocation && loc.latitude && loc.longitude) {
						this.latitude = loc.latitude;
						this.longitude = loc.longitude;
					}
				} catch (error) {
					console.error('处理分享码失败:', error);
				}
			},

			/**
			 * 获取车辆位置
			 * @param {string} code 分享码
			 */
			handleSearchLink(code) {
				u_getCarPoisitonByCode({
						code
					})
					.then(res => {
						if (res?.code !== 1000) return;

						const carData = res.content || {};
						this.rentCompany = carData.rentCompany || {};

						// 解构赋值简化代码
						const {
							latitude,
							longitude,
							plateNumber,
							address,
							showtime,
							uploadImgUrl,
							uploadImgUrlFive,
							uploadImgUrlFour,
							uploadImgUrlThree,
							uploadImgUrlTwo,
							sn,
							idc,
							blueKey,
							deviceType
						} = carData;

						// 赋值业务数据
						Object.assign(this, {
							...carData,
							current_latitude: latitude,
							current_longitude: longitude,
							latitude,
							longitude,
							sn,
							idc,
							blueKey,
							deviceType,
							g_images: [uploadImgUrl, uploadImgUrlFive, uploadImgUrlFour, uploadImgUrlThree,
								uploadImgUrlTwo
							]
						});

						// 设置地图标记
						this.markers = [{
							id: 1,
							latitude,
							longitude,
							title: plateNumber,
							iconPath: '/static/images/car_icon.png',
							width: 20,
							height: 43,
							callout: {
								content: `${plateNumber || ''}\n当前位置：${address || '未知'}\n定位时间：${showtime || '未知'}`,
								display: 'ALWAYS',
								padding: 8
							}
						}];
					})
					.catch(err => console.error('获取车辆位置失败:', err));
			},

			/**
			 * 切换网络/蓝牙模式
			 * @param {number} mode 模式类型
			 */
			handleControl(mode) {
				if (mode === this.currentMode) return;

				this.currentMode = mode;

				if (mode === MODE_TYPES.NETWORK) {
					this.$showToast('已经切换成网络控车模式');
					bleManager.releaseBle();
				} else if (mode === MODE_TYPES.BLUETOOTH) {
					this.$showToast('已经切换成蓝牙控车模式');
				}
			},

			/**
			 * 车辆控制核心逻辑（开锁/关锁/寻车）
			 * @param {number} type 控制类型
			 */
			handleFooterBtn(type) {
				if (!this.shareCode) {
					this.$showToast('无可用车辆');
					return;
				}

				// 安全的loading管理
				const loading = {
					showed: false,
					show() {
						try {
							uni.showLoading({
								title: '正在控制...',
								mask: true
							});
							this.showed = true;
						} catch (e) {
							console.warn('显示加载失败:', e);
						}
					},
					hide() {
						if (this.showed) {
							try {
								uni.hideLoading();
							} catch (e) {
								console.warn('隐藏加载失败:', e);
							} finally {
								this.showed = false;
							}
						}
					}
				};

				loading.show();

				if (!this.sn) {
					this.$showToast('未找到有效设备标识');
					loading.hide();
					return;
				}

				const {
					currentMode: controlType
				} = this;

				// 蓝牙模式
				if (controlType === MODE_TYPES.BLUETOOTH) {
					uni.showModal({
						title: '温馨提示',
						content: '蓝牙模式响应存在轻微延迟，为确保正常使用，请勿快速重复操作。',
						showCancel: false,
						success: () => this.handleExecuteBluetooth(type)
					});
					loading.hide();
					return;
				}

				// 网络模式
				if (controlType === MODE_TYPES.NETWORK) {
					u_operation({
							operationType: type,
							sn: this.sn
						})
						.then(res => {
							loading.hide();
							if (res?.code === 1000) {
								const successMsg = type === BTN_TYPES.FIND_CAR ?
									'寻车成功，请注意附近鸣笛车辆!' :
									'控制成功!';
								this.$showToast(successMsg);
							} else {
								this.$showToast(res?.msg || '请求失败');
							}
						})
						.catch(err => {
							loading.hide();
							this.$showToast(err.message || '网络请求异常');
						});
				} else {
					loading.hide();
				}
			},

			/**
			 * 蓝牙控制车辆
			 * @param {number} type 控制类型
			 */
			handleExecuteBluetooth(type) {
				// 指令映射表
				const COMMAND_MAPPING = {
					[BTN_TYPES.FIND_CAR]: 5,
					[BTN_TYPES.LOCK]: (this.deviceType === 'F1' || this.deviceType === 'F0') ? 4 : 3,
					[BTN_TYPES.UNLOCK]: this.deviceType === 'F1' ? 1 : 2
				};

				// 蓝牙状态处理器
				const bluetoothHandler = (state) => {
					const handlers = {
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_PRE_EXECUTE]: () => {
							uni.showLoading({
								title: '指令执行中...',
								icon: 'none'
							});
						},
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR]: uni.hideLoading,
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ADAPTER_UNAVAILABLE]: () => {
							uni.hideLoading();
							this.$showToast('请打开蓝牙');
						},
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NOT_FOUND]: uni.hideLoading,
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_CONNECT_FAILED]: () => {
							uni.hideLoading();
							this.$showToast('蓝牙连接失败，请重试!');
						},
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_UNSUPPORTED]: () => {
							uni.hideLoading();
							this.$showToast('您的手机不支持低功耗蓝牙');
						},
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_SEND_FAILED]: () => {
							uni.hideLoading();
							this.$showToast('数据发送失败，请重试!');
						},
						[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NO_RESPONSE]: () => {
							uni.hideLoading();
							this.$showToast('设备超时无响应，请重试!');
						}
					};
					handlers[state]?.();
				};

				// 指令回调处理
				const commandCallback = (data) => {
					uni.hideLoading();
					if (data.controlType === 4) {
						this.$showToast(data.result);
						if (data.result.includes('控制成功')) {
							// 上传服务器逻辑
						}
					}
				};

				try {
					const command = COMMAND_MAPPING[type];
					if (typeof command === 'undefined') return;

					const deviceId = this.idc || `19${this.sn}`;
					bleManager.sendData(deviceId, this.blueKey, command, bluetoothHandler, commandCallback);
				} catch (error) {
					console.error('蓝牙指令发送失败:', error);
					uni.hideLoading();
					this.$showToast('蓝牙控制失败，请重试');
				}
			},

			/**
			 * 归还车辆
			 */
			handleReturningVehicles() {
				if (!this.shareCode) {
					this.$showToast('无可用车辆');
					return;
				}
				uni.navigateTo({
					url: `/pages/returnPhotos/index?code=${this.shareCode}`
				});
			},

			/**
			 * 查看车辆照片
			 */
			handleViewPhotos() {
				if (!this.shareCode) {
					this.$showToast('无可用车辆');
					return;
				}

				// 处理图片链接并过滤空值
				const images = this.g_images
					.filter(Boolean)
					.map(ele => `${this.c_fin3_link}${ele.replace(/\\/g, "/")}`);

				if (images.length === 0) {
					this.$showToast('暂无照片可查看');
					return;
				}

				uni.previewImage({
					urls: images,
					fail: (err) => {
						console.error('图片预览失败：', err);
						this.$showToast('图片预览失败');
					}
				});
			},

			/**
			 * 地图区域变化监听
			 * @param {Object} evt 事件对象
			 */
			handleOnMapRegionChange(evt) {
				try {
					const {
						latitude,
						longitude
					} = evt?.detail?.centerLocation || {};
					if (latitude && longitude && (latitude !== this.latitude || longitude !== this.longitude)) {
						this.latitude = latitude;
						this.longitude = longitude;
					}
				} catch (error) {
					console.error('地图区域变化处理失败:', error);
				}
			},

			/**
			 * 定位到当前位置
			 * @returns {Promise} 定位结果
			 */
			handleCenterLocation() {
				return new Promise((resolve, reject) => {
					uni.getLocation({
						type: 'gcj02',
						success: (res) => {
							this.latitude = res.latitude;
							this.longitude = res.longitude;
							this.$showToast('已定位到当前位置');
							resolve(res);
						},
						fail: (err) => {
							const errMsg = `定位失败：${err.errMsg}`;
							this.$showToast(errMsg);
							reject(new Error(errMsg));
						}
					});
				});
			},

			/**
			 * 导航到车辆位置
			 */
			async handleRoutePlan() {
				if (!this.shareCode) {
					this.$showToast('无可用车辆');
					return;
				}

				try {
					await this.handleCenterLocation();
					const latitude = Number(this.current_latitude);
					const longitude = Number(this.current_longitude);

					if (!latitude || !longitude) {
						this.$showToast('暂无车辆位置信息');
						return;
					}

					uni.openLocation({
						latitude,
						longitude,
						scale: 18,
						fail: (err) => {
							console.error('打开位置失败', err);
							this.$showToast('导航失败，请检查定位权限', 'none', 3000);
						}
					});
				} catch (error) {
					console.error('导航异常:', error);
				}
			},

			/**
			 * 处理登录/个人中心跳转
			 */
			handleLogin() {
				const navMethod = this.login_status ? 'navigateTo' : 'redirectTo';
				const url = this.login_status ? '/pages/userCenter/index' : '/pages/login/index';

				uni[navMethod]({
					url
				});
			},

			/**
			 * 初始化登录状态
			 */
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

			/**
			 * 地图点击事件
			 * @param {Object} e 事件对象
			 */
			handleMapClick(e) {
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

	/* 头部导航栏 */
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
		font-weight: 600;
		font-size: 20px;
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

	/* 左上角控件 */
	.top-left-controls {
		position: absolute;
		top: 16px;
		left: 16px;
		z-index: 999;
	}

	/* 右上角联系我们 */
	.top-right-controls {
		position: absolute;
		top: 16px;
		right: 16px;
		z-index: 999;
	}

	.contact-btn {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.95);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-direction: column;
	}

	.contact-btn:active {
		transform: scale(0.95);
		opacity: 0.9;
	}

	.contact-img {
		width: 24px;
		height: 24px;
	}

	.contact-text {
		font-size: 12px;
		font-weight: bold;
	}

	.control-card {
		background: rgba(255, 255, 255, 0.92);
		border-radius: 12px;
		padding: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 35px;
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

	/* 底部控制栏 */
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

	.control-btn.primary .btn-img {
		filter: invert(1);
	}

	.btn-text {
		font-size: 14px;
		font-weight: 500;
		text-align: center;
	}

	/* 深色模式适配 */
	@media (prefers-color-scheme: dark) {
		.control-card {
			background: rgba(30, 30, 30, 0.92);
		}

		.mode-item.active {
			background: #1e40af;
		}

		.contact-btn,
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