<template>
	<view class="container">
		<!-- 美化后的头部导航栏 -->
		<view class="header">
			<view class="header-container">
				<view class="header-left">
					<text class="header-title">应急开关锁</text>
				</view>
			</view>
		</view>

		<!-- 车辆信息卡片 -->
		<view class="vehicle-card">
			<!-- 车牌与提示信息 -->
			<view class="license-plate-section">
				<view class="license-plate-container">
					<text class="license-plate" v-if="plateNumber">{{plateNumber}}</text>
					<text class="license-plate bind-vehicle" @click="handleBindVechi" v-else>京A00000</text>
				</view>
			</view>
		</view>

		<!-- 控制功能区 - 每行3个大按钮 -->
		<view class="control-section">
			<view class="title-bold">手动操作</view>
			<view class="control-grid">
				<view class="control-item" id="3" @click="handleFooterBtn">
					<view class="control-icon">
						<icon type="info" size="20" color="#999991" />
					</view>
					<text class="control-name">开锁</text>
				</view>
				<view class="control-item" id="1" @click="handleFooterBtn">
					<view class="control-icon">
						<icon type="info" size="20" color="#999991" />
					</view>
					<text class="control-name">关锁</text>
				</view>
				<view class="control-item" id="5" @click="handleFooterBtn">
					<view class="control-icon">
						<icon type="info" size="20" color="#999991" />
					</view>
					<text class="control-name">寻车</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import bleManager from '@/utils/BleKeyFun-utils-single.js';

	export default {
		data() {
			return {
				sn: '',
				blueKey: '',
				idc: '',
				plateNumber: '',
				hasJumped: false // 防止重复跳转
			}
		},
		onLoad(options) {
			// 一进页面就开启实时网络监听
			this.startNetworkListener();
		},
		onShow() {
			const networkBlue = uni.getStorageSync('carTempData')
			this.sn = networkBlue?.sn
			this.blueKey = networkBlue?.blueKey
			this.idc = networkBlue?.idc
			this.plateNumber = networkBlue?.plateNumber || ''
		},
		onUnload() {
			// 页面关闭 关闭监听
			uni.offNetworkStatusChange();
		},
		methods: {
			// ==================== 实时网络检测（核心） ====================
			startNetworkListener() {
				uni.onNetworkStatusChange(res => {
					// 有网 + 还没跳 → 立即跳首页
					if (res.isConnected && !this.hasJumped) {
						this.hasJumped = true;
						uni.redirectTo({
							url: "/pages/index/index" // 你的首页路径
						});
					}
				});
			},
			// =============================================================

			$showToast(title, icon = 'none', duration = 2000) {
				uni.showToast({
					title,
					icon,
					duration
				});
			},

			handleFooterBtn(evt) {
				if (!this.sn) {
					this.$showToast('请选择一辆车辆1', 'none', 1500);
					return
				}
				const controlType = Number(evt?.currentTarget?.id) || 0;
				this.handleExecuteBluetooth(controlType)
			},

			handleExecuteBluetooth(type) {
				const COMMAND_MAPPING = {
					5: 5,
					1: this?.data?.deviceType ? 4 : 3,
					3: 1,
					6: 10,
					8: 11
				};

				const BLUETOOTH_HANDLERS = {
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_PRE_EXECUTE]: () => {
						uni.showLoading({
							title: '指令执行中...',
							mask: true
						});
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR]: uni.hideLoading,
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ADAPTER_UNAVAILABLE]: () => {
						this.$showToast('请打开蓝牙');
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NOT_FOUND]: uni.hideLoading,
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_CONNECT_FAILED]: () => {
						this.$showToast('蓝牙连接失败，请重试!');
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_UNSUPPORTED]: () => {
						this.$showToast('您的手机不支持低功耗蓝牙');
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_SEND_FAILED]: () => {
						this.$showToast('数据发送失败，请重试!');
						uni.hideLoading();
					},
					[bleManager.DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NO_RESPONSE]: () => {
						this.$showToast('设备超时无响应，请重试!');
						uni.hideLoading();
					}
				};

				try {
					if (!COMMAND_MAPPING.hasOwnProperty(type)) return;
					const command = COMMAND_MAPPING[type];
					bleManager.sendData(
						this.idc,
						this.blueKey,
						command,
						state => BLUETOOTH_HANDLERS[state]?.(),
						data => {
							uni.hideLoading();
							if (data.controlType === 4) {
								this.$showToast(data.result);
							}
						}
					);
				} finally {}
			},

			handleBindVechi() {}
		}
	}
</script>

<style scoped>
	page {
		background: linear-gradient(to bottom, #abd2fa, #ffffff);
		font-family: 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
		min-height: 100vh;
	}

	.container {
		height: 90vh;
		background: linear-gradient(to bottom, #abd2fa, #ffffff);
		padding: 20rpx;
		padding-top: 40rpx;
		display: flex;
		flex-direction: column;
	}

	.vehicle-card {
		background: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
	}

	.license-plate-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}

	.license-plate-container {
		display: flex;
		gap: 10rpx;
		align-items: center;
	}

	.license-plate {
		font-size: 40rpx;
		font-weight: bold;
		color: #333;
	}

	.control-section {
		background: #fff;
		border-radius: 16rpx;
		padding: 0rpx 30rpx 10rpx 30rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
		display: flex;
		gap: 40rpx;
		flex-direction: column;
	}

	.title-bold {
		font-weight: bold;
		color: #333;
		font-size: 30rpx;
		border-bottom: 1px solid #f0f0f0;
		height: 100rpx;
		display: flex;
		align-items: center;
	}

	.control-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.control-item {
		width: 30%;
		margin-bottom: 30rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.control-icon {
		width: 100rpx;
		height: 100rpx;
		border-radius: 50%;
		background: #f5f5f5;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 15rpx;
	}

	.control-name {
		font-size: 28rpx;
		color: #333;
		text-align: center;
	}

	/* ========== 美化头部导航栏 核心样式 ========== */
	.header {
		/* 适配手机状态栏 */
		padding-top: var(--status-bar-height);
		/* background: linear-gradient(135deg, #4f9fff, #3b8aff); */
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 16rpx;
		margin-bottom: 30rpx;
		/* box-shadow: 0 6rpx 20rpx rgba(79, 159, 255, 0.25); */
		position: relative;
		overflow: hidden;
		color: #333;
	}

	.header-container {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 30rpx;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.header-title {
		color: #333;
		font-weight: 700;
		font-size: 34rpx;
		letter-spacing: 2rpx;
	}
</style>