// ====================== 全局常量 ======================
const DEFAULT_ZOOM = 18;
const CURRENT_LOCATION_ICON = 'https://k3a.wiselink.net.cn/img/app/currentLocation.png';
const VEHICLE_MARKER_ICON = 'https://k3a.wiselink.net.cn/img/app/g_location.png';
const GOOGLE_API_KEY = 'AIzaSyDGzLnrbvfiqdmemX8yR4CTc6n2SzjOaBM';
const DEFAULT_LANG = 'zhCn';

// ====================== 全局状态变量 ======================
let currentLat = '';
let currentLng = '';
let userLocationMarker = null;
let vehicleMarkers = [];
let lastActiveMarker = null;
let vehicleList = [];
let mapInstance = null;
let isMapReady = false;
let isFirstRender = true;
let currentVehicleInfo = {};
let currentLang = DEFAULT_LANG;
let activeCustomPopup = null;

// ====================== 多语言配置 ======================
const localeTexts = {
	enUs: {
		btnReturnLang: 'Return',
		btn3Lang: 'Unlock',
		btn1Lang: 'Lock',
		btn5Lang: 'Locate',
		btnSeeLang: 'Photos',
		btn8Lang: 'Block',
		btn6Lang: 'Unblock',
		AuthTime: 'Auth Time'
	},
	zhCn: {
		btnReturnLang: '归还车辆',
		btn3Lang: '开锁',
		btn1Lang: '关锁',
		btn5Lang: '寻车',
		btnSeeLang: '查看照片',
		btn8Lang: '风控拦截',
		btn6Lang: '取消拦截',
		AuthTime: '授权时间'
	}
};

// ====================== APP 通信 ======================
/**
 * 接收 APP 传递的数据
 * @param {Object} data - APP 传入的参数
 */
window.receiveAppData = function(data) {
	// 车辆数据
	if (data.type === 'elctrncky') {
		vehicleList = data.payload || [];
		currentVehicleInfo = data.vehicle_info || {};
		currentLang = data.lang || DEFAULT_LANG;

		if (isMapReady) {
			renderVehicleMarkers();
		}
	}

	// 用户信息
	if (data.type === 'userInfo') {
		console.log('用户信息:', data.userInfo);
	}

	updatePageLocale();
};

/**
 * 主动向 APP 请求用户信息
 */
function requestUserInfoFromApp() {
	uni.postMessage({
		data: {
			type: 'getUserInfo'
		}
	});
}

// ====================== 多语言更新 ======================
/**
 * 更新页面所有多语言文本
 */
function updatePageLocale() {
	const langData = localeTexts[currentLang] || localeTexts[DEFAULT_LANG];

	Object.entries(langData).forEach(([elementId, text]) => {
		const element = document.getElementById(elementId);
		if (element) element.innerText = text;
	});
}

// ====================== 地图核心 ======================
/**
 * 初始化谷歌地图
 */
function initMap() {
	// 为通过 Google Play 权限审核，H5 地图页不再主动请求用户定位。
	// 地图默认居中到车辆位置；车辆数据未到达前使用一个中性默认中心点。
	const firstVehicle = vehicleList.find(item => item?.latitude && item?.longitude);
	const center = firstVehicle ? {
		lat: Number(firstVehicle.latitude),
		lng: Number(firstVehicle.longitude)
	} : {
		lat: 0,
		lng: 0
	};

	currentLat = center.lat;
	currentLng = center.lng;

	mapInstance = new google.maps.Map(document.getElementById('map'), {
		zoom: firstVehicle ? DEFAULT_ZOOM : 10,
		center
	});

	isMapReady = true;

	if (vehicleList.length) renderVehicleMarkers();

	mapInstance.addListener('click', closeCustomPopup);

	requestUserInfoFromApp();
}

/**
 * 渲染自身定位图标
 */
