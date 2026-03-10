<template>
	<view class="container">
		<!-- 登录区域 -->
		<view class="login-area">
			<view class="logo-container fade-in">
				<view class="logo-wrapper">
					<image :src="logoSrc" class="logo-img" mode="aspectFit" />
					<text class="logo-text">智信通wiselink</text>
				</view>
				<text class="slogan">智信通汽车出行技术服务运营提供商</text>
			</view>

			<!-- 登录方式选择 -->
			<view class="radio-container" v-if="hardware">
				<radio-group class="radio-group" @change="radioChange">
					<label class="radio-label">
						<radio value="1" checked color="#4cd964" class="radio-item" />
						<text class="radio-text">手机号登录</text>
					</label>
					<label class="radio-label">
						<radio value="2" color="#4cd964" class="radio-item" />
						<text class="radio-text">账号密码登录</text>
					</label>
				</radio-group>
			</view>

			<!-- 账号密码登录 -->
			<view class="form-container" v-if="type==2">
				<view class="input-group">
					<view class="input-item">
						<view class="input-label">账号</view>
						<input class="input-field" placeholder='请输入账号或手机号' @input='e=>account_value=e.detail.value' />
					</view>
					<view class="input-item">
						<view class="input-label">密码</view>
						<input class="input-field" placeholder='请输入密码' @input='e=>password_value=e.detail.value'
							password />
					</view>
					<view @tap="handleAccountLogin">
						<button class="login-btn">登录</button>
						<text class="login-tip">账号为登录后设定，无账号请使用微信登录</text>
					</view>
				</view>
			</view>

			<!-- 手机号快捷登录 -->
			<view class="wx-login-container" hover-class="button-hover" v-else>
				<button class="wx-login-btn" open-type="getPhoneNumber" hover-class="btn_tapcolor"
					@getphonenumber="handlePhoneQuickLogin">手机号快捷登录</button>
			</view>
		</view>

		<!-- 信息展示区域 -->
		<view class="info-area">
			<view class="info-card">
				<text class="product-name">智钥通</text>
				<view class="desc-text">手机汽车电子钥匙：不怕丢失、性价比高、可魔变多把钥匙，支持分享授权使用；</view>
				<view class="desc-text">请点击 / 长按识别二维码，下载官方 APP！</view>
				<view class="qr-container">
					<image :src="init_qr_code" class="qr-img" @tap="handlePreviewImage" mode="widthFix" />
				</view>
				<view class="contact-info">
					<text class="company-name">智信通·中国北京</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		deviceDetector
	} from '@/utils/ToolClass.js';
	import {
		u_logo,
		u_getQrcodeImg,
		u_wxLogin,
		u_login
	} from '@/api';

	export default {
		name: 'LoginPage',
		data() {
			return {
				account_value: "",
				password_value: "",
				openId: '',
				type: 1,
				init_qr_code: '',
				c_link: 'https://k1sw.wiselink.net.cn/',
				logoSrc: '/assets/images/logo.png',
				hardware: true, //是否为小程序
			};
		},
		onLoad(options) {
			// 隐私授权检查
			uni.requirePrivacyAuthorize({
				success: () => {},
				fail: () => {}
			});
			this.openId = options.openId || '';
		},
		onShow() {
			this.initLogo();
			this.initQrCode();
			this.InitDetermineEquipment()
		},
		methods: {
			/************************ 基础通用方法 ************************/
			// 判断当前设备参数
			InitDetermineEquipment() {
				const deviceInfo = deviceDetector.getDeviceInfo();

				if (!(deviceInfo.isMiniProgram && deviceInfo.isWechatMini)) { //小程序环境

					this.type = 2,
						this.hardware = false
				}
			},

			// 预览二维码
			handlePreviewImage() {
				uni.previewImage({
					urls: [this.init_qr_code],
					current: this.init_qr_code
				});
			},

			// 初始化资源
			async initLogo() {
				const res = await u_logo();
				if (res?.code == 1000) this.logoSrc = `${this.c_link}/img/${res?.content?.img}`;
			},

			// 初始化请求二维码
			async initQrCode() {
				const res = await u_getQrcodeImg();
				if (res?.code == 1000) {
					this.init_qr_code = res?.content?.img || '';
				}
			},

			// 切换登录方式
			radioChange(e) {
				this.type = e.detail.value;
			},

			/************************ 手机号快捷登录（独立模块） ************************/
			// 手机号快捷登录入口
			handlePhoneQuickLogin(e) {
				// 先获取微信登录凭证
				uni.login({
					success: (loginRes) => this.handlePhoneLoginSuccess(loginRes, e),
					fail: () => this.showLoginError('获取登录凭证失败，请检查网络后重试')
				});
			},

			// 手机号登录-获取凭证成功处理
			handlePhoneLoginSuccess(loginRes, phoneEvt) {
				// 检查登录凭证
				if (!loginRes.code) {
					return this.showLoginError('无法获取登录凭证，请重试');
				}

				// 检查手机号授权码
				if (!phoneEvt.detail?.code) {
					return this.showLoginError('请授权手机号后再登录');
				}

				// 调用手机号登录接口
				this.requestPhoneLogin(loginRes.code, phoneEvt.detail.code);
			},

			// 手机号登录-接口请求
			requestPhoneLogin(wxCode, phoneCode) {
				u_wxLogin({
					code: phoneCode,
					wxCode: wxCode
				}).then(res => {
					if (!res?.content) {
						return this.showLoginError('用户信息获取失败，请重试');
					}
					this.handleLoginSuccess(res.content);
				}).catch(() => {
					this.showLoginError('操作失败，请检查网络后重试');
				});
			},

			/************************ 账号密码登录（独立模块） ************************/
			// 账号密码登录入口
			handleAccountLogin() {
				// 表单验证
				if (!this.validateAccountForm()) return;

				this.prepareAccountLogin()
			},

			// 账号密码登录-表单验证
			validateAccountForm() {
				if (!this.account_value) {
					uni.showToast({
						title: '请输入账号',
						icon: 'none',
						duration: 2000
					});
					return false;
				}

				if (!this.password_value) {
					uni.showToast({
						title: '请输入密码',
						icon: 'none',
						duration: 2000
					});
					return false;
				}

				return true;
			},

			// 账号密码登录-准备登录（存储URL配置）
			prepareAccountLogin() {
				// 基础URL配置
				const k1swUrl = this.account_value == 'dzdemotest' ? 'https://k1swtest.wiselink.net.cn/' :
					'https://k3a.wiselink.net.cn/';
				const fin3Url = 'https://fin3.wiselink.net.cn/fin/';
				const app = getApp?.() || getApp({
					allowDefault: true
				});
				const g = app?.globalData;

				// 存储基础URL
				this.saveBaseUrlConfig(g, k1swUrl, fin3Url);

				// 发起登录请求
				this.requestAccountLogin();
			},

			// 账号密码登录-存储基础URL配置
			saveBaseUrlConfig(globalData, k1swUrl, fin3Url) {
				['k1swUrlKey', 'fin3UrlKey'].forEach((key, i) => {
					uni.setStorage({
						key: globalData[key],
						data: [k1swUrl, fin3Url][i],
						success: () => {
							globalData[[key.replace('Key', ''), key.replace('Key', '')][i]] = [k1swUrl,
								fin3Url
							][i];
						},
						fail: () => {
							this.showLoginError('本地数据处理失败，请重新登录！');
						}
					});
				});
			},

			// 账号密码登录-接口请求
			requestAccountLogin() {
				uni.showLoading({
					title: '正在加载中…',
					mask: true
				});

				u_login({
					username: this.account_value,
					password: this.password_value,
					type: this.type
				}).then(res => {
					uni.hideLoading();
					if (!(res?.code == 1000)) {
						return this.showLoginError(res?.msg || '登录失败，请重试');
					}
					this.handleLoginSuccess(res.content);
				}).catch(() => {
					uni.hideLoading();
					this.showLoginError('登录请求失败，请检查网络');
				});
			},

			/************************ 通用辅助方法 ************************/
			// 显示登录错误提示
			showLoginError(message) {
				uni.showModal({
					title: '提示',
					content: message,
					showCancel: false
				});
			},

			// 登录成功统一处理（核心复用逻辑）
			handleLoginSuccess(userInfo) {
				const app = getApp?.() || getApp({
					allowDefault: true
				});
				const g = app?.globalData;
				const cfg = {
					k1swUrl: userInfo.username === '13683187039*' ? 'https://k1swtest.wiselink.net.cn/' :
						'https://k3a.wiselink.net.cn/',
					fin3Url: 'https://fin3.wiselink.net.cn/fin/'
				};

				// 批量存储用户数据
				Promise.all([
						new Promise((res, rej) => uni.setStorage({
							key: g.k1swUrlKey,
							data: cfg.k1swUrl,
							success: res,
							fail: rej
						})),
						new Promise((res, rej) => uni.setStorage({
							key: g.fin3UrlKey,
							data: cfg.fin3Url,
							success: res,
							fail: rej
						})),
						new Promise((res, rej) => uni.setStorage({
							key: g.userKey,
							data: userInfo,
							success: res,
							fail: rej
						}))
					]).then(() => {
						uni.redirectTo({
							url: '/pages/index/index'
						});
					})
					.catch(() => {
						this.showLoginError('本地数据处理失败，请重新登录！');
					});
			}
		}
	};
