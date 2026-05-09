/**
 * 控制ble的所有状态
 */ //获取工具类
// const utils = require('./byte-util.js');
import utils from './byte-util.js'
//获取控制命令类
// const controlCmds = require('./device-control-cmds.js');
import controlCmds from './device-control-cmds.js'
//解析包的类
// const parseUtil = require('./parse-util.js');
import parseUtil from './parse-util.js'
//系统api
// const appUtil = require('./app-util.js');
import appUtil from './app-util.js'
//日志
// const logger = require('./logger.js');
import logger from './logger.js'


var gWriteService = '';
const WRITE_SERVICE_SHORTHAND = 'FFE5';
var gReadService = '';
const READ_SERVICE_SHORTHAND = 'FFE0';
var gWriteCharacteristic = '';
const WRITE_CHARACTERISTIC_SHORTHAND = 'FFE9';
var gReadCharacteristic = '';
const READ_CHARACTERISTIC_SHORTHAND = 'FFE4';


// 全局写入类型（自动识别）
var globalWriteType = 'writeNoResponse';


//上次执行的时间
var lastExecuteTime = 0;
//设备号
var gIdc = '';
//控制密码
var gPwd = '';
// 当前发送的数据类型
var gSendType = '';
// 蓝牙状态的回调
var gBluetoothState;
// 设备返回数据的回调
var gOnReceiveValue;
//设备idc
var deviceId = '';
//蓝牙适配器是否可用
var available = false;
//是否正在搜索
var discovering = false;
//蓝牙适配器是否已经打开
var isBLEAdapterOpen = false;
//最后一次发送的控制指令
var lastControlCmd = '';
//最后一次发送的指令
var lastSendData = '';
//连接状态
var connected = false;
//所有请求类型
const equireTypeArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
//扫描超时时间
const devicesDiscoveryTimeOut = 15000;
//最后一次点击的名称
var lastClickName;
//系统，Android IOS
var systemType = '';
//系统版本
var systemVersion = '';
//重复发送
var sendRepetTimeOut;
//每条指令最大重复发送4次,共发送5次
var sendMaxTime = 4;
//重复发送间隔时间
const repeatSendTime = 100;
//最后一次接受到的数据
var lastReceiverData;
//搜索设备超时
var discoverTimeout;


// 🔥 修复并发写入：串行发送队列
let isWriting = false;
let sendQueue = [];


/**
 * 默认控制命令
 */
// 蓝牙车辆控制指令常量
var DEFAULT_CONTROL_CMDS = {
	// 开门 + 上电
	CONTROL_OPEN_DOOR_POWER: 'B510',
	// 开门
	CONTROL_OPEN_DOOR: 'B500',
	// 锁门 + 断3.3V
	CONTROL_CLOSE_DOOR: 'B501',
	// 锁门（J24专用：关锁不断3.3V）
	CONTROL_CLOSE_DOOR_OUTAGE: 'BB1111',
	// 鸣笛寻车
	CONTROL_REMOTE_LOOK_FOR_CAR: 'B400',
	// 车辆断电
	CONTROL_CATCHCAR: 'B100',
	// 车辆上电
	CONTROL_RELEASECAR: 'B101',
	// 开启后备箱
	CONTROL_OPEN_TRUNK: 'B600',
	// 升窗
	CONTROL_UP_WND: 'BA00',
	// 降窗
	CONTROL_DOWN_WND: 'BA01'
};


/**
 * 蓝牙状态
 */
var DEFAULT_BLUETOOTH_STATE = {
	BLUETOOTH_ERROR: -2,
	BLUETOOTH_CONNECT_FAILED: -1,
	BLUETOOTH_CONNECT_SUCESS: 0,
	BLUETOOTH_ADAPTER_UNAVAILABLE: 1,
	BLUETOOTH_DEVICES_DISCOVERY_FAILD: 2,
	BLUETOOTH_SEND_FREQUENTLY: 3,
	BLUETOOTH_PRE_EXECUTE: 4,
	BLUETOOTH_NOT_FOUND: 5,
	BLUETOOTH_UNSUPPORTED: 6,
	BLUETOOTH_SEND_FAILED: 7,
	BLUETOOTH_NO_RESPONSE: 8
};


