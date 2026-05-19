// ====================== 全局变量 ======================
let currentLat = '';
let currentLng = '';
const zoom = 18;
let meMarker = null;
const currentLocationImg = 'https://k3a.wiselink.net.cn/img/app/currentLocation.png';
let markers = [];
let lastClickedMarker = null;
let info = [];
let map = null;
let isMapInitialized = false;
let isFirstLoad = true;
let vehicle_info = {};
let lang = 'zhCn'

let currentCustomPopup = null; // 自定义弹窗

// 多语言
const buttonTexts = {
	'enUs': {
		btnReturnLang: "Return",
		btn3Lang: "Unlock",
		btn1Lang: "Lock",
		btn5Lang: "Locate",
		btnSeeLang: "Photos",
		btn8Lang: "Block",
		btn6Lang: "Unblock",
		AuthTime: "Auth Time"

	},
	'zhCn': {
		btnReturnLang: "归还车辆",
		btn3Lang: "开锁",
		btn1Lang: "关锁",
		btn5Lang: "寻车",
		btnSeeLang: "送车拍照",
		btn8Lang: "风控拦截",
		btn6Lang: "取消拦截",
		AuthTime: "授权时间"

	}
};

// ====================== 消息监听 ======================
window.addEventListener('message', (e) => {
	if (e.data.type === 'elctrncky') {
		info = e.data.payload;
		vehicle_info = e.data?.vehicle_info || {};
		lang = e.data.lang;
		if (isMapInitialized) createMarkers();
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
		alert('不支持定位');
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
				}
			});
			setMePositioning();
			isMapInitialized = true;
			if (info.length) createMarkers();

			// 点击地图空白 → 关闭弹窗
			map.addListener('click', closeCustomPopup);
		},
		() => {
			alert('定位失败');
		}
	);
}

// ====================== 自身定位图标（已取消跳动） ======================
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
		map: map
	});
}

// ====================== 创建车辆标记 ======================
async function createMarkers() {
	clearMarkers();
	const GOOGLE_API_KEY = "AIzaSyDGzLnrbvfiqdmemX8yR4CTc6n2SzjOaBM";
	const Markerlang = lang.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

	for (let i = 0; i < info.length; i++) {
		const item = info[i];
		if (!item?.latitude || !item?.longitude) continue;

		let address = "Loading...";
		try {
			const res = await fetch(
				`https://maps.googleapis.com/maps/api/geocode/json?latlng=${item.latitude},${item.longitude}&key=${GOOGLE_API_KEY}&language=${Markerlang}`
			);
			const data = await res.json();
			if (data.status === "OK" && data.results.length) address = data.results[0].formatted_address;
		} catch (e) {}

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
			address: address,
			startDate: item?.startDate,
			endDate: item?.endDate,
			sn: item.sn,
			plateNumber: item.plateNumber,
			map
		});

		markers.push(marker);
		bindMarkerClick(marker);
	}

	if (isFirstLoad && markers.length) {
		openMatchingMarker();
		isFirstLoad = false;
	}
}

// ====================== 匹配车辆 ======================
function openMatchingMarker() {
	if (!vehicle_info?.sn) return;
	const m = markers.find(mm => String(mm.sn) === String(vehicle_info.sn));
	if (m) {
		map.panTo(m.getPosition());
		setTimeout(() => google.maps.event.trigger(m, 'click'), 500);
	}
}

// ====================== 自定义弹窗 + 关闭按钮 ======================
function bindMarkerClick(marker) {
	marker.addListener('click', () => {
		closeCustomPopup();

		if (lastClickedMarker) lastClickedMarker.setAnimation(null);
		marker.setAnimation(google.maps.Animation.BOUNCE);
		lastClickedMarker = marker;
		map.panTo(marker.getPosition());

		// ========== 自定义弹窗 ==========
		const dom = document.createElement('div');
		dom.style.cssText = `
			position: absolute;
			background: #fff;
			border-radius: 8px;
			padding: 10px 12px;
			width: 240px;
			min-height: 60px;
			transform: translate(-50%, -130%); /* 👈 这里整体上移了 */
			box-shadow: 0 2px 10px rgba(0,0,0,0.2);
			font-size: 14px;
			line-height: 1.5;
			pointer-events: auto;
		`;

		dom.innerHTML = `
			<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
				<div style="font-weight:bold;">${marker.title}</div>
				<div id="closeBtn" style="cursor:pointer; color:#666; font-size:16px; padding:0 4px;">✕</div>
			</div>
			<div style="color:#333; margin-bottom:4px;">${marker.address}</div>
			<div style="color:#888;">${buttonTexts[lang]?.AuthTime}: ${marker.startDate} — ${marker.endDate}</div>
		`;

		// 关闭按钮事件
		dom.querySelector('#closeBtn').onclick = (e) => {
			e.stopPropagation();
			closeCustomPopup();
			if (lastClickedMarker) lastClickedMarker.setAnimation(null);
		};

		// 小三角
		const arrow = document.createElement('div');
		arrow.style.cssText = `
			position: absolute; bottom: -8px; left: 50%;
			transform: translateX(-50%);
			width: 0; height: 0;
			border-left: 8px solid transparent;
			border-right: 8px solid transparent;
			border-top: 8px solid #fff;
		`;
		dom.appendChild(arrow);

		currentCustomPopup = new google.maps.OverlayView();
		currentCustomPopup.onAdd = function() {
			this.getPanes().floatPane.appendChild(dom);
		};
		currentCustomPopup.draw = function() {
			const point = this.getProjection().fromLatLngToDivPixel(marker.getPosition());
			dom.style.left = point.x + 'px';
			dom.style.top = point.y + 'px';
		};
		currentCustomPopup.onRemove = function() {
			dom.remove();
		};
		currentCustomPopup.setMap(map);

		handleMarkerSelection(marker);
	});
}

// 关闭弹窗
function closeCustomPopup() {
	if (currentCustomPopup) {
		currentCustomPopup.setMap(null);
		currentCustomPopup = null;
	}
}

// ====================== 其他不变 ======================
function handleMarkerSelection(marker) {
	uni.postMessage({
		data: {
			type: 'sn',
			sn: marker.sn,
			plateNumber: marker.plateNumber
		}
	});
}

function clearMarkers() {
	markers.forEach(m => m.setMap(null));
	markers = [];
	closeCustomPopup();
}

// 按钮
document.getElementById('btn1').addEventListener('click', () => uni.postMessage({
	data: {
		source: 1
	}
}));
document.getElementById('btn3').addEventListener('click', () => uni.postMessage({
	data: {
		source: 3,
		payload: info
	}
}));
document.getElementById('btn5').addEventListener('click', () => uni.postMessage({
	data: {
		source: 5,
		payload: info
	}
}));
document.getElementById('bluetooth').addEventListener('click', () => uni.postMessage({
	data: {
		source: 'bluetooth',
		payload: info
	}
}));
document.getElementById('wifi').addEventListener('click', () => uni.postMessage({
	data: {
		source: 'wifi',
		payload: info
	}
}));

// WiFi/蓝牙
const wifi = document.getElementById('wifi');
const bluetooth = document.getElementById('bluetooth');
wifi.classList.add('active');

function toggle(act) {
	wifi.classList.remove('active');
	bluetooth.classList.remove('active');
	act.classList.add('active');
}
wifi.addEventListener('click', () => toggle(wifi));
bluetooth.addEventListener('click', () => toggle(bluetooth));

window.initMap = initMap;