</script>

<style scoped>
	page {
		background-color: #252c3b;
		height: 100%;
	}

	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #252c3b;
	}

	/* 登录区域 */
	.login-area {
		flex: 4;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20rpx 0;
		gap: 40rpx;
	}

	.logo-container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.logo-wrapper {
		display: flex;
		align-items: center;
		gap: 10rpx;
	}

	.logo-img {
		width: 60rpx;
		height: 60rpx;
		border-radius: 22rpx;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
	}

	.logo-text {
		color: white;
		font-size: 32rpx;
	}

	.slogan {
		font-size: 30rpx;
		color: #a3a1a1;
		font-weight: 500;
		margin-top: 20rpx;
	}

	/* 单选按钮 */
	.radio-container {
		width: 92%;
		display: flex;
		justify-content: flex-start;
	}

	.radio-group {
		display: flex;
		gap: 40rpx;
	}

	.radio-label {
		display: flex;
		align-items: center;
	}

	.radio-item {
		transform: scale(0.8);
	}

	.radio-text {
		font-size: 28rpx;
		margin-left: 10rpx;
		color: #fff;
	}

	/* 表单样式 */
	.form-container {
		width: 92%;
		margin: 0 auto;
		transition: all 0.3s ease;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 40rpx;
	}

	.input-item {
		display: flex;
		flex-direction: row;
		height: 90rpx;
		background: white;
		border-radius: 10rpx;
		align-items: center;
	}

	.input-label {
		min-width: 150rpx;
		font-size: 30rpx;
		margin-left: 25rpx;
		color: #a4a4a4;
	}

	.input-field {
		margin-left: 10rpx;
		width: 75%;
		height: 100%;
		text-align: left;
		color: #4a4a4a;
		font-size: 30rpx;
	}

	.login-btn {
		width: 100%;
		background: #4cd964;
		color: white;
	}

	.login-tip {
		color: white;
		font-size: 24rpx;
	}

	/* 微信登录 */
	.wx-login-container {
		width: 96%;
	}

	.wx-login-btn {
		color: #fff;
		font-size: 34rpx;
		font-weight: 500;
		background: #4cd964;
		width: 100%;
	}

	/* 信息展示 */
	.info-area {
		flex: 3;
		padding: 40rpx 20rpx;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}

	.info-card {
		width: 96%;
		background: #fff;
		padding: 30rpx 20rpx;
		border-radius: 16rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	}

	.product-name {
		display: block;
		font-size: 26rpx;
		color: #333;
		margin-bottom: 20rpx;
	}

	.desc-text {
		font-size: 26rpx;
		color: #575658;
	}

	.qr-container {
		display: flex;
		justify-content: center;
		margin: 10rpx 0;
	}

	.qr-img {
		width: 300rpx;
		height: 300rpx;
	}

	.contact-info {
		text-align: center;
		color: #333;
		margin-top: 40rpx;
	}

	.company-name {
		display: block;
		font-size: 24rpx;
		margin-bottom: 16rpx;
	}

	/* 动画与交互 */
	@keyframes fadeIn {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	.fade-in {
		animation: fadeIn 0.6s ease-in;
	}

	.button-hover {
		opacity: 0.9;
	}

	.btn_tapcolor {
		opacity: 0.8;
	}
</style>