function renderUserLocationMarker() {
	userLocationMarker = new google.maps.Marker({
		position: {
			lat: currentLat,
			lng: currentLng
		},
		icon: {
			url: CURRENT_LOCATION_ICON,
			scaledSize: new google.maps.Size(50, 50)
		},
		map: mapInstance
	});
}

// ====================== 车辆标记点 ======================
/**
 * 清空所有车辆标记
 */
function clearAllVehicleMarkers() {
	vehicleMarkers.forEach(marker => marker.setMap(null));
	vehicleMarkers = [];
	closeCustomPopup();
}

/**
 * 解析经纬度为地址
 */
async function resolveAddress(lat, lng) {
	try {
		const mapLang = currentLang.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		const url =
			`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=${mapLang}`;

		const res = await fetch(url);
		const data = await res.json();

		if (data.status === 'OK' && data.results.length) {
			return data.results[0].formatted_address;
		}
	} catch (err) {
		console.error('地址解析失败:', err);
	}
	return '地址获取失败';
}

/**
 * 渲染所有车辆标记
 */
async function renderVehicleMarkers() {
	clearAllVehicleMarkers();

	for (const item of vehicleList) {
		if (!item?.latitude || !item?.longitude) continue;

		const address = await resolveAddress(item.latitude, item.longitude);

		// 创建车辆 marker
		const marker = new google.maps.Marker({
			position: {
				lat: item.latitude,
				lng: item.longitude
			},
			title: item.plateNumber,
			icon: {
				url: VEHICLE_MARKER_ICON,
				scaledSize: new google.maps.Size(17, 36)
			},
			address,
			startDate: item?.startDate,
			endDate: item?.endDate,
			sn: item.sn,
			plateNumber: item.plateNumber,
			map: mapInstance
		});

		vehicleMarkers.push(marker);
		bindMarkerClickEvent(marker);
	}

	// 首次加载自动定位匹配车辆
	if (isFirstRender && vehicleMarkers.length) {
		autoOpenMatchedVehicleMarker();
		isFirstRender = false;
	}
}

/**
 * 自动打开匹配 SN 的车辆弹窗
 */
function autoOpenMatchedVehicleMarker() {
	if (!currentVehicleInfo?.sn) return;

	const targetMarker = vehicleMarkers.find(
		marker => String(marker.sn) === String(currentVehicleInfo.sn)
	);

	if (targetMarker) {
		mapInstance.panTo(targetMarker.getPosition());
		setTimeout(() => {
			google.maps.event.trigger(targetMarker, 'click');
		}, 500);
	}
}

// ====================== Marker 交互 ======================
/**
 * 绑定 Marker 点击事件
 */
function bindMarkerClickEvent(marker) {
	marker.addListener('click', () => {
		closeCustomPopup();

		// 上一个 marker 停止动画
		if (lastActiveMarker) {
			lastActiveMarker.setAnimation(null);
		}

		// 当前 marker 弹跳动画
		marker.setAnimation(google.maps.Animation.BOUNCE);
		lastActiveMarker = marker;

		// 地图居中
		mapInstance.panTo(marker.getPosition());

		// 显示弹窗
		createCustomPopup(marker);

		// 回传选中车辆
		notifyVehicleSelected(marker);
	});
}

/**
 * 向 APP 通知选中车辆
 */
function notifyVehicleSelected(marker) {
	uni.postMessage({
		data: {
			type: 'sn',
			sn: marker.sn,
			plateNumber: marker.plateNumber
		}
	});
}

// ====================== 自定义弹窗 ======================
/**
 * 创建自定义弹窗
 */
