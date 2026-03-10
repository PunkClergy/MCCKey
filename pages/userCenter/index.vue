<template>
	<view class="container">
		<!-- 自定义头部 -->
		<view class="custom-header" :style="headerStyle">
			<view class="custom-header-outer-layer">
				<image class="custom-header-outer-layer-image" :src="logoSrc"></image>
				<view class="custom-header-outer-layer-title" v-if="account">{{account}}</view>
				<view class="custom-header-outer-layer-user_name" v-if="mobile">
					<text>{{ mobile }}</text>
				</view>
			</view>
		</view>

		<!-- 滚动内容区 -->
		<scroll-view class="content" scroll-y :style="contentStyle">
			<view class="list-container">
				<view class="list-item" v-for="(item, index) in contentList" :key="item.handleEvent"
					:class="{ last: index === contentList.length - 1 }" @tap="handleItemClick(item)">
					<view class="item-left">
						<image class="item-icon" :src="item.icon" mode="widthFix" />
						<text class="item-text">{{ item.text }}</text>
					</view>
					<image class="arrow-icon" src="/static/images/right_1.png" mode="widthFix" />
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import {
		u_logo,
		u_getControlCodeByMobile
	} from '@/api';
	import 'url-search-params-polyfill';
	export default {
		name: 'UserCenter',
		data() {
			return {
				// 基础配置
				tabBarHeight: 80,
				servicePhone: '400-090-5050',
				baseUrl: 'https://k1sw.wiselink.net.cn/',

				// 响应式数据
				logoSrc: '/assets/images/logo.png',
				account: '',
				mobile: '',

				// 系统信息
				systemInfo: {},
				headerConfig: {
					statusBarHeight: 0,
					navBarHeight: 0,
					capsuleRight: 0
				},

				// 功能列表（语义化命名）
				contentList: [{
						icon: '/static/images/contact.png',
						handleEvent: 'contactUs',
						text: '联系智信通'
					},
					{
						icon: '/static/images/switch.png',
						handleEvent: 'switchAccount',
						text: '切换账号'
					},
					{
						icon: '/static/images/out.png',
						handleEvent: 'signOut',
						text: '退出登录'
					}
				],
				carList: [], //车辆列表
			};
		},
		computed: {
			// 计算属性优化样式绑定
			headerStyle() {
				const {
					statusBarHeight,
					navBarHeight,
					capsuleRight
				} = this.headerConfig;
				return {
					paddingTop: `${statusBarHeight}px`,
					paddingLeft: `${capsuleRight}px`,
					height: `${statusBarHeight + navBarHeight}px`
				};
			},
			contentStyle() {
				return {
					top: '90px',
					bottom: `${this.tabBarHeight}px`
				};
			}
		},
		onShow() {
			this.init();

		},
		methods: {
			async initCodeByMobile() {
				const userStorage = uni.getStorageSync('userKey') || {};
				const mobile = userStorage.mobile || '';
				if (!mobile) {
					console.warn('initCodeByMobile: 手机号为空，跳过控制码请求');
					return;
				}
				const response = await u_getControlCodeByMobile({
					mobile
				});
				if (!response || typeof response !== 'object') {
					console.error('initCodeByMobile: 接口返回格式异常', response);
					return;
				}
				const {
					code,
					content
				} = response;
				const SUCCESS_CODE = 1000;
				const MIN_CONTENT_LENGTH = 2;
				if (code === SUCCESS_CODE && Array.isArray(content) && content.length >= MIN_CONTENT_LENGTH) {
					this.contentList = [{
							icon: '/static/images/contact.png',
							handleEvent: 'vehicles',
							text: '切换车辆'
						},
						...this.contentList,
					];
					this.carList = content
				}
			},
			// 统一初始化入口
			async init() {
				this.getSystemInfo();
				this.getLoginInfo();
				await this.getLogo();
				this.initCodeByMobile()
			},

			// 获取系统信息（精简逻辑）
			getSystemInfo() {
				this.systemInfo = uni.getSystemInfoSync();
				const {
					statusBarHeight,
					screenWidth,
					platform,
					miniProgram
				} = this.systemInfo;
				this.headerConfig.statusBarHeight = statusBarHeight || 0;

				// 小程序适配
				if (miniProgram || (platform === 'devtools' && uni.getMenuButtonBoundingClientRect)) {
					const menuBtn = uni.getMenuButtonBoundingClientRect?.() || {};
					if (menuBtn.width) {
						this.headerConfig.navBarHeight = menuBtn.height + (menuBtn.top - statusBarHeight) * 2;
						this.headerConfig.capsuleRight = screenWidth - (menuBtn.right || screenWidth);
					} else {
						this.headerConfig.navBarHeight = 44;
						this.headerConfig.capsuleRight = 10;
					}
				}
				// App适配
				else if (['ios', 'android'].includes(platform)) {
					this.headerConfig.navBarHeight = platform === 'ios' ? 44 : 48;
					this.headerConfig.capsuleRight = 15;
					// 刘海屏适配
					if (this.systemInfo.safeArea?.top > statusBarHeight) {
						this.headerConfig.statusBarHeight = this.systemInfo.safeArea.top;
					}
				}
			},

			// 获取登录信息（优化存储读取）
			getLoginInfo() {
				try {
					const userInfo = uni.getStorageSync('userKey') || {};
					this.account = userInfo.companyName || userInfo.username || userInfo.mobile || '';
					this.mobile = userInfo.mobile || '';
				} catch (err) {
					console.error('获取用户信息失败:', err);
				}
			},

			// 获取logo（精简逻辑）
			async getLogo() {
				try {
					const res = await u_logo();
					if (res?.code === 1000 && res.content?.img) {
						this.logoSrc = `${this.baseUrl}/img/${res.content.img}`;
					}
				} catch (err) {
					console.error('获取logo失败:', err);
				}
			},

			// 拨打电话（封装复用）
			callPhone(phone) {
				uni.showModal({
					title: '拨打电话',
					content: `是否拨打客服电话：${phone}`,
					confirmText: '拨打',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							uni.makePhoneCall({
								phoneNumber: phone,
								fail: (err) => {
									if (err.errMsg !== 'makePhoneCall:fail cancel') {
										const isWeb = this.systemInfo.platform === 'web';
										const msg = isWeb ?
											`H5端暂不支持直接拨号，请手动拨打：${phone}` :
											'拨号失败，请检查号码或权限';
										uni.showToast({
											title: msg,
											icon: 'none',
											duration: 3000
										});
									}
								}
							});
						}
					}
				});
			},

			// 退出登录（封装复用）
			logout() {
				uni.showModal({
					title: '提示',
					content: '确定退出登录吗？',
					success: (res) => {
						if (res.confirm) {
							try {
								uni.clearStorageSync();
								uni.reLaunch({
									url: '/pages/index/index'
								});
							} catch (e) {
								uni.showToast({
									title: '退出失败',
									icon: 'none'
								});
							}
						}
					}
				});
			},

			// 统一事件处理
			handleItemClick(item) {
				const actionMap = {
					contactUs: () => this.callPhone(this.servicePhone),
					switchAccount: () => uni.navigateTo({
						url: '/pages/login/index'
					}),
					signOut: () => this.logout(),
					vehicles:()=>this.handleSwitchVehicles()
				};
				actionMap[item.handleEvent]?.();
			},

			// 处理切换车辆逻辑，展示车辆列表弹窗，选择后跳转至对应车辆首页
			async handleSwitchVehicles() {
				const carList = this.carList || [];
				if (!Array.isArray(carList) || carList.length === 0) {
					uni.showToast({
						title: '暂无可选车辆',
						icon: 'none',
						duration: 2000
					});
					console.warn('handleSwitchVehicles: 车辆列表为空，终止切换操作');
					return;
				}
				const vehicleItemList = carList.map(car => {
					const serialName = car?.vehicleSerialName || '';
					const modeName = car?.vehicleModeName || '';
					const plateNumber = car?.platenumber || '未上牌';
					const prefix = `${serialName}${modeName}`.trim();
					return prefix ? `${prefix}(${plateNumber})` : `(${plateNumber})`;
				});

				if (vehicleItemList.length === 0) {
					uni.showToast({
						title: '车辆信息异常',
						icon: 'none',
						duration: 2000
					});
					return;
				}

				const sheetRes = await uni.showActionSheet({
					itemList: vehicleItemList,
					showCancel: false,
					mask: true
				});

				if (!sheetRes || typeof sheetRes.tapIndex !== 'number') {
					console.info('handleSwitchVehicles: 用户取消选择车辆');
					return;
				}

				const {
					tapIndex
				} = sheetRes;
				if (tapIndex < 0 || tapIndex >= carList.length) {
					uni.showToast({
						title: '选择车辆异常',
						icon: 'none',
						duration: 2000
					});
					console.error('handleSwitchVehicles: 选中索引超出车辆列表范围', tapIndex, carList.length);
					return;
				}
				const selectedCar = carList[tapIndex];
				const controlCode = selectedCar?.controlcode;
				if (!controlCode) {
					uni.showToast({
						title: '该车辆无控制码，无法切换',
						icon: 'none',
						duration: 2000
					});
					console.warn('handleSwitchVehicles: 选中车辆缺少controlcode', selectedCar);
					return;
				}
				const targetUrl = `/pages/index/index?scene=${encodeURIComponent(controlCode)}`;
				uni.redirectTo({
					url: targetUrl,
					fail: (err) => {
						uni.showToast({
							title: '切换车辆失败',
							icon: 'none',
							duration: 2000
						});
						console.error('handleSwitchVehicles: 页面跳转失败', err, targetUrl);
					}
				});

				console.log('handleSwitchVehicles: 选中车辆信息', selectedCar);
			},
		}
	};
