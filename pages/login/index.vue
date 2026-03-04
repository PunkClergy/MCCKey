<!-- pages/login/login.vue -->
<template>
	<!-- index.wxml -->
	<view class="container">
		<CustomNavBar title="登录" />
		<!-- 上部分：登录区域 -->
		<view class="login-area">
			<!-- Logo 区域 -->
			<view class="logo-container fade-in">
				<view class="logo-wrapper">
					<image src="/static/public/logo.png" class="logo-img" />
					<text class="logo-text">智信通wiselink</text>
				</view>
				<text class="slogan">智信通汽车出行技术服务运营提供商</text>
			</view>

			<!-- 登录方式选择 -->



			<view class="input-group">
				<view class="input-item">
					<view class="input-label">{{langs.account}}</view>
					<input class="input-field" :placeholder="langs.pleaseaccount" v-model="username" />
				</view>
				<view class="input-item">
					<view class="input-label">{{langs.password}}</view>
					<input class="input-field" :placeholder="langs.pleasepassword" v-model="password" :password="true" />
				</view>
				<view>
					<button class="login-btn" @tap="handleLogin">{{langs.loginnow}}</button>
					<text class="register" @tap="handleRegister">{{langs.signup}}</text>
				</view>
			</view>


		</view>

		<!-- 下部分：信息展示 -->
		<view class="info-area">
			<view class="info-card">
				<text class="product-name">智前通wiselink</text>
				<view style="font-size: 26rpx; color: #575658">商务合作咨询、更多产品了解，请点击、长按官方群二维码，有专属客服服务！</view>
				<view style="display: flex; justify-content: center">
					<image :src="init_qr_code" style="width: 300rpx; height: 300rpx" @tap="handlePreviewImage" />
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
		login,
		u_getQrcodeImg
	} from '@/api';
	import CustomNavBar from "@/components/custom-header/index.vue";
	import {
		langs
	} from '@/utils/i18n/index.js'
	export default {
		data() {
			return {
				username: '',
				password: '',
				isSubmitting: false,
				init_qr_code: '',
				langs: {},
			};
		},
		components: {
			CustomNavBar
		},
		mounted() {
			this.infinityGetQrcodeImg()
		},
		onShow() {
			this.handleGetCurrentLanguage()
		},
		methods: {
			handleGetCurrentLanguage() {
				let currentLang = uni.getStorageSync('lang') || 'zh-CN';
				this.langs = langs[currentLang]
			},
			// 预览图片
			handlePreviewImage(evt) {
				uni.previewMedia({
					sources: [{
						url: this.init_qr_code,
						// 图片路径
						type: 'image'
					}]
				});
			},

			handlePreviewImage() {
				if (this.init_qr_code) {
					uni.previewImage({
						urls: [this.init_qr_code],
						longPressActions: {
							itemList: ['保存图片到相册'],
							success: (data) => {

							}
						}
					});
				}
			},
			async infinityGetQrcodeImg() {
				console.log(111)
				try {
					const response = await u_getQrcodeImg();
					if (response?.code == 1000) {
						this.init_qr_code = response?.content?.img
					}

				} catch (error) {
					uni.showToast({
						title: '查询失败',
						icon: 'none'
					});
				}
			},
			async handleLogin() {
				if (!this.username || !this.password) {
					uni.showToast({
						title: '请输入用户名和密码',
						icon: 'none'
					});
					return;
				}

				this.isSubmitting = true;

				try {
					const response = await login({
						username: this.username,
						password: this.password,
						type: 2
					});

					uni.setStorageSync('token', response.content.token);
					uni.setStorageSync('user_info', response.content);

					// 跳转到首页或其他页面
					uni.reLaunch({
						url: '/pages/index/index'
					});
				} catch (error) {
					uni.showToast({
						title: '登录失败，请检查用户名和密码',
						icon: 'none'
					});
				} finally {
					this.isSubmitting = false;
				}
			},
			handleRegister(){
				uni.navigateTo({
					url:'/pages/register/register'
				})
			}
		}
	};
</script>

<style>
	page {
		background-color: #252c3b;
		height: 100%;
	}

	/* index.wxss */
	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
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
		width: 90%;
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
		width: 100%;
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

	.product-en {
		font-size: 24rpx;
	}

	.core-title {
		display: block;
		font-size: 28rpx;
		color: #2d3436;
		font-weight: 600;
		margin-bottom: 30rpx;
	}

	.function-list {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.function-item {
		display: flex;
		align-items: center;
		padding: 5rpx 0;
		font-size: 24rpx;
		color: #333;
	}

	.function-item::before {
		content: '';
		width: 12rpx;
		height: 12rpx;
		background: #4cd964;
		border-radius: 50%;
		margin-right: 16rpx;
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

	.contact-details {
		font-size: 24rpx;
		line-height: 1;
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

	.register {
		float: right;
		margin-top: 10rpx;
		color: #fff;
		font-size: 26rpx;
	}
</style>