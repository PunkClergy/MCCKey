<template>
	<view class="container">
		<!-- 自定义头部区域 -->
		<view class="custom-header"
			:style="{ paddingTop: height_from_head + 'px', paddingLeft: capsule_distance_to_the_right + 'px', height: head_height + 'px' }">
			<view class="custom-header-outer-layer">
				<image class="custom-header-outer-layer-image" src="/static/images/wifi_1.png"></image>
				<view class="custom-header-outer-layer-title">My</view>
				<view class="custom-header-outer-layer-user_name" v-if="account">
					<text>{{ account }}</text>
				</view>
			</view>
		</view>

		<!-- 中间滚动内容区 -->
		<scroll-view class="content" scroll-y :style="{ top: '90px', bottom: tabBarHeight + 'px' }">
			<view class="my-content-list-container">
				<view class="my-content-list-inner">
					<view v-for="(item, index) in contentList" :key="index" class="my-content-list-item"
						:class="index === contentList.length - 1 ? 'my-content-list-item_last' : ''"
						@tap="handleFunExe(item)">
						<view class="my-content-list-item__left">
							<image :src="'https://k1sw.wiselink.net.cn/img/' + item.iconPath"
								class="my-content-list-item__icon" mode="widthFix" />
							<text class="my-content-list-item__text">{{ item.text }}</text>
						</view>
						<image src="/static/images/home/right_1.png" class="my-content-list-item__arrow"
							mode="widthFix" />
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				// 底部tabbar高度
				tabBarHeight: 80,
				// 功能列表
				contentList: [{
						handleEvent: 'ContactUs',
						text: "联系智信通"
					},
					{
						handleEvent: 'SwitchAccount',
						text: "切换账号"
					},
					{
						handleEvent: 'SignOut',
						text: "退出登录"
					}
				],
				// 客服电话
				servicePhone: '400-090-5050',
				// 头部适配参数
				height_from_head: 0,
				head_height: 0,
				capsule_distance_to_the_right: 0,
				// 账号信息
				account: ''
			}
		},
		methods: {
			// 初始化系统头部信息
			initSystemInfo() {
				const systemInfo = uni.getSystemInfoSync();
				const menuButtonRect = uni.getMenuButtonBoundingClientRect?.();
				if (!menuButtonRect) return;

				const {
					statusBarHeight,
					screenWidth
				} = systemInfo;
				const menuHeight = menuButtonRect.height + (menuButtonRect.top - statusBarHeight) * 2;
				const capsuleRight = screenWidth - menuButtonRect.right;

				this.height_from_head = statusBarHeight;
				this.head_height = statusBarHeight + menuHeight;
				this.capsule_distance_to_the_right = capsuleRight;
			},
			// 拨打客服电话
			makePhoneCall(phoneNumber) {
				uni.showModal({
					title: '拨打电话',
					content: `是否拨打客服电话：${phoneNumber}`,
					confirmText: '拨打',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							uni.makePhoneCall({
								phoneNumber,
								success: () => console.log(`拨打 ${phoneNumber} 成功`),
								fail: (err) => {
									if (err.errMsg !== 'makePhoneCall:fail cancel') {
										const platform = uni.getSystemInfoSync().platform;
										const errorMsg = platform === 'web' ?
											`H5端暂不支持直接拨号，请手动拨打：${phoneNumber}` :
											err.errMsg.includes('system') ?
											'系统权限不足，请开启电话权限后重试' :
											'拨号失败，请检查号码或稍后重试';

										uni.showToast({
											title: errorMsg,
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
			// 功能点击处理
			handleFunExe(item) {
				switch (item.handleEvent) {
					case 'ContactUs':
						this.makePhoneCall(this.servicePhone);
						break;
					case 'SwitchAccount':
						uni.navigateTo({
							url: '/pages/login/index'
						});
						break;
					case 'SignOut':
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
						break;
				}
			},
			// 获取当前登录状态
			initLoginStatus() {
				uni.getStorage({
					key: 'userKey',
					success: res => {
						this.account = res?.data?.companyName || res?.data?.username;
					},
					fail(err) {
						console.error("获取失败", err);
					}
				});
			}
		},
		onShow() {
			this.initLoginStatus()
			this.initSystemInfo();
		}
	}
</script>

<style scoped lang="scss">
	/* 隐藏滚动条 */
	::-webkit-scrollbar {
		width: 0;
		height: 0;
		color: transparent;
	}

	/* 页面容器 */
	.container {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: #F3F9FD;
		background-repeat: no-repeat;
		background-size: cover;
		background-position: center;
		touch-action: pan-x;
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

	/* 内容区域 */
	.content {
		width: 100%;
		position: absolute;
		overflow-y: auto;
		box-sizing: border-box;
	}

	.my-content-list-container {
		width: 96%;
		margin: 0 auto;
	}

	.my-content-list-inner {
		width: 94%;
		background-color: #fff;
		margin: 0 auto;
		border-radius: 20rpx;
		padding: 20rpx;
	}

	.my-content-list-item {
		height: 100rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1rpx solid #CDD5DA;
	}

	.my-content-list-item_last {
		border-bottom: none;
	}

	.my-content-list-item__left {
		display: flex;
		align-items: center;
		gap: 20rpx;
	}

	.my-content-list-item__icon {
		width: 30rpx;
		height: 30rpx;
	}

	.my-content-list-item__text {
		font-weight: bold;
		font-size: 28rpx;
		color: #333;
	}

	.my-content-list-item__arrow {
		width: 25rpx;
		height: 25rpx;
	}
</style>