/**
 * 默认命令类型
 */
var DEFAULT_CMD_TYPE = {
	CONTROL_OPEN_DOOR_POWER_TYPE: equireTypeArray[0],
	CONTROL_OPEN_DOOR_TYPE: equireTypeArray[1],
	CONTROL_CLOSE_DOOR_TYPE: equireTypeArray[2],
	CONTROL_CLOSE_DOOR_OUTAGE_TYPE: equireTypeArray[3],
	CONTROL_REMOTE_LOOK_FOR_CAR_TYPE: equireTypeArray[4],
	READ_CAR_GPS_TYPE: equireTypeArray[5],
	READ_CAR_STATE_TYPE: equireTypeArray[6],
	READ_CAR_POWR_MILEAGE: equireTypeArray[7],
	CONTROL_RELEASECAR_TYPE: equireTypeArray[9],
	CONTROL_CATCHCAR_TYPE: equireTypeArray[10],
	READ_CAR_VIN: equireTypeArray[11],
	READ_CAR_OIL: equireTypeArray[12],
	DEBUG_CMD: equireTypeArray[13],
	CONTROL_OPENTRUNK_TYPE: equireTypeArray[14],
	CONTROL_UPWND_TYPE: equireTypeArray[15],
	CONTROL_DOWNWND_TYPE: equireTypeArray[16],
	READ_CAR_TIRE: equireTypeArray[17],
	READ_CAR_MAIN: equireTypeArray[18],
	READ_DEV_MAIN: equireTypeArray[19],
	READ_DEV_SPINFO: equireTypeArray[20]
};


// ====================== 调试工具函数 ======================
function log(tag, msg) {
	console.log(`[BLE_DEBUG] ${tag} -> ${msg}`);
}


/**
 * 返回连接状态
 */
function getBLEConnectionState() {
	log("getBLEConnectionState", "连接状态: " + connected);
	return connected;
}


/**
 * 监听低功耗蓝牙连接状态的改变事件
 */
function onBLEConnectionStateChange(onStateChanged) {
	log("onBLEConnectionStateChange", "注册连接状态监听");
	uni.onBLEConnectionStateChange(function(res) {
		log("onBLEConnectionStateChange", `设备 ${res.deviceId} 连接状态改变: ${res.connected}`);
		connected = res.connected;
		onStateChanged(res.connected);
	});
}


/**
 * 停止蓝牙扫描
 */
function stopScanBle() {
	log("stopScanBle", "停止扫描");
	uni.stopBluetoothDevicesDiscovery({
		success: function(res) {
			log("stopScanBle", "停止扫描成功");
			discovering = false;
		},
		fail: function(res) {
			log("stopScanBle", "停止扫描失败: " + JSON.stringify(res));
			discovering = false;
		}
	});
}


/**
 * 监听蓝牙适配器状态变化事件
 */
function onBluetoothAdapterStateChange() {
	log("onBluetoothAdapterStateChange", "注册适配器状态监听");
	uni.onBluetoothAdapterStateChange(function(res) {
		log("onBluetoothAdapterStateChange", "适配器改变: available=" + res.available + " discovering=" + res
			.discovering);
		setBLEAdapterState(res.available, res.discovering);
	});
}


/**
 * 创建发送的指令
 */