function createCustomPopup(marker) {
	const popupContainer = document.createElement('div');
	popupContainer.style.cssText = `
    position: absolute;
    background: #fff;
    border-radius: 8px;
    padding: 10px 12px;
    width: 240px;
    min-height: 60px;
    transform: translate(-50%, -130%);
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-size: 14px;
    line-height: 1.5;
    pointer-events: auto;
  `;

	popupContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <div style="font-weight: bold;">${marker.title}</div>
      <div id="closePopupBtn" style="cursor: pointer; color: #666; font-size: 16px; padding: 0 4px;">✕</div>
    </div>
    <div style="color: #333; margin-bottom: 4px;">${marker.address}</div>
    <div style="color: #888;">
      ${localeTexts[currentLang]?.AuthTime}: ${marker.startDate} — ${marker.endDate}
    </div>
  `;

	// 关闭按钮
	popupContainer.querySelector('#closePopupBtn').onclick = (e) => {
		e.stopPropagation();
		closeCustomPopup();
		if (lastActiveMarker) lastActiveMarker.setAnimation(null);
	};

	// 底部小箭头
	const arrow = document.createElement('div');
	arrow.style.cssText = `
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid #fff;
  `;
	popupContainer.appendChild(arrow);

	// 谷歌地图覆盖物
	activeCustomPopup = new google.maps.OverlayView();
	activeCustomPopup.onAdd = function() {
		this.getPanes().floatPane.appendChild(popupContainer);
	};
	activeCustomPopup.draw = function() {
		const point = this.getProjection().fromLatLngToDivPixel(marker.getPosition());
		popupContainer.style.left = point.x + 'px';
		popupContainer.style.top = point.y + 'px';
	};
	activeCustomPopup.onRemove = function() {
		popupContainer.remove();
	};

	activeCustomPopup.setMap(mapInstance);
}

/**
 * 关闭自定义弹窗
 */
function closeCustomPopup() {
	if (activeCustomPopup) {
		activeCustomPopup.setMap(null);
		activeCustomPopup = null;
	}
}

// ====================== 页面按钮事件 ======================
/**
 * 绑定底部功能按钮事件
 */
function bindPageButtonEvents() {
	// 关锁
	document.getElementById('btn1').addEventListener('click', () => {
		uni.postMessage({
			data: {
				source: 1
			}
		});
	});

	// 开锁
	document.getElementById('btn3').addEventListener('click', () => {
		uni.postMessage({
			data: {
				source: 3,
				payload: vehicleList
			}
		});
	});

	// 寻车
	document.getElementById('btn5').addEventListener('click', () => {
		uni.postMessage({
			data: {
				source: 5,
				payload: vehicleList
			}
		});
	});
	// 还车
	document.getElementById('btnReturn').addEventListener('click', () => {
		uni.postMessage({
			data: {
				source: 'btnReturn',
				payload: vehicleList
			}
		});
	});
	// 查看照片
	document.getElementById('btnSee').addEventListener('click', () => {
		uni.postMessage({
			data: {
				source: 'btnSee',
				payload: vehicleList
			}
		});
	});
}

// ====================== WIFI / 蓝牙 切换 ======================
/**
 * 初始化网络模式切换
 */
function initNetworkModeToggle() {
	const wifiBtn = document.getElementById('wifi');
	const bluetoothBtn = document.getElementById('bluetooth');

	// 默认选中 WIFI
	wifiBtn.classList.add('active');

	// 切换激活状态
	function setActiveMode(activeElement) {
		wifiBtn.classList.remove('active');
		bluetoothBtn.classList.remove('active');
		activeElement.classList.add('active');
	}

	// WIFI
	wifiBtn.addEventListener('click', () => {
		setActiveMode(wifiBtn);
		uni.postMessage({
			data: {
				source: 'wifi'
			}
		});
	});

	// 蓝牙
	bluetoothBtn.addEventListener('click', () => {
		setActiveMode(bluetoothBtn);
		uni.postMessage({
			data: {
				source: 'bluetooth'
			}
		});
	});
}

// ====================== 初始化执行 ======================
bindPageButtonEvents();
initNetworkModeToggle();

// 导出地图初始化方法
window.initMap = initMap;