</script>

<style scoped lang="scss">
	// 全局重置
	::-webkit-scrollbar {
		display: none;
	}

	// 页面容器
	.container {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #F3F9FD;
		box-sizing: border-box;
	}


	/* 自定义头部 */
	.custom-header {
		width: 96%;
		position: fixed;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		box-sizing: border-box;
	}

	.custom-header-outer-layer {
		display: flex;
		align-items: flex-end;
		gap: 25rpx;
	}





	.custom-header-outer-layer-image {
		width: 45rpx;
		height: 49rpx;
	}






	.custom-header-outer-layer-title {
		font-weight: bold;
		font-size: 36rpx;
		color: #333;
	}

	.custom-header-outer-layer-user_name {
		display: flex;
		align-items: center;
		gap: 5rpx;
	}

	.custom-header-outer-layer-user_name text {
		font-weight: 500;
		font-size: 28rpx;
		color: #333;
	}

	// 内容区域
	.content {
		position: absolute;
		width: 100%;
		overflow-y: auto;
		box-sizing: border-box;

		.list-container {
			width: 96%;
			margin: 0 auto;

			.list-item {
				height: 100rpx;
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 0 20rpx;
				border-bottom: 1rpx solid #CDD5DA;
				background: #fff;
				border-radius: 20rpx;

				&.last {
					border-bottom: none;
				}

				.item-left {
					display: flex;
					align-items: center;
					gap: 20rpx;

					.item-icon {
						width: 30rpx;
						height: 30rpx;
					}

					.item-text {
						font-size: 28rpx;
						font-weight: bold;
						color: #333;
					}
				}

				.arrow-icon {
					width: 25rpx;
					height: 25rpx;
				}
			}
		}
	}
</style>