function parseCmd() {
	log("parseCmd", "开始构建指令，当前类型: " + gSendType);
	var cmd = '';
	switch (gSendType) {
		case 1:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_OPEN_DOOR_POWER;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 2:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_OPEN_DOOR;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 3:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_CLOSE_DOOR;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 4:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_CLOSE_DOOR_OUTAGE;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 5:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_REMOTE_LOOK_FOR_CAR;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 6:
			cmd = controlCmds.getGPSDataCmd();
			break;
		case 7:
			cmd = controlCmds.getDeviceStateCmd();
			break;
		case 8:
			cmd = controlCmds.getDeviceCarInfo();
			break;
		case 9:
			cmd = controlCmds.getNormalCmd(serialNum);
			break;
		case 10:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_RELEASECAR;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 11:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_CATCHCAR;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 12:
			cmd = controlCmds.getDeviceCarVIN();
			break;
		case 13:
			cmd = controlCmds.getDeviceCarOIL();
			break;
		case 14:
			cmd = controlCmds.getDEBUGDataCmd();
			break;
		case 15:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_OPEN_TRUNK;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 16:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_UP_WND;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 17:
			lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_DOWN_WND;
			cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
			break;
		case 18:
			cmd = controlCmds.getDeviceCarTIRE();
			break;
		case 19:
			cmd = controlCmds.getDeviceCarMAIN();
			break;
		case 20:
			cmd = controlCmds.getDeviceDevMAIN();
			break;
		case 21:
			cmd = controlCmds.getDeviceDevSPINFO();
			break;
	}
	log("parseCmd", "构建指令完成: " + cmd);
	return cmd;
}


/**
 * 设置adapter状态
 */
function setBLEAdapterState(ava, discovery) {
	log("setBLEAdapterState", "available=" + ava + " discovering=" + discovery);
	available = ava;
	discovering = discovery;
}


/**
 * 打开蓝牙适配器
 */
function openBluetoothAdapter(cOpenBluetoothAdapter) {
	log("openBluetoothAdapter", "尝试打开蓝牙适配器");
	uni.openBluetoothAdapter({
		success: function(res) {
			log("openBluetoothAdapter", "打开成功");
			isBLEAdapterOpen = true;
			cOpenBluetoothAdapter(true);
		},
		fail: function(res) {
			log("openBluetoothAdapter", "打开失败: " + JSON.stringify(res));
			if (res.errMsg != 'openBluetoothAdapter:fail already opened') {
				isBLEAdapterOpen = false;
				setBLEAdapterState(false, false);
				cOpenBluetoothAdapter(false);
			} else {
				log("openBluetoothAdapter", "适配器已打开");
				isBLEAdapterOpen = true;
				cOpenBluetoothAdapter(true);
			}
		}
	});
}


/**
 * 蓝牙适配器是否可用
 */
function isBLEAdapterAvailable(onResult) {
	log("isBLEAdapterAvailable", "检查适配器是否可用");
	if (isBLEAdapterOpen) {
		if (!available) {
			getBluetoothAdapterState(function(res) {
				setBLEAdapterState(res.available, res.discovering);
				onResult(res.available);
			});
		} else {
			log("isBLEAdapterAvailable", "适配器已可用");
			onResult(available);
		}
	} else {
		openBluetoothAdapter(function(openSuccess) {
			if (openSuccess) {
				getBluetoothAdapterState(function(res) {
					setBLEAdapterState(res.available, res.discovering);
					onResult(res.available);
				});
			} else {
				onResult(openSuccess);
			}
		});
	}
}


/**
 * 开始搜索
 */
function startBluetoothDevicesDiscovery() {
	log("startBluetoothDevicesDiscovery", "开始扫描设备");
	uni.startBluetoothDevicesDiscovery({
		success: function(res) {
			log("startBluetoothDevicesDiscovery", "扫描启动成功");
			discovering = res.isDiscovering;
		},
		fail: function(res) {
			log("startBluetoothDevicesDiscovery", "扫描启动失败: " + JSON.stringify(res));
			if (res.errMsg != 'startBluetoothDevicesDiscovery:fail already discovering devices') {
				discovering = false;
				gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
				gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_DEVICES_DISCOVERY_FAILD);
			} else {
				log("startBluetoothDevicesDiscovery", "正在扫描中");
				discovering = true;
			}
		}
	});
	discoverTimeout = setTimeout(function() {
		if (discovering) {
			log("startBluetoothDevicesDiscovery", "扫描超时，未找到设备");
			gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
			gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NOT_FOUND);
			releaseBle();
		}
	}, devicesDiscoveryTimeOut);
}


