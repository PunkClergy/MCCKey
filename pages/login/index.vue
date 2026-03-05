<template>
	<view class="container">
		<!-- 登录区域 -->
		<view class="login-area">
			<!-- Logo 区域 -->
			<view class="logo-container fade-in">
				<view class="logo-wrapper">
					<image :src="logoSrc" class="logo-img" mode="aspectFit" />
					<text class="logo-text">智信通wiselink</text>
				</view>
				<text class="slogan">智信通汽车出行技术服务运营提供商</text>
			</view>

			<!-- 登录方式选择 -->
			<view class="radio-container">
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

			<!-- 账号密码登录表单 -->
			<view class="form-container" v-if="type==2">
				<view class="input-group">
					<view class="input-item">
						<view class="input-label">账号</view>
						<input class="input-field" placeholder='请输入账号或手机号' @input='accountInput' />
					</view>
					<view class="input-item">
						<view class="input-label">密码</view>
						<input class="input-field" placeholder='请输入密码' @input='vericodeInput' password />
					</view>
					<view @tap="loginBtnTap">
						<button class="login-btn">登录</button>
						<text class="login-tip">账号为登录后设定，无账号请使用微信登录</text>
					</view>
				</view>
			</view>

			<!-- 手机号快捷登录 -->
			<view class="wx-login-container" hover-class="button-hover" v-else>
				<button class="wx-login-btn" open-type="getPhoneNumber" hover-class="btn_tapcolor"
					@getphonenumber="onGetPhoneNumber">手机号快捷登录</button>
			</view>
		</view>

		<!-- 信息展示区域 -->
		<view class="info-area">
			<view class="info-card">
				<text class="product-name">智前通wiselink</text>
				<view class="desc-text">不怕丢失，高性价比，可以"魔变"无穷把，可以分享授权使用的手机汽车电子钥匙；</view>
				<view class="desc-text">请点击、长按添加官方客服，有专属客服服务！</view>
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
				logoSrc: '/assets/images/login/logo.png'
			};
		},
		onLoad(options) {
			// 隐私授权检查（微信小程序）
			uni.requirePrivacyAuthorize({
				success: () => console.log('用户已同意隐私协议'),
				fail: (err) => console.log('用户拒绝隐私协议', err)
			});

			this.openId = options.openId || '';
			console.log("openID=" + this.openId);
		},
		onShow() {
			this.initLogo();
			this.initQrCode();
		},
		methods: {
			// 预览二维码图片
			handlePreviewImage() {
				uni.previewImage({
					urls: [this.init_qr_code],
					current: this.init_qr_code
				});
			},

			// 手机号快捷登录
			onGetPhoneNumber(e) {
				uni.login({
					success: r => {
						if (!r.code) return uni.showModal({
							title: '提示',
							content: '无法获取登录凭证，请重试',
							showCancel: false
						});
						if (!e.detail?.code) return;
						u_wxLogin({
							code: e.detail.code,
							wxCode: r.code
						}).then(res => {
							if (!res?.content) return uni.showModal({
								title: '提示',
								content: '用户信息获取失败，请重试',
								showCancel: false
							});
							const u = res.content,
								app = getApp?.() || getApp({
									allowDefault: true
								}),
								g = app?.globalData;
							const cfg = {
								k1swUrl: u.username === '13683187039*' ?
									'https://k1swtest.wiselink.net.cn/' :
									'https://k3a.wiselink.net.cn/',
								fin3Url: 'https://fin3.wiselink.net.cn/fin/'
							};
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
										data: u,
										success: res,
										fail: rej
									}))
								]).then(() => uni.redirectTo({
									url: '/pages/index/index'
								}))
								.catch(() => uni.showModal({
									title: '提示',
									content: '本地数据处理失败，请重新登录！',
									showCancel: false
								}));
						}).catch(() => uni.showModal({
							title: '提示',
							content: '操作失败，请检查网络后重试',
							showCancel: false
						}));
					},
					fail: () => uni.showModal({
						title: '提示',
						content: '获取登录凭证失败，请检查网络后重试',
						showCancel: false
					})
				});
			},
			// 初始化二维码
			async initQrCode() {
				const response = await u_getQrcodeImg();
				if (response?.code == 1000) {
					this.logoSrc = `${this.c_link}/img/${response?.content?.img}`;
					this.init_qr_code = response?.content?.img || '';
				}
			},

			// 初始化logo
			async initLogo() {
				const response = await u_logo();
				if (response?.code == 1000) {
					this.logoSrc = `${this.c_link}/img/${response?.content?.img}`;
				}
			},

			// 账号输入
			accountInput(e) {
				this.account_value = e.detail.value;
			},

			// 密码输入
			vericodeInput(e) {
				this.password_value = e.detail.value;
			},

			// 登录按钮点击
			loginBtnTap() {
				if (!this.account_value) {
					uni.showToast({
						title: '请输入账号',
						icon: 'none',
						duration: 2000
					});
					return;
				}

				if (!this.password_value) {
					uni.showToast({
						title: '请输入密码',
						icon: 'none',
						duration: 2000
					});
					return;
				}

				this.loginPre();
			},

			// 登录前置处理
			loginPre() {
				uni.login({
					success: (res) => res.code && this.loginRequest(res.code),
					complete: () => uni.hideLoading()
				});
			},

			// 登录请求
			loginRequest(code) {
				// 配置URL
				let k1swUrl = "https://k3a.wiselink.net.cn/";
				const fin3Url = "https://fin3.wiselink.net.cn/fin/";
				if (this.account_value == 'dzdemotest') k1swUrl = "https://k1swtest.wiselink.net.cn/";

				const g = getApp?.() || getApp({
					allowDefault: true
				})
				const app = g?.globalData;
				// 存储URL配置
				uni.setStorage({
					key: app.k1swUrlKey,
					data: k1swUrl,
					success: () => app.k1swUrl = k1swUrl,
					fail: () => uni.showModal({
						title: '提示',
						content: '本地数据处理失败，请重新登录！',
						showCancel: false
					})
				});

				uni.setStorage({
					key: app.fin3UrlKey,
					data: fin3Url,
					success: () => app.fin3Url = fin3Url,
					fail: () => uni.showModal({
						title: '提示',
						content: '本地数据处理失败，请重新登录！',
						showCancel: false
					})
				});

				// 显示加载中
				uni.showLoading({
					title: '正在加载中…',
					mask: true
				});
				u_login({
					username: this.account_value,
					password: this.password_value,
					code: code,
					type: this.type
				}).then(res => {
					console.log(res)

					if (!(res?.code == 1000)) return uni.showModal({
						title: '提示',
						content: res?.msg,
						showCancel: false
					});
					const u = res.content,
						app = getApp?.() || getApp({
							allowDefault: true
						}),
						g = app?.globalData;
					const cfg = {
						k1swUrl: u.username === '13683187039*' ?
							'https://k1swtest.wiselink.net.cn/' : 'https://k3a.wiselink.net.cn/',
						fin3Url: 'https://fin3.wiselink.net.cn/fin/'
					};
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
								data: u,
								success: res,
								fail: rej
							}))
						]).then(() => uni.redirectTo({
							url: '/pages/index/index'
						}))
						.catch(() => uni.showModal({
							title: '提示',
							content: '本地数据处理失败，请重新登录！',
							showCancel: false
						}));
				})

			},

			// 切换登录方式
			radioChange(e) {
				this.type = e.detail.value;
			}
		}
	};
</script>

<style scoped>
	page {
		background-color: #252c3b;
		height: 100%;
	}

	/* 容器样式 */
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

	/* 单选按钮组 */
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

	.wx-login-container {
		width: 96%;
	}

	/* 微信登录按钮 */
	.wx-login-btn {
		color: #fff;
		font-size: 34rpx;
		font-weight: 500;
		background: #4cd964;
		width: 100%;
	}

	/* 信息展示区域 */
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

	/* 动画 */
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

	/* 交互状态 */
	.button-hover {
		opacity: 0.9;
	}

	.btn_tapcolor {
		opacity: 0.8;
	}
</style>