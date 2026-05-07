// ==================== 全局变量定义 ====================
// 当前用户位置纬度（用于地图定位）
var currentLat = '';
// 当前用户位置经度（用于地图定位）
var currentLng = '';
// 地图默认缩放级别（数值越大地图越精细）
var zoom = 14;
// 代表“我的位置”的地图标记点实例
var meMarker = '';
// 自定义“我的位置”标记点图标地址
var img = "https://k3a.wiselink.net.cn/img/app/currentLocation.png"
// 存储所有车辆标记点的数组
var markers = []
// 记录最后一次被点击的车辆标记（用于动画控制）
var lastClickedMarker = null;
// 记录当前处于打开状态的信息窗口
let openInfoWindow;
// 接收外部传入的车辆位置数据集合
var info = [];
// 全局地图实例（整个页面共用一个地图对象）
var map;
// 地图是否初始化完成的标记（防止重复初始化）
var isMapInitialized = false;
// 是否为页面首次加载（用于首次自动打开匹配车辆弹窗）
var isFirstLoad = true;
// 外部传入的当前选中车辆详细信息
var vehicle_info = {};

// ==================== 轨迹相关全局变量 ====================
var routePath = []; // 轨迹路线坐标点集合
var vehiclePolyline = null; // 轨迹路线实例
var routeColor = "#1E90FF"; // 轨迹颜色（蓝色）


// 多语言按钮文本配置对象（集中管理中英文按钮文字）
const buttonTexts = {
	// 英文
	'en-US': {
		btnReturn: "Return",
		btn3: "Unlock",
		btn1: "Lock",
		btn5: "Locate",
		btnSee: "Photos",
		btn8: "Block",
		btn6: "Unblock"
	},
	// 中文（默认语言）
	'zh-CN': {
		btnReturn: "归还车辆",
		btn3: "开锁",
		btn1: "关锁",
		btn5: "寻车",
		btnSee: "送车拍照",
		btn8: "风控拦截",
		btn6: "取消拦截"
	}
};

// ==================== 跨页面消息监听 ====================
window.addEventListener('message', (e) => {
	console.log('【1】收到外部消息:', e)

	// 如果消息类型是车辆电子钥匙相关数据
	if (e.data.type === 'elctrncky') {
		// 接收车辆位置列表数据
		info = e.data.payload;
		// 接收当前选中的车辆详情
		vehicle_info = e.data?.vehicle_info || {};
		// 接收外部传来的轨迹经纬度数组
		routePath = e?.data?.lat || [];
		// 如果地图已初始化，创建标记并绘制轨迹
		if (isMapInitialized) {
			createMarkers();
			// 绘制真实轨迹
			drawVehicleRoute(e?.data?.lat);
		}
	}

	// 多语言切换
	const langData = buttonTexts[e.data.lang] || buttonTexts['zh-CN'];
	Object.entries(langData).forEach(([id, text]) => {
		const element = document.getElementById(id);
		if (element) element.innerText = text;
	});
});

// ==================== 初始化地图 ====================
function initMap() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(position => {
			currentLat = position.coords.latitude;
			currentLng = position.coords.longitude;

			map = new google.maps.Map(document.getElementById('map'), {
				zoom: zoom,
				center: {
					lat: currentLat,
					lng: currentLng
				},
				animation: 'BOUNCE'
			});

			setMePositioning();
			isMapInitialized = true;

			// 如果已有数据，创建标记 + 绘制轨迹
			if (info.length > 0) {
				createMarkers();
			}
		}, fail => {
			console.error('获取位置失败:', fail);
			Toast('获取位置失败，请检查定位权限', 2000);
		}, {
			enableHighAccuracy: true,
			timeout: 5000
		});
	} else {
		Toast('您的浏览器不支持Geolocation API', 2000);
	}
}

/**
 * 设置我的位置
 */
function setMePositioning() {
	meMarker = new google.maps.Marker({
		position: {
			lat: currentLat,
			lng: currentLng
		},
		icon: {
			url: img,
			scaledSize: new google.maps.Size(50, 50),
		},
		animation: 'BOUNCE',
		map: map
	});
}

/**
 * 创建车辆标记点
 */
function createMarkers() {
	console.log('创建标记点，车辆信息:', vehicle_info);

	// 清除旧标记 + 旧轨迹
	clearMarkers();


	info.forEach((item, index) => {
		if (!item || !item.latitude || !item.longitude) {
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
				scaledSize: new google.maps.Size(17, 36),
			},
			address: item.address,
			sn: item.sn,
			map: map
		});

		markers.push(marker);
		setupMarkerEvents(marker, index);
	});

	// 首次加载自动匹配车辆
	if (isFirstLoad && markers.length > 0) {
		openMatchingMarkerInfoWindow();
		isFirstLoad = false;
	}
}

/**
 * 自动匹配车辆并打开窗口
 */
function openMatchingMarkerInfoWindow() {
	if (!vehicle_info || !vehicle_info.sn) {
		console.log("没有车辆信息或SN为空，不打开任何弹窗");
		return;
	}

	let matchingMarker = markers.find(marker => marker.sn === vehicle_info.sn);

	if (!matchingMarker) {
		matchingMarker = markers.find(marker =>
			marker.sn.toString() === vehicle_info.sn.toString()
		);
	}

	if (matchingMarker) {
		map.panTo(matchingMarker.getPosition());

		setTimeout(() => {
			google.maps.event.trigger(matchingMarker, 'click');

		}, 500);
	}
}

/**
 * 标记点击事件（点击时使用外部真实轨迹）
 */
function setupMarkerEvents(marker, index) {
	const contentString = `<div id="myButton_${index}">
        <div class="infoWindow-title">${marker.title}</div>
        <p class="textoverflow">${marker.address}</p>
    </div>`;

	const infowindow = new google.maps.InfoWindow({
		content: contentString,
		maxWidth: 200,
		disableAutoPan: true
	});

	marker.addListener('click', () => {
		if (lastClickedMarker && lastClickedMarker.getAnimation() !== null) {
			lastClickedMarker.setAnimation(null);
		}

		marker.setAnimation(google.maps.Animation.BOUNCE);
		lastClickedMarker = marker;

		if (openInfoWindow) {
			openInfoWindow.close();
		}

		infowindow.open(map, marker);
		openInfoWindow = infowindow;
		map.panTo(marker.getPosition());

		handleMarkerSelection(marker, index);


	});
}

/**
 * 选择车辆后发送消息
 */
function handleMarkerSelection(marker, index) {
	console.log(`已选择车辆: ${marker.title} (SN: ${marker.sn})`);
	uni.postMessage({
		data: {
			type: 'sn',
			sn: marker?.sn,
			plateNumber: marker?.plateNumber
		}
	});
}

/**
 * 清除所有标记
 */
function clearMarkers() {
	markers.forEach(marker => marker.setMap(null));
	markers = [];
}

// ==================== 轨迹功能（真实数据版 + 默认轨迹） ====================
/**
 * 绘制轨迹（外部有就用外部，没有就用默认北京西南四环）
 */
function drawVehicleRoute(path) {

	if (vehiclePolyline) {
		vehiclePolyline.setMap(null);
	}

	// ==================== 核心逻辑 ====================
	// 1. 外部有轨迹 → 使用外部轨迹
	// 2. 外部无轨迹 → 使用默认固定轨迹（30个点）
	let finalPath = path && path.length >= 2 ? path : [];

	console.log('【4】最终真正绘制的轨迹 =', finalPath);
	console.log('【4】最终轨迹点数量 =', finalPath.length);

	vehiclePolyline = new google.maps.Polyline({
		path: finalPath,
		geodesic: true,
		strokeColor: "#1E90FF",
		strokeOpacity: 0.8,
		strokeWeight: 5,
		map: map
	});
}

function clearRoute() {
	if (vehiclePolyline) {
		vehiclePolyline.setMap(null);
		vehiclePolyline = null;
	}
	routePath = [];
}

// ==================== 按钮事件 ====================
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
document.getElementById('btn8').addEventListener('click', () => {
	uni.postMessage({
		data: {
			source: 8,
			payload: info
		}
	});
});
document.getElementById('btn6').addEventListener('click', () => {
	uni.postMessage({
		data: {
			source: 6,
			payload: info
		}
	});
});
document.getElementById('trajectory').addEventListener('click', () => {
	console.log('【5】点击了轨迹查询按钮');
	uni.postMessage({
		data: {
			source: 100,
			payload: info
		}
	});
});

window.initMap = initMap;