/**
 * 获取BleAdapter状态
 */
function getBluetoothAdapterState(onBleAdapterState) {
	log("getBluetoothAdapterState", "获取适配器状态");
	uni.getBluetoothAdapterState({
		success: function(res) {
			log("getBluetoothAdapterState", "获取成功: " + JSON.stringify(res));
			onBleAdapterState(res);
		},
		fail: function(res) {
			log("getBluetoothAdapterState", "获取失败");
			onBleAdapterState(res);
		}
	});
}


/**
 * 断开蓝牙连接
 */
function disConnect() {
	log("disConnect", "主动断开连接");
	uni.closeBLEConnection({
		deviceId: deviceId,
		success: function(res) {
			log("disConnect", "断开成功");
			connected = false;
		},
		fail: function(res) {
			log("disConnect", "断开失败");
		}
	});
}


/**
 * 关闭蓝牙模块
 */
function closeBluetoothAdapter() {
	log("closeBluetoothAdapter", "关闭蓝牙适配器");
	uni.closeBluetoothAdapter({
		success: function(res) {
			log("closeBluetoothAdapter", "关闭成功");
			isBLEAdapterOpen = false;
		},
		fail: function(res) {
			log("closeBluetoothAdapter", "关闭失败");
		}
	});
}


// 🔥 串行发送下一包
function sendNext() {
	if (isWriting || sendQueue.length === 0) return;
	isWriting = true;
	let item = sendQueue.shift();
	send(item.hex, item.noRepeat);
}


/**
 * 写入数据【调试版】
 */
function writeBLECharacteristicValue(buffer, writeBLECharacteristicValue) {
	log("writeBLECharacteristicValue", "===== 准备写入数据 =====");
	log("writeBLECharacteristicValue", "deviceId: " + deviceId);
	log("writeBLECharacteristicValue", "serviceId: " + gWriteService);
	log("writeBLECharacteristicValue", "characteristicId: " + gWriteCharacteristic);
	log("writeBLECharacteristicValue", "写入类型: " + globalWriteType);

	// 关键判断：特征值未获取成功，直接拒绝写入
	if (!gWriteService || !gWriteCharacteristic) {
		log("writeBLECharacteristicValue", "❌ 写入失败：服务或特征值未就绪");
		writeBLECharacteristicValue(false);
		isWriting = false;
		sendNext();
		return;
	}


	setTimeout(() => {
		log("writeBLECharacteristicValue", "执行 uni.writeBLECharacteristicValue");
		uni.writeBLECharacteristicValue({
			deviceId: deviceId,
			serviceId: gWriteService,
			characteristicId: gWriteCharacteristic,
			value: buffer,
			type: globalWriteType,
			success: function(res) {
				log("writeBLECharacteristicValue", "✅ 写入成功: " + JSON.stringify(res));
				writeBLECharacteristicValue(true);
			},
			fail: function(res) {
				log("writeBLECharacteristicValue", "❌ 写入失败: " + JSON.stringify(res));
				writeBLECharacteristicValue(false);
			},
			complete: () => {
				isWriting = false;
				setTimeout(sendNext, 80);
			}
		});
	}, 300)
}


/**
 * 开始连接
 */
function startConnect() {
	log("startConnect", "===== 开始连接设备 =====");
	log("startConnect", "deviceId: " + deviceId);
	uni.createBLEConnection({
		deviceId: deviceId,
		success: function(res) {
			log("startConnect", "✅ 连接成功");
			gWriteService = '';
			gWriteCharacteristic = '';
			gReadService = '';
			gReadCharacteristic = '';
			connected = true;
			getBLEDeviceServices();
		},
		fail: function(res) {
			log("startConnect", "❌ 连接失败: " + JSON.stringify(res));
			gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_CONNECT_FAILED);
		}
	});
}


/**
 * 获取设备的服务列表
 */
