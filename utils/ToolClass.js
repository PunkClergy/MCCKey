/**
 * 支持判断：小程序/安卓App/iOS App/平板/PC/H5/微信/支付宝/抖音小程序等
 */
export const deviceDetector = {
	/**
	 * 获取基础设备信息
	 * @returns {Object} 设备信息对象
	 */
	getDeviceInfo() {
		// 获取系统基础信息
		const systemInfo = uni.getSystemInfoSync();
		const {
			platform,
			model,
			screenWidth,
			screenHeight
		} = systemInfo;

		// 初始化检测结果
		const result = {
			// 基础信息
			systemInfo,
			// 运行环境类型
			isMiniProgram: false, // 是否小程序
			isApp: false, // 是否App（安卓/iOS）
			isH5: false, // 是否H5
			isPC: false, // 是否PC端
			// 设备类型
			isAndroid: false, // 是否安卓设备
			isIOS: false, // 是否iOS设备
			isIPad: false, // 是否iPad
			isTablet: false, // 是否平板（通用）
			// 小程序类型
			isWechatMini: false, // 是否微信小程序
			isAlipayMini: false, // 是否支付宝小程序
			isDouyinMini: false, // 是否抖音/头条小程序
			// 屏幕尺寸
			screenType: 'small', // small/medium/large/xlarge
			screenWidth,
			screenHeight
		};

		// ========== 1. 判断运行环境（小程序/App/H5/PC） ==========
		// #ifdef MP-WEIXIN
		result.isMiniProgram = true;
		result.isWechatMini = true;
		// #endif

		// #ifdef MP-ALIPAY
		result.isMiniProgram = true;
		result.isAlipayMini = true;
		// #endif

		// #ifdef MP-TOUTIAO
		result.isMiniProgram = true;
		result.isDouyinMini = true;
		// #endif

		// #ifdef APP-PLUS
		result.isApp = true;
		// #endif

		// #ifdef H5
		result.isH5 = true;
		// H5端进一步判断是否PC
		const userAgent = navigator.userAgent.toLowerCase();
		if (userAgent.includes('windows') || userAgent.includes('macintosh') || userAgent.includes('linux')) {
			result.isPC = true;
		}
		// #endif

		// ========== 2. 判断设备系统（安卓/iOS/平板） ==========
		// App/小程序端判断
		if (platform === 'android') {
			result.isAndroid = true;
			// 判断安卓平板（通过屏幕尺寸和比例）
			if (screenWidth >= 768 && screenHeight / screenWidth < 1.5) {
				result.isTablet = true;
			}
		} else if (platform === 'ios') {
			result.isIOS = true;
			// 判断iPad
			if (model && model.toLowerCase().includes('ipad')) {
				result.isIPad = true;
				result.isTablet = true;
			} else if (screenWidth >= 768) {
				result.isTablet = true;
			}
		}

		// H5端补充判断（App/H5通用）
		if (result.isH5) {
			const userAgent = navigator.userAgent.toLowerCase();
			if (userAgent.includes('android')) {
				result.isAndroid = true;
				if (screenWidth >= 768) result.isTablet = true;
			} else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
				result.isIOS = true;
				if (userAgent.includes('ipad')) {
					result.isIPad = true;
					result.isTablet = true;
				} else if (screenWidth >= 768) {
					result.isTablet = true;
				}
			}
		}

		// ========== 3. 判断屏幕尺寸类型 ==========
		// 以宽度为基准（px）
		if (screenWidth < 375) {
			result.screenType = 'small'; // 小屏手机（如iPhone SE）
		} else if (screenWidth >= 375 && screenWidth < 414) {
			result.screenType = 'medium'; // 中屏手机（如iPhone 12/13）
		} else if (screenWidth >= 414 && screenWidth < 768) {
			result.screenType = 'large'; // 大屏手机（如华为Mate系列）
		} else {
			result.screenType = 'xlarge'; // 平板/PC
		}

		return result;
	},

	/**
	 * 快捷判断：是否为小程序
	 * @returns {Boolean}
	 */
	isMiniProgram() {
		return this.getDeviceInfo().isMiniProgram;
	},

	/**
	 * 快捷判断：是否为App
	 * @returns {Boolean}
	 */
	isApp() {
		return this.getDeviceInfo().isApp;
	},

	/**
	 * 快捷判断：是否为安卓设备
	 * @returns {Boolean}
	 */
	isAndroid() {
		return this.getDeviceInfo().isAndroid;
	},

	/**
	 * 快捷判断：是否为iOS设备
	 * @returns {Boolean}
	 */
	isIOS() {
		return this.getDeviceInfo().isIOS;
	},

	/**
	 * 快捷判断：是否为平板
	 * @returns {Boolean}
	 */
	isTablet() {
		return this.getDeviceInfo().isTablet;
	},

	/**
	 * 快捷判断：是否为PC端
	 * @returns {Boolean}
	 */
	isPC() {
		return this.getDeviceInfo().isPC;
	}
};