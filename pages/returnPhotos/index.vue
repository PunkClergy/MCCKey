<template>
  <view>
    <image class="bg-img" src="/static/images/background.jpg"></image>

    <view class="container">
      <view class="page_title">点击上传照片</view>

      <scroll-view scroll-y :style="{ height: showHeight + 'px', marginTop: '20rpx' }" :scroll-y="canScroll">
        <button 
          id="1" 
          :style="{ 
            height: (750 - 2 * leftGap) / 1.6 + 'rpx', 
            width: 750 - 2 * leftGap + 'rpx', 
            lineHeight: (750 - 2 * leftGap) / 1.6 + 'rpx' 
          }" 
          class="info-btn1" 
          hover-class="btn_tapcolor" 
          @tap="inputCardBtnTap"
        >
          <image class="arrow" mode="aspectFill" :src="firstTempFilePaths[0] || ''"></image>
          <text>车头照片</text>
        </button>

        <button 
          id="2" 
          :style="{ 
            height: (750 - 2 * leftGap) / 1.6 + 'rpx', 
            width: 750 - 2 * leftGap + 'rpx', 
            lineHeight: (750 - 2 * leftGap) / 1.6 + 'rpx' 
          }" 
          class="info-btn" 
          hover-class="btn_tapcolor" 
          @tap="inputCardBtnTap"
        >
          <text>车尾照片</text>
          <image class="arrow" mode="aspectFill" :src="secondTempFilePaths[0] || ''"></image>
        </button>

        <button 
          id="3" 
          :style="{ 
            height: (750 - 2 * leftGap) / 1.6 + 'rpx', 
            width: 750 - 2 * leftGap + 'rpx', 
            lineHeight: (750 - 2 * leftGap) / 1.6 + 'rpx' 
          }" 
          class="info-btn" 
          hover-class="btn_tapcolor" 
          @tap="inputCardBtnTap"
        >
          <text>车身左侧照片</text>
          <image class="arrow" mode="aspectFill" :src="thirdTempFilePaths[0] || ''"></image>
        </button>

        <button 
          id="4" 
          :style="{ 
            height: (750 - 2 * leftGap) / 1.6 + 'rpx', 
            width: 750 - 2 * leftGap + 'rpx', 
            lineHeight: (750 - 2 * leftGap) / 1.6 + 'rpx' 
          }" 
          class="info-btn" 
          hover-class="btn_tapcolor" 
          @tap="inputCardBtnTap"
        >
          <text>车身右侧照片</text>
          <image class="arrow" mode="aspectFill" :src="fourthTempFilePaths[0] || ''"></image>
        </button>

        <button 
          id="5" 
          :style="{ 
            height: (750 - 2 * leftGap) / 1.6 + 'rpx', 
            width: 750 - 2 * leftGap + 'rpx', 
            lineHeight: (750 - 2 * leftGap) / 1.6 + 'rpx' 
          }" 
          class="info-btn" 
          hover-class="btn_tapcolor" 
          @tap="inputCardBtnTap"
        >
          <text>车钥匙位置照片</text>
          <image class="arrow" mode="aspectFill" :src="fifthTempFilePaths[0] || ''"></image>
        </button>
      </scroll-view>

      <button 
        class="submit_btn" 
        hover-class="btn_tapcolor" 
        @tap="submitBtnTap"
      >
        提交并完成
      </button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'UploadPhoto',
  data() {
    return {
      showHeight: 0,
      cardWidth: 0,
      showPhoneHeight: 0,
      showPhoneWidth: 0,
      canScroll: true,
      firstTempFilePaths: [],
      secondTempFilePaths: [],
      thirdTempFilePaths: [],
      fourthTempFilePaths: [],
      fifthTempFilePaths: [],
      leftGap: 40,
      uploadTask: null,
      code: '',
      showType: 0,
      currentViewType: 0,
      currentCardType: 0
    };
  },
  onReady() {
    // 获取系统信息
    uni.getSystemInfo({
      success: (res) => {
        this.showPhoneHeight = res.windowHeight;
        this.showPhoneWidth = res.windowWidth;
        this.showHeight = res.windowHeight - res.windowWidth / 750 * (70 + 130);
        this.cardWidth = res.windowWidth - res.windowWidth / 750 * (750 - 80);
      }
    });
  },
  onLoad(options) {
    this.showType = options.type || 0;
    this.code = options.code || '';
  },
  onShow() {
    this.currentViewType = 0;
    this.currentCardType = 0;
  },
  methods: {
    /**
     * 显示提示框
     */
    showToast(msg) {
      uni.showToast({
        title: msg,
        icon: 'none',
        duration: 2000
      });
    },

    /**
     * 显示加载框
     */
    showLoading(msg) {
      uni.showLoading({
        title: msg,
        mask: true
      });
    },

    /**
     * 隐藏加载框
     */
    hideLoading() {
      uni.hideLoading();
    },

    /**
     * 显示模态框
     */
    showModal(msg, showCancel, callback) {
      uni.showModal({
        title: '提示',
        content: msg,
        showCancel: showCancel || false,
        success: (res) => {
          if (callback) {
            callback(res.confirm);
          }
        }
      });
    },

    /**
     * 判断是否为空
     */
    isEmpty(obj) {
      return typeof obj === "undefined" || obj === null || obj === "" || !obj;
    },

    /**
     * 上传图片按钮点击 - 原生拍照/选图
     */
    inputCardBtnTap(e) {
      const viewType = e.currentTarget.id;
      
      // 原生选择图片/拍照
      uni.chooseImage({
        count: 1, // 仅选择1张
        sizeType: ['original', 'compressed'], // 原图/压缩图
        sourceType: ['album', 'camera'], // 相册/相机
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          
          // 根据按钮ID更新对应图片路径
          switch(viewType) {
            case '1':
              this.firstTempFilePaths = [tempFilePath];
              break;
            case '2':
              this.secondTempFilePaths = [tempFilePath];
              break;
            case '3':
              this.thirdTempFilePaths = [tempFilePath];
              break;
            case '4':
              this.fourthTempFilePaths = [tempFilePath];
              break;
            case '5':
              this.fifthTempFilePaths = [tempFilePath];
              break;
          }
          
          this.showToast('图片选择成功！');
        },
        fail: (err) => {
          console.error('选择图片失败:', err);
          if (err.errMsg.includes('auth')) {
            this.showModal('请授权相机/相册权限后重试', true, (confirm) => {
              if (confirm) {
                uni.openSetting();
              }
            });
          } else {
            this.showToast('图片选择失败，请重试');
          }
        }
      });
    },

    /**
     * 上传图片
     */
    uploadImg2(url, code, fileName, filePath) {
      if (this.isEmpty(filePath)) {
        this.showToast('图片路径为空');
        return;
      }

      this.showLoading('上传中...');
      
      // 构造请求头
      const header = {
        'content-type': 'multipart/form-data'
      };
      
      // 获取用户信息（如有）
      const app = getApp?.();
      const userInfo = app?.data?.userInfo;
      if (!this.isEmpty(userInfo)) {
        header['username'] = userInfo.username;
        header['token'] = userInfo.token;
        header['timestamp'] = Date.parse(new Date());
      }

      // 上传文件
      this.uploadTask = uni.uploadFile({
        url: url,
        filePath: filePath,
        name: fileName,
        header: header,
        formData: { code },
        success: (res) => {
          this.hideLoading();
          if (res && res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data);
              if (data.code === 1000) {
                this.showToast('上传成功！');
              } else {
                this.showModal(data.msg || '上传失败，请重试');
              }
            } catch (e) {
              this.showModal('数据解析失败，请重试');
            }
          } else {
            this.showModal('网络异常，图片上传失败！');
          }
        },
        fail: () => {
          this.hideLoading();
          this.showModal('上传失败，请检查网络后重试');
        }
      });
    },

    /**
     * 提交按钮点击
     */
    submitBtnTap() {
      // 校验所有图片是否上传
      if (!this.firstTempFilePaths[0]) {
        this.showToast('请上传车头照片！');
        return;
      } else if (!this.secondTempFilePaths[0]) {
        this.showToast('请上传车尾照片！');
        return;
      } else if (!this.thirdTempFilePaths[0]) {
        this.showToast('请上传车身左侧照片！');
        return;
      } else if (!this.fourthTempFilePaths[0]) {
        this.showToast('请上传车身右侧照片！');
        return;
      } else if (!this.fifthTempFilePaths[0]) {
        this.showToast('请上传车钥匙位置照片！');
        return;
      }

      const uploadUrl = 'https://k1sw.wiselink.net.cn/renterApi/saveImg';
      const code = this.code;

      // 批量上传所有图片
      this.uploadImg2(uploadUrl, code, "img1Arr", this.firstTempFilePaths[0]);
      this.uploadImg2(uploadUrl, code, "img2Arr", this.secondTempFilePaths[0]);
      this.uploadImg2(uploadUrl, code, "img3Arr", this.thirdTempFilePaths[0]);
      this.uploadImg2(uploadUrl, code, "img4Arr", this.fourthTempFilePaths[0]);
      this.uploadImg2(uploadUrl, code, "img5Arr", this.fifthTempFilePaths[0]);

      // 提交完成，调用还车接口
      this.carManagerFinish();
    },

    /**
     * 车辆管理提交完成
     */
    carManagerFinish() {
      this.showLoading('提交中...');
      
      const param = {
        code: this.code
      };

      // 构造请求头
      const header = {
        'content-type': 'application/x-www-form-urlencoded'
      };
      
      const app = getApp?.();
      const userInfo = app?.data?.userInfo;
      if (!this.isEmpty(userInfo)) {
        header['username'] = userInfo.username;
        header['token'] = userInfo.token;
        header['timestamp'] = Date.parse(new Date());
      }

      // 提交数据
      uni.request({
        timeout: 20000,
        url: `https://k1sw.wiselink.net.cn/renterApi/returnCar`,
        data: param,
        header: header,
        method: 'POST',
        success: (res) => {
          this.hideLoading();
          if (res && res.statusCode === 200) {
            const data = res.data;
            if (data.code === 1000) {
              // 清除缓存
              uni.removeStorage({ key: 'scene' });
              // 跳转首页
              uni.redirectTo({ url: '/pages/index/index' });
              this.showModal(data.msg || '提交成功！');
            } else {
              this.showModal(data.msg || '提交失败，请重试');
            }
          } else {
            this.showToast('网络异常！');
          }
        },
        fail: () => {
          this.hideLoading();
          this.showToast('提交失败，请检查网络');
        }
      });
    }
  }
};
</script>

<style scoped>
page {
  background-color: black;
  height: 100%;
  width: 100%;
  position: fixed;
}

.container {
  width: 100%;
  height: 100%;
  text-align: center;
  position: relative;
  font-weight: 200;
}

.page_title {
  margin-top: 25rpx;
  color: white;
  font-size: 25rpx;
}

.bg-img {
  width: 100%;
  height: 100%;
  position: fixed;
}

.info-btn1 {
  color: black;
  text-align: center;
  background-color: white;
  font-size: 25rpx;
  padding-left: 40rpx;
  padding-right: 40rpx;
  position: relative;
}

.info-btn {
  margin-top: 20rpx;
  color: black;
  text-align: center;
  background-color: white;
  font-size: 25rpx;
  padding-left: 40rpx;
  padding-right: 40rpx;
  position: relative;
}

.arrow {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
}

.btn_tapcolor {
  background-color: #575757;
}

.submit_btn {
  background-color: #045f33;
  height: 90rpx; 
  color: white;
  font-size: 35rpx;
  line-height: 90rpx;
  margin-left: 40rpx;
  margin-right: 40rpx;
  position: fixed;
  width: 670rpx;
  bottom: 20rpx;
}
</style>