function getBLEDeviceServices() {
	log("getBLEDeviceServices", "===== 获取设备服务 =====");
	uni.getBLEDeviceServices({
		deviceId: deviceId,
		success: function(res) {
			log("getBLEDeviceServices", "✅ 获取服务成功: " + JSON.stringify(res.services));
			for (var i = 0; i < res.services.length; i++) {
				if (res.services[i].uuid.toUpperCase().includes(WRITE_SERVICE_SHORTHAND)) {
					gWriteService = res.services[i].uuid;
					log("getBLEDeviceServices", "🎯 匹配到写服务: " + gWriteService);
				}
				if (res.services[i].uuid.toUpperCase().includes(READ_SERVICE_SHORTHAND)) {
					gReadService = res.services[i].uuid;
					log("getBLEDeviceServices", "🎯 匹配到读服务: " + gReadService);
				}
			}
			log("getBLEDeviceServices", "最终写服务: " + gWriteService + "  读服务: " + gReadService);
			if (gWriteService && gReadService) {
				log("getBLEDeviceServices", "服务获取完成，开始获取读特征值");
				getBLEDeviceReadCharacteristics();
			}
		}
	});
}


/**
 * 获取读特征值
 */
function getBLEDeviceReadCharacteristics() {
	log("getBLEDeviceReadCharacteristics", "===== 获取读特征值 =====");
	uni.getBLEDeviceCharacteristics({
		deviceId: deviceId,
		serviceId: gReadService,
		success: function(res) {
			log("getBLEDeviceReadCharacteristics", "✅ 获取成功: " + JSON.stringify(res.characteristics));
			for (var i = 0; i < res.characteristics.length; i++) {
				if (res.characteristics[i].uuid.toUpperCase().includes(READ_CHARACTERISTIC_SHORTHAND)) {
					gReadCharacteristic = res.characteristics[i].uuid;
					log("getBLEDeviceReadCharacteristics", "🎯 匹配到读特征值: " + gReadCharacteristic);
				}
			}
			if (gReadCharacteristic) {
				log("getBLEDeviceReadCharacteristics", "读特征值就绪，开启notify");
				notifyBLECharacteristicValueChange();
			}
		}
	});
}


/**
 * 启用notify
 */
function notifyBLECharacteristicValueChange() {
	log("notifyBLECharacteristicValueChange", "===== 开启notify =====");
	uni.notifyBLECharacteristicValueChange({
		deviceId: deviceId,
		serviceId: gReadService,
		characteristicId: gReadCharacteristic,
		state: true,
		success: function(res) {
			log("notifyBLECharacteristicValueChange", "✅ notify开启成功");
			getBLEDeviceWriteCharacteristics();


			appUtil.getSystemInfoComplete(function(res) {
				var system = res.system;
				var blankIndex = system.indexOf(' ');
				var pointIndex = system.indexOf('.');
				if (blankIndex != -1 && pointIndex != -1) {
					systemType = system.substring(0, blankIndex);
					systemVersion = system.substring(blankIndex + 1, pointIndex + 2);
					log("notifyBLECharacteristicValueChange", "系统信息: " + systemType + " " +
						systemVersion);
				}
				if (systemType.toLowerCase() === 'android' && Number(systemVersion) >= 5.0) {
					setTimeout(() => {
						log("notifyBLECharacteristicValueChange", "设置MTU=240");
						uni.setBLEMTU({
							deviceId,
							mtu: 240
						});
					}, 500);
				}
			});
		},
		fail: (err) => log("notifyBLECharacteristicValueChange", "❌ notify开启失败: " + JSON.stringify(err))
	});
}


/**
 * 获取写特征值
 */
