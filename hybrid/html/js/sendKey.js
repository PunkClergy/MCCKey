// ====================== 全局变量 ======================
let currentLat = ''; // 当前位置纬度
let currentLng = ''; // 当前位置经度
const zoom = 18; // 地图缩放比例
let meMarker = null; // 个人位置标记点
const currentLocationImg = 'https://k3a.wiselink.net.cn/img/app/currentLocation.png';
let markers = [];
let lastClickedMarker = null;
let openInfoWindow = null;
let info = [];
let map = null;
let isMapInitialized = false;
let isFirstLoad = true;
let vehicle_info = {};

// 多语言配置（仅保留 5 个按钮）
const buttonTexts = {
	'enUs': {
		btnReturnLang: "Return",
		btn3Lang: "Unlock",
		btn1Lang: "Lock",
		btn5Lang: "Locate",
		btnSeeLang: "Photos",
		btn8Lang: "Block",
		btn6Lang: "Unblock"
	},
	'zhCn': { // 假设中文标识为 zh-CN
		btnReturnLang: "归还车辆",
		btn3Lang: "开锁",
		btn1Lang: "关锁",
		btn5Lang: "寻车",
		btnSeeLang: "送车拍照",
		btn8Lang: "风控拦截",
		btn6Lang: "取消拦截"
	}
};

// ====================== 消息监听 ======================
window.addEventListener('message', (e) => {
	if (e.data.type === 'elctrncky') {
		info = e.data.payload;
		vehicle_info = e.data?.vehicle_info || {};

		if (isMapInitialized) {
			createMarkers();
		}
	}
	const langData = buttonTexts[e.data.lang] || buttonTexts['zhCn'];
	Object.entries(langData).forEach(([id, text]) => {
		const el = document.getElementById(id);
		if (el) el.innerText = text;
	});
});

// ====================== 地图初始化 ======================
function initMap() {
	if (!navigator.geolocation) {
		alert('您的浏览器不支持Geolocation API');
		return;
	}

	navigator.geolocation.getCurrentPosition(
		(position) => {
			currentLat = position.coords.latitude;
			currentLng = position.coords.longitude;

			map = new google.maps.Map(document.getElementById('map'), {
				zoom,
				center: {
					lat: currentLat,
					lng: currentLng
				},
				animation: 'BOUNCE'
			});

			setMePositioning();
			isMapInitialized = true;

			if (info.length > 0) {
				createMarkers();
			}
		},
		(fail) => {
			console.error('获取位置失败:', fail);
			alert('获取位置失败，请检查定位权限');
		}, {
			enableHighAccuracy: true,
			timeout: 5000
		}
	);
}

// ====================== 设置自身定位标记 ======================
function setMePositioning() {
	meMarker = new google.maps.Marker({
		position: {
			lat: currentLat,
			lng: currentLng
		},
		icon: {
			url: currentLocationImg,
			scaledSize: new google.maps.Size(50, 50)
		},
		animation: 'BOUNCE',
		map
	});
}

// ====================== 创建车辆标记 ======================
function createMarkers() {
	console.log('创建标记点，车辆信息:', vehicle_info);
	clearMarkers();

	info.forEach((item, index) => {
		if (!item?.latitude || !item?.longitude) {
			console.warn('无效的数据项:', item);
			return;
		}

		const marker = new google.maps.Marker({
			position: {
				lat: item.latitude,
				lng: item.longitude
			},
			title: item.plateNumber,
			icon: {
				url: 'https://k3a.wiselink.net.cn/img/app/g_location.png',
				scaledSize: new google.maps.Size(17, 36)
			},
			address: item.address,
			sn: item.sn,
			map
		});

		markers.push(marker);
		setupMarkerEvents(marker, index);
	});

	if (isFirstLoad && markers.length > 0) {
		console.log('首次加载，尝试打开匹配标记');
		openMatchingMarkerInfoWindow();
		isFirstLoad = false;
	}
}

// ====================== 打开匹配车辆信息窗口 ======================
function openMatchingMarkerInfoWindow() {
	console.log('打开匹配车辆信息窗口函数开始');
	console.log('vehicle_info:', vehicle_info);
	console.log('vehicle_info.sn:', vehicle_info?.sn);

	if (!vehicle_info || !vehicle_info.sn) {
		console.log('没有车辆信息或SN为空，不打开任何弹窗');
		return;
	}

	console.log('尝试匹配车辆SN:', vehicle_info.sn);
	console.log('当前所有标记的SN:', markers.map(m => m.sn));

	let matchingMarker = markers.find(marker => marker.sn === vehicle_info.sn);

	if (!matchingMarker) {
		console.log('尝试字符串匹配');
		matchingMarker = markers.find(marker =>
			String(marker.sn) === String(vehicle_info.sn)
		);
	}

	if (matchingMarker) {
		console.log('找到匹配标记:', matchingMarker);
		map.panTo(matchingMarker.getPosition());
		console.log('地图中心已移动到标记位置');

		setTimeout(() => {
			console.log('触发标记点击事件');
			google.maps.event.trigger(matchingMarker, 'click');
		}, 500);
	} else {
		console.log(`未找到匹配车辆: ${vehicle_info.sn}, 不打开信息窗口`);
		console.log('所有可用SN:', markers.map(m => m.sn));
	}
}

// ====================== 标记点事件 ======================
function setupMarkerEvents(marker, index) {
	const contentString = `
		<div id="myButton_${index}">
			<div class="infoWindow-title">${marker.title}</div>
			<p class="textoverflow">${marker.address}</p>
		</div>
	`;

	const infowindow = new google.maps.InfoWindow({
		content: contentString,
		maxWidth: 200,
		disableAutoPan: true
	});

	marker.addListener('click', () => {
		console.log(`点击标记: ${marker.title} (SN: ${marker.sn})`);

		if (lastClickedMarker?.getAnimation() !== null) {
			lastClickedMarker?.setAnimation(null);
		}

		marker.setAnimation(google.maps.Animation.BOUNCE);
		lastClickedMarker = marker;

		openInfoWindow?.close();
		infowindow.open(map, marker);
		openInfoWindow = infowindow;

		map.panTo(marker.getPosition());
		console.log('地图中心已移动到标记位置');

		handleMarkerSelection(marker);
	});
}

// ====================== 处理标记选择 ======================
function handleMarkerSelection(marker) {
	console.log(`已选择车辆: ${marker.title} (SN: ${marker.sn})`);
	uni.postMessage({
		data: {
			type: 'sn',
			sn: marker?.sn,
			plateNumber: marker?.plateNumber
		}
	});
}

// ====================== 清除所有标记 ======================
function clearMarkers() {
	markers.forEach(marker => marker.setMap(null));
	markers = [];
}

// ====================== 按钮事件绑定 ======================
document.getElementById('btn1').addEventListener('click', () => {
	uni.postMessage({
		data: {
			source: 1
		}
	});
});

document.getElementById('btn3').addEventListener('click', () => {
	uni.postMessage({
		data: {
			source: 3,
			payload: info
		}
	});
});

document.getElementById('btn5').addEventListener('click', () => {
	uni.postMessage({
		data: {
			source: 5,
			payload: info
		}
	});
});

document.getElementById('bluetooth').addEventListener('click', () => {
	uni.postMessage({
		data: {
			source: 'bluetooth',
			payload: info
		}
	});
});

document.getElementById('wifi').addEventListener('click', () => {
	uni.postMessage({
		data: {
			source: 'wifi',
			payload: info
		}
	});
});

// ====================== WiFi / 蓝牙 切换 ======================
const wifiItem = document.getElementById('wifi');
const bluetoothItem = document.getElementById('bluetooth');
wifiItem.classList.add('active');

function toggleImg(activeItem) {
	wifiItem.classList.remove('active');
	bluetoothItem.classList.remove('active');
	activeItem.classList.add('active');
}

wifiItem.addEventListener('click', () => toggleImg(wifiItem));
bluetoothItem.addEventListener('click', () => toggleImg(bluetoothItem));

window.initMap = initMap;