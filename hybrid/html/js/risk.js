var currentLat = ''; // 当前位置纬度
var currentLng = ''; // 当前位置经度
var zoom = 18; // 地图缩放比例
var meMarker = ''; // 个人位置标记点
var img = "https://k3a.wiselink.net.cn/img/app/currentLocation.png"
var markers = []
var lastClickedMarker = null; // 记录当前点击的marker
let openInfoWindow; // 当前打开的信息窗口
var info = [];
var map; // 全局map实例
var isMapInitialized = false; // 标记地图是否初始化
var isFirstLoad = true; // 标记是否是首次加载
var vehicle_info = {};
// 使用配置对象集中管理多语言文本
const buttonTexts = {
	'en-US': {
		btnReturn: "Return",
		btn3: "Unlock",
		btn1: "Lock",
		btn5: "Locate",
		btnSee: "Photos",
		btn8: "Block",
		btn6: "Unblock"
	},
	'zh-CN': { // 假设中文标识为 zh-CN
		btnReturn: "归还车辆",
		btn3: "开锁",
		btn1: "关锁",
		btn5: "寻车",
		btnSee: "送车拍照",
		btn8: "风控拦截",
		btn6: "取消拦截"
	}
};

// 消息监听器
window.addEventListener('message', (e) => {
	if (e.data.type === 'elctrncky') {
		info = e.data.payload;
		// 确保正确接收 vehicle_info
		vehicle_info = e.data?.vehicle_info || {};


		// 如果地图已初始化，直接创建标记
		if (isMapInitialized) {
			createMarkers();
		}
	}
	const langData = buttonTexts[e.data.lang] || buttonTexts['zh-CN']; // 默认中文
	Object.entries(langData).forEach(([id, text]) => {
		const element = document.getElementById(id);
		if (element) element.innerText = text;
	});
});

/**
 * 初始化地图
 */
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

			// 如果已有数据，创建标记
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
 * 设置用户位置标记
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
 * 创建标记点
 */
function createMarkers() {
	console.log('创建标记点，车辆信息:', vehicle_info);

	// 清除现有标记
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

	// 首次加载时尝试打开匹配的标记信息窗口
	if (isFirstLoad && markers.length > 0) {
		console.log('首次加载，尝试打开匹配标记');
		openMatchingMarkerInfoWindow();
		isFirstLoad = false;
	}
}

/**
 * 打开匹配车辆的信息窗口
 */
function openMatchingMarkerInfoWindow() {
	// 添加详细的日志输出
	console.log('打开匹配车辆信息窗口函数开始');
	console.log('vehicle_info:', vehicle_info);
	console.log('vehicle_info.sn:', vehicle_info?.sn);
	console.log('vehicle_info.sn 类型:', typeof vehicle_info?.sn);

	// 如果没有车辆信息或SN号，则不打开任何弹窗
	if (!vehicle_info || !vehicle_info.sn) {
		console.log("没有车辆信息或SN为空，不打开任何弹窗");
		return;
	}

	console.log("尝试匹配车辆SN:", vehicle_info.sn);
	console.log("当前所有标记的SN:", markers.map(m => m.sn));

	// 查找匹配的标记
	let matchingMarker = null;

	// 首先尝试精确匹配
	matchingMarker = markers.find(marker => marker.sn === vehicle_info.sn);

	// 如果没有找到，尝试字符串匹配
	if (!matchingMarker) {
		console.log("尝试字符串匹配");
		matchingMarker = markers.find(marker =>
			marker.sn.toString() === vehicle_info.sn.toString()
		);
	}

	if (matchingMarker) {
		console.log("找到匹配标记:", matchingMarker);

		// 将地图中心点移动到标记位置
		map.panTo(matchingMarker.getPosition());
		console.log("地图中心已移动到标记位置");

		// 直接模拟点击匹配的标记
		setTimeout(() => {
			console.log("触发标记点击事件");
			google.maps.event.trigger(matchingMarker, 'click');
		}, 500);
	} else {
		console.log(`未找到匹配车辆: ${vehicle_info.sn}, 不打开信息窗口`);
		console.log("所有可用SN:", markers.map(m => m.sn));
	}
}

/**
 * 设置标记点事件
 */
function setupMarkerEvents(marker, index) {
	// 创建信息窗口内容
	const contentString = `<div id="myButton_${index}">
        <div class="infoWindow-title">${marker.title}</div>
        <p class="textoverflow">${marker.address}</p>
    </div>`;

	const infowindow = new google.maps.InfoWindow({
		content: contentString,
		maxWidth: 200,
		disableAutoPan: true
	});

	// 添加点击事件监听
	marker.addListener('click', () => {
		console.log(`点击标记: ${marker.title} (SN: ${marker.sn})`);

		// 停止上一个标记的动画
		if (lastClickedMarker && lastClickedMarker.getAnimation() !== null) {
			lastClickedMarker.setAnimation(null);
		}

		// 设置当前标记动画
		marker.setAnimation(google.maps.Animation.BOUNCE);
		lastClickedMarker = marker;

		// 关闭之前的信息窗口并打开新的
		if (openInfoWindow) {
			openInfoWindow.close();
		}

		// 打开信息窗口
		infowindow.open(map, marker);
		openInfoWindow = infowindow;
		// 将地图中心点移动到标记位置
		map.panTo(marker.getPosition());
		console.log("地图中心已移动到标记位置");

		// 触发选择事件
		handleMarkerSelection(marker, index);
	});
}

/**
 * 处理标记选择
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

// 按钮事件绑定
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

window.initMap = initMap;