function getBLEDeviceWriteCharacteristics() {
	log("getBLEDeviceWriteCharacteristics", "===== 获取写特征值 =====");
	uni.getBLEDeviceCharacteristics({
		deviceId: deviceId,
		serviceId: gWriteService,
		success: function(res) {
			log("getBLEDeviceWriteCharacteristics", "✅ 获取成功: " + JSON.stringify(res.characteristics));
			gWriteCharacteristic = '';
			globalWriteType = '';


			for (let j = 0; j < res.characteristics.length; j++) {
				let item = res.characteristics[j];
				log("getBLEDeviceWriteCharacteristics", "遍历特征值: " + item.uuid + " properties:" + JSON
					.stringify(item.properties));
				if (item.uuid.toUpperCase().includes(WRITE_CHARACTERISTIC_SHORTHAND)) {
					// 强制无响应写入，解决10007
					gWriteCharacteristic = item.uuid;
					globalWriteType = 'writeNoResponse';
					log("getBLEDeviceWriteCharacteristics", "🎯 强制使用无响应写入（修复10007）");
				}
			}


			log("getBLEDeviceWriteCharacteristics", "==================================");
			log("getBLEDeviceWriteCharacteristics", "最终写特征值: " + gWriteCharacteristic);
			log("getBLEDeviceWriteCharacteristics", "最终写入类型: " + globalWriteType);
			log("getBLEDeviceWriteCharacteristics", "==================================");


			if (gWriteCharacteristic && globalWriteType && connected) {
				log("getBLEDeviceWriteCharacteristics", "✅ 所有条件就绪，准备发送数据");
				setTimeout(() => {
					dispatcherSend(parseCmd(), false);
				}, 300);
			} else {
				log("getBLEDeviceWriteCharacteristics", "❌ 未就绪，无法发送");
			}
		}
	});
}


/**
 * 获取设备发过来的数据
 */
function onBLECharacteristicValueChange() {
	log("onBLECharacteristicValueChange", "注册数据接收监听");
	uni.onBLECharacteristicValueChange(function(characteristic) {
		var resultArrayBufferData = characteristic.value;
		var receiverHexData = utils.buf2hex(resultArrayBufferData);
		log("onBLECharacteristicValueChange", "📩 收到设备数据: " + receiverHexData);
		gOnReceiveValue(gSendType)
	});
}


/**
 * 监听寻找到新设备的事件
 */
function onBluetoothDeviceFound() {
	log("onBluetoothDeviceFound", "注册设备发现监听");
	uni.onBluetoothDeviceFound(function(devices) {
		var device = devices.devices[0];
		log("onBluetoothDeviceFound", "发现设备: " + device.name + "  " + device.deviceId);
		if (gIdc == device.name || gIdc == device.localName || utils.hexCharCodeToStr(utils.buf2hex(device
				.advertisData)).includes(gIdc)) {
			log("onBluetoothDeviceFound", "🎯 匹配到目标设备");
			deviceId = device.deviceId;
			stopScanBle();
			clearTimeout(discoverTimeout);


			onBLEConnectionStateChange((state) => {});
			onBluetoothAdapterStateChange();
			onBLECharacteristicValueChange();


			setTimeout(() => {
				startConnect();
			}, 500);
		}
	});
}


/**
 * 单位时间内禁止重复操作
 */
function isQuickStart(quickName) {
	var isQuick = false;
	var currentTime = new Date().getTime();
	if (lastClickName == quickName && currentTime - lastExecuteTime < 800) {
		isQuick = true;
	}
	lastExecuteTime = currentTime;
	lastClickName = quickName;
	return isQuick;
}


function needScan() {
	log("needScan", "deviceId为空? " + (deviceId == ''));
	return deviceId == '';
}


function initSendData(idc, pwd, sendType, bluetoothState, onReceiveValue) {
	log("initSendData", "初始化参数: idc=" + idc + " pwd=" + pwd + " 类型=" + sendType);
	gPwd = pwd;
	gSendType = sendType;
	gBluetoothState = bluetoothState;
	gOnReceiveValue = onReceiveValue;
	gIdc = idc;
	sendMaxTime = 4;
	onBluetoothDeviceFound();
}


function isSupportedBLE(isSupported) {
	log("isSupportedBLE", "检查设备是否支持BLE");
	if (!systemType) {
		appUtil.getSystemInfoComplete(function(res) {
			var system = res.system;
			var blankIndex = system.indexOf(' ');
			var pointIndex = system.indexOf('.');
			if (blankIndex != -1 && pointIndex != -1) {
				systemType = system.substring(0, blankIndex);
				systemVersion = system.substring(blankIndex + 1, pointIndex + 2);
			}
			isSupported(!(systemType.toLowerCase() == 'android' && systemVersion < 4.3));
		});
	} else {
		isSupported(!(systemType.toLowerCase() == 'android' && systemVersion < 4.3));
	}
}


function sendMyData(idc, pwd, sendType, bluetoothState, onReceiveValue, isIntercept) {
	log("sendMyData", "===== 开始发送数据流程 =====");
	if (isIntercept && isQuickStart('sendMyData')) {
		bluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_SEND_FREQUENTLY);
		return;
	}
	initSendData(idc, pwd, sendType, bluetoothState, onReceiveValue);


	if (connected) {
		log("sendMyData", "已连接，直接获取服务");
		getBLEDeviceServices();
	} else {
		log("sendMyData", "未连接，初始化蓝牙流程");
		isSupportedBLE(function(isSupported) {
			if (isSupported) {
				isBLEAdapterAvailable(function(ava) {
					if (ava) {
						if (needScan()) {
							startBluetoothDevicesDiscovery();
						} else {
							startConnect();
						}
					} else {
						gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ADAPTER_UNAVAILABLE);
					}
				});
			} else {
				bluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_UNSUPPORTED);
			}
		});
	}
}


function sendData(idc, pwd, sendType, bluetoothState, onReceiveValue) {
	log("sendData", "外部调用sendData入口");
	sendMyData(idc, pwd, sendType, bluetoothState, onReceiveValue, true);
}


// 🔥 修复分包并发发送
function dispatcherSend(sendData, noRepeat) {
	log("dispatcherSend", "【串行队列】数据入队: " + sendData);
	lastSendData = sendData;
	var dataLength = sendData.length;


	sendQueue = [];
	isWriting = false;


	for (var i = 0; i < dataLength; i += 20) {
		var end = Math.min(i + 20, dataLength);
		var pack = sendData.substring(i, end);
		sendQueue.push({
			hex: pack,
			noRepeat: noRepeat
		});
		log("dispatcherSend", "【分包入队】" + pack);
	}


	sendNext();
}


function delaySend(data, noRepeat) {
	setTimeout(function() {
		send(data, noRepeat);
	}, 10);
}


function send(hex, noRepeat) {
	log("send", "最终发送hex: " + hex);
	var typedArray = utils.hexStringToArrayBuffer(hex);
	var buffer = typedArray.buffer;
	if (connected) {
		writeBLECharacteristicValue(buffer, function(isSuccess) {});
	}
}


function sendRepet(isSuccess, noRepeat) {
	if (sendRepetTimeOut) clearTimeout(sendRepetTimeOut);
	if (isSuccess) {
		if (!noRepeat) {
			sendRepetTimeOut = setTimeout(() => {
				if (sendMaxTime-- > 0) {
					dispatcherSend(lastSendData, noRepeat);
				} else {
					sendMaxTime = 4;
					gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NO_RESPONSE);
				}
			}, repeatSendTime * 50);
		}
	} else {
		sendRepetTimeOut = setTimeout(() => {
			if (sendMaxTime-- > 0) {
				dispatcherSend(lastSendData, noRepeat);
			} else {
				sendMaxTime = 4;
				gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_SEND_FAILED);
			}
		}, repeatSendTime);
	}
}


function releaseBle() {
	log("releaseBle", "释放所有资源");
	if (discovering) stopScanBle();
	if (connected) disConnect();
	if (isBLEAdapterOpen) closeBluetoothAdapter();
	releaseData();
}


function releaseData() {
	deviceId = '';
	gWriteCharacteristic = '';
	gWriteService = '';
}


export default {
	DEFAULT_CMD_TYPE: DEFAULT_CMD_TYPE,
	sendData: sendData,
	releaseBle: releaseBle,
	DEFAULT_BLUETOOTH_STATE: DEFAULT_BLUETOOTH_STATE,
	getBLEConnectionState: getBLEConnectionState
};