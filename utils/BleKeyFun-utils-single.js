//获取工具类
import utils from './byte-util.js'
//获取控制命令类
import controlCmds from './device-control-cmds.js';
//解析包的类
import parseUtil from './parse-util.js';
//系统api
import appUtil from './app-util.js';
//日志
import logger from './logger.js';

var gWriteService = '';
const WRITE_SERVICE_SHORTHAND = 'FFE5';
var gReadService = '';
const READ_SERVICE_SHORTHAND = 'FFE0';
var gWriteCharacteristic = '';
const WIRTE_CHARACTERISTIC_SHORTHAND = 'FFE9';  
var gReadCharacteristic = '';
const READ_CHARACTERISTIC_SHORTHAND = 'FFE4';

// 原代码中无固定UUID，此处保留空占位（匹配目标模式结构）
var ReadServiceFixed = '';
var WriteServiceFixed = '';
var ReadCharacteristicFixed = '';
var WriteCharacteristicFixed = '';
var ReadRandomCharacteristicFixed = '';

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

/**
 * 默认控制命令
 */
var DEFAULT_CONTROL_CMDS = {
  //开门+上电
  CONTROL_OPEN_DOOR_POWER: 'B510',
  //开门
  CONTROL_OPEN_DOOR: 'B500',
  //锁门 断3.3
  CONTROL_CLOSE_DOOR: 'B501',
  // 锁门+拦截
  // CONTROL_CLOSE_DOOR_OUTAGE: 'B511',//原代码
  //锁门 (260121 改为关锁不断3.3，只针对J24 临时使用)
  CONTROL_CLOSE_DOOR_OUTAGE: 'BB1111',

  // 锁门不断电
  // CONTROL_CLOSE_DOOR_NOT_OUTAGE: 'BB1111',
  //鸣笛
  CONTROL_REMOTE_LOOK_FOR_CAR: 'B400',
  //断电
  CONTROL_CATCHCAR: 'B100',
  //上电
  CONTROL_RELEASECAR: 'B101',
  //后备箱
  CONTROL_OPEN_TRUNK: 'B600',
  //升窗
  CONTROL_UP_WND: 'BA00',
  //降窗
  CONTROL_DOWN_WND: 'BA01',
};

/**
 * 蓝牙状态
 */
var DEFAULT_BLUETOOTH_STATE = {
  //各种错误,可用来关闭dialog
  BLUETOOTH_ERROR: -2,
  //连接失败
  BLUETOOTH_CONNECT_FAILED: -1,
  //连接成功
  BLUETOOTH_CONNECT_SUCESS: 0,
  //蓝牙适配器不可用
  BLUETOOTH_ADAPTER_UNAVAILABLE: 1,
  //打开蓝牙扫描失败
  BLUETOOTH_DEVICES_DISCOVERY_FAILD: 2,
  //频繁调用
  BLUETOOTH_SEND_FREQUENTLY: 3,
  //开始调用senddata发送数据,可以用来显示dialog
  BLUETOOTH_PRE_EXECUTE: 4,
  //没有扫到设备
  BLUETOOTH_NOT_FOUND: 5,
  //不支持BLE
  BLUETOOTH_UNSUPPORTED: 6,
  //发送失败
  BLUETOOTH_SEND_FAILED: 7,
  //无响应
  BLUETOOTH_NO_RESPONSE: 8
};

/**
 * 默认命令类型
 */
var DEFAULT_CMD_TYPE = {
  //开门+上电
  CONTROL_OPEN_DOOR_POWER_TYPE: equireTypeArray[0],
  //开门
  CONTROL_OPEN_DOOR_TYPE: equireTypeArray[1],
  //锁门
  CONTROL_CLOSE_DOOR_TYPE: equireTypeArray[2],
  //锁门+断电
  CONTROL_CLOSE_DOOR_OUTAGE_TYPE: equireTypeArray[3],
  //鸣笛
  CONTROL_REMOTE_LOOK_FOR_CAR_TYPE: equireTypeArray[4],
  //读取gps
  READ_CAR_GPS_TYPE: equireTypeArray[5],
  //读取车辆状态
  READ_CAR_STATE_TYPE: equireTypeArray[6],
  //读取电量、续航里程
  READ_CAR_POWR_MILEAGE: equireTypeArray[7],
  //通电
  CONTROL_RELEASECAR_TYPE: equireTypeArray[9],
  //断电
  CONTROL_CATCHCAR_TYPE: equireTypeArray[10],
  //VIN
  READ_CAR_VIN: equireTypeArray[11],
  //油量
  READ_CAR_OIL: equireTypeArray[12],
  //调试指令
  DEBUG_CMD: equireTypeArray[13],
  //后备箱指令
  CONTROL_OPENTRUNK_TYPE: equireTypeArray[14],
  //升窗指令
  CONTROL_UPWND_TYPE: equireTypeArray[15],
  //降窗指令
  CONTROL_DOWNWND_TYPE: equireTypeArray[16],
  //胎压
  READ_CAR_TIRE: equireTypeArray[17],
  //保养原车数据
  READ_CAR_MAIN: equireTypeArray[18],
  //保养查询参数
  READ_DEV_MAIN: equireTypeArray[19],
  //保养查询参数
  READ_DEV_SPINFO: equireTypeArray[20],
}

/*---------------------------------------------------------------*/
/*---------------------------通用方法-----------------------------*/
/*---------------------------------------------------------------*/

/**
 * 返回连接状态
 */
function getBLEConnectionState() {
  return connected;
}

/**
 * 单位时间内禁止重复操作
 */
function isQuickStart(quickName) {
  var isQuick = false;
  var currentTime = new Date().getTime();
  if (lastClickName == quickName && currentTime - lastExecuteTime < 800) {
    console.log("禁止重复操作");
    isQuick = true;
  }
  lastExecuteTime = currentTime;
  lastClickName = quickName;
  return isQuick;
}

/**
 * 是否需要扫描
 */
function needScan() {
  return deviceId == '';
}

/**
 * 释放数据
 */
function releaseData() {
  deviceId = '';
}

/**
 * 释放资源
 */
function releaseBle() {
  //判断是否在扫描
  if (discovering) {
    logger.e('停止扫描');
    stopScanBle();
  };
  //判断是否连接
  if (connected) {
    logger.e('断开连接');
    disConnect();
  };
  if (isBLEAdapterOpen) {
    logger.e('关闭适配器');
    closeBluetoothAdapter();
  }
  releaseData();
}

/**
 * 睡眠函数
 */
function sleep(numberMillis) {
  var now = new Date();
  var exitTime = now.getTime() + numberMillis;
  while (true) {
    now = new Date();
    if (now.getTime() > exitTime) {
      return;
    }
  }
}

/**
 * 判断是否支持ble
 */
function isSupportedBLE(isSupported) {
  if (!systemType) {
    appUtil.getSystemInfoComplete(function (res) {
      var system = res.system;
      var blankIndex = system.indexOf(' ');
      var pointIndex = system.indexOf('.');
      if (blankIndex != -1 && pointIndex != -1) {
        systemType = system.substring(0, blankIndex);
        systemVersion = system.substring(blankIndex + 1, pointIndex + 2);
      }
    }, function () {
      //判断版本是否支持
      if (systemType.toLowerCase() == 'android' && systemVersion < 4.3) {
        //不支持
        isSupported(false);
      } else {
        isSupported(true);
      }
    });
  } else {
    //判断版本是否支持
    if (systemType.toLowerCase() == 'android' && systemVersion < 4.3) {
      //不支持
      isSupported(false);
    } else {
      isSupported(true);
    }
  }
}

/*---------------------------------------------------------------*/
/*-----------------------蓝牙适配器相关方法-------------------------*/
/*---------------------------------------------------------------*/

/**
 * 蓝牙适配器是否可用
 */
function isBLEAdapterAvailable(onResult) {
  if (isBLEAdapterOpen) {
    //适配器已经打开
    //获取适配器状态
    if (!available) {
      getBluetoothAdapterState(function (res) {
        setBLEAdapterState(res.available, res.discovering);
        onResult(res.available);
      });
    } else {
      onResult(available);
    }
  } else {
    //打开适配器
    openBluetoothAdapter(function (openSuccess) {
      if (openSuccess) {
        getBluetoothAdapterState(function (res) {
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
 * 打开蓝牙适配器
 */
function openBluetoothAdapter(cOpenBluetoothAdapter) {
  uni.openBluetoothAdapter({
    success: function (res) {
      console.log(res);
      isBLEAdapterOpen = true;
      cOpenBluetoothAdapter(true);
    },
    fail: function (res) {
      console.log(res);
      if (res.errMsg != "openBluetoothAdapter:fail already opened") {
        isBLEAdapterOpen = false;
        setBLEAdapterState(false, false);
        cOpenBluetoothAdapter(false);
      } else {
        isBLEAdapterOpen = true;
        cOpenBluetoothAdapter(true);
      }
    }
  });
}

/**
 * 设置adapter状态
 */
function setBLEAdapterState(ava, discovery) {
  available = ava;
  discovering = discovery;
}

/**
 * 获取BleAdapter状态
 */
function getBluetoothAdapterState(onBleAdapterState) {
  uni.getBluetoothAdapterState({
    success: function (res) {
      console.log(res);
      onBleAdapterState(res);
    }, fail: function (res) {
      console.log(res);
      onBleAdapterState(res);
    }
  });
}

/**
 * 监听蓝牙适配器状态变化事件
 */
function onBluetoothAdapterStateChange() {
  uni.onBluetoothAdapterStateChange(function (res) {
    logger.e(`adapterState changed, now is`, res);
    setBLEAdapterState(res.available, res.discovering);
  });
}

/**
 * 关闭蓝牙模块，使其进入未初始化状态
 */
function closeBluetoothAdapter() {
  uni.closeBluetoothAdapter({
    success: function (res) {
      console.log(res);
      isBLEAdapterOpen = false;
    }, fail: function (res) {
      console.log(res);
    }
  });
}

/*---------------------------------------------------------------*/
/*-----------------------蓝牙连接相关方法-------------------------*/
/*---------------------------------------------------------------*/

/**
 * 开始连接
 */
function startConnect() {
  uni.createBLEConnection({
    deviceId: deviceId,
    success: function (res) {
      /**
       * 连接成功，后开始获取设备的服务列表
       */
	  console.log(res,'99999999')
      gWriteService = '';
      gWriteCharacteristic = '';
      gReadService = '';
      gReadCharacteristic = '';
      getBLEDeviceServices();
    },
    fail: function (res) {
      //连接失败
      console.log(res);
    }
  });
}

/**
 * 监听低功耗蓝牙连接状态的改变事件
 */
function onBLEConnectionStateChange(onStateChanged) {
  uni.onBLEConnectionStateChange(function (res) {
    logger.e(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
    onStateChanged(res.connected);
  });
}

/**
 * 断开蓝牙连接
 */
function disConnect() {
  uni.closeBLEConnection({
    deviceId: deviceId,
    success: function (res) {
      console.log(res);
      connected = false;
    },
    fail: function (res) {
      console.log(res);
    }
  });
}

/*---------------------------------------------------------------*/
/*-----------------------蓝牙搜索相关方法-------------------------*/
/*---------------------------------------------------------------*/

/**
 * 开始搜索
 */
function startBluetoothDevicesDiscovery() {
  //开始搜索
  uni.startBluetoothDevicesDiscovery({
    //services: [WRITE_SERVICE_SHORTHAND],
    success: function (res) {
      console.log(res);
      discovering = res.isDiscovering;
    },
    fail: function (res) {
      if (res.errMsg != "startBluetoothDevicesDiscovery:fail already discovering devices") {
        console.log(res);
        discovering = false;
        gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
        gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_DEVICES_DISCOVERY_FAILD);
      } else {
        console.log(res);
        discovering = true;
      }
    }
  });
  discoverTimeout = setTimeout(function () {
    if (discovering) {
      gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
      gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NOT_FOUND);
      releaseBle();
    }
  }, devicesDiscoveryTimeOut);
}

/**
 * 监听寻找到新设备的事件
 */
function onBluetoothDeviceFound() {
  //安卓手机6.0系统及以上 必须开启微信定位权限才能使用 蓝牙搜索功能
  uni.onBluetoothDeviceFound(function (devices) {
	  console.log(111111,gIdc,'===2=2=22=2=2=2=2=')
    logger.e('device found:' + devices.devices[0].name);
    if (gIdc == devices.devices[0].name || gIdc == devices.devices[0].localName ||
      utils.hexCharCodeToStr(utils.buf2hex(devices.devices[0].advertisData)).indexOf(gIdc) != -1) {
      deviceId = devices.devices[0].deviceId;
      //监听连接状态
      onBLEConnectionStateChange(function (connectState) {
        //设置连接状态
        connected = connectState;
        if (connectState) {
          gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_CONNECT_SUCESS);
        } else {
          gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
        }
      });
      /**
       * 监听蓝牙适配器状态
       */
      onBluetoothAdapterStateChange();
      /**
       * 获取设备发过来的数据
       */
      // onBLECharacteristicValueChange();
      //停止扫描
      stopScanBle();
      clearTimeout(discoverTimeout);
      if (!isQuickStart('onBluetoothDeviceFound')) {
        startConnect();
      }
    }
  });
}

/**
 * 停止蓝牙扫描
 */
function stopScanBle() {
  uni.stopBluetoothDevicesDiscovery({
    success: function (res) {
      console.log(res);
      discovering = false;
      logger.e('stopScanBle-true discovering:' + discovering);
    },
    fail: function (res) {
      console.log(res);
      discovering = false;
      logger.e('stopScanBle-false discovering:' + discovering);
    }
  });
}

/*---------------------------------------------------------------*/
/*---------------------蓝牙服务和特征相关方法-----------------------*/
/*---------------------------------------------------------------*/

/**
 * 获取设备的服务列表
 */
function getBLEDeviceServices() {
  uni.getBLEDeviceServices({
    deviceId: deviceId,
    success: function (res) {
      for (var i = 0; i < res.services.length; i++) {
        if (res.services[i].uuid.indexOf(WRITE_SERVICE_SHORTHAND) != -1) {
          gWriteService = res.services[i].uuid;
        }
        if (res.services[i].uuid.indexOf(READ_SERVICE_SHORTHAND) != -1) {
          gReadService = res.services[i].uuid;
        }
      }
      logger.e('device设备的读服务id:', gWriteService);
      logger.e('device设备的写服务id:', gReadService);
      if (gWriteService != '' && gReadService != '' && (gWriteCharacteristic == '' || gReadCharacteristic == '')) {
        getBLEDeviceReadCharacteristics();
      }
    }
  });
}

/**
 * 获取蓝牙设备某个服务中的所有 characteristic（特征值）
 */
function getBLEDeviceReadCharacteristics() {
  uni.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: gReadService,
    success: function (res) {
      for (var i = 0; i < res.characteristics.length; i++) {
        if (res.characteristics[i].uuid.indexOf(READ_CHARACTERISTIC_SHORTHAND) != -1) {
          gReadCharacteristic = res.characteristics[i].uuid;
        }
      }
      logger.e('device设备的读特征值id:' + gReadCharacteristic);
      if (gReadCharacteristic != '') {
        notifyBLECharacteristicValueChange();
      }
    }, fail: function (res) {
      console.log(res);
    }
  });
}

/**
 * 启用低功耗蓝牙设备特征值变化时的 notify 功能，订阅特征值
 */
function notifyBLECharacteristicValueChange() {
  uni.notifyBLECharacteristicValueChange({
    deviceId: deviceId,
    serviceId: gReadService,
    characteristicId: gReadCharacteristic,
    state: true,
    success: function (res) {
      console.log(res);
	  onBLECharacteristicValueChange()
      if (gWriteCharacteristic == '') {
        getBLEDeviceWriteCharacteristics();
      }
      appUtil.getSystemInfoComplete(function (res) {
        var system = res.system;
        var blankIndex = system.indexOf(' ');
        var pointIndex = system.indexOf('.');
        if (blankIndex != -1 && pointIndex != -1) {
          systemType = system.substring(0, blankIndex);
          systemVersion = system.substring(blankIndex + 1, pointIndex + 2);
        }
      }, function () {
        uni.setBLEMTU({
          deviceId: deviceId,
          mtu: 240,
          success: function (res) {
            console.log("MTU modify success");
          },
          fail: function (res) {
            console.log("MTU modify fail");
          }
        });
      });
    },
    fail: function (res) {
      console.log(res);
    },
  });
}

/**
 * 获取写的特征值
 */
function getBLEDeviceWriteCharacteristics() {
  uni.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: gWriteService,
    success: function (res) {
      for (var j = 0; j < res.characteristics.length; j++) {
        if (res.characteristics[j].uuid.indexOf(WIRTE_CHARACTERISTIC_SHORTHAND) != -1) {
          gWriteCharacteristic = res.characteristics[j].uuid;
          //写出数据
          if (equireTypeArray.indexOf(gSendType) != -1) {
			 
			  setTimeout(function(){
				  sendMyData(gIdc, gPwd, gSendType, gBluetoothState, gOnReceiveValue, false);
			  },500)
            
          }
        }
      }
	  
      logger.e('device设备的写特征值id:' + gWriteCharacteristic);
    }, fail: function (res) {
      console.log(res);
    }
  });
}

/**
 * 向低功耗蓝牙设备特征值中写入二进制数据
 */
function writeBLECharacteristicValue(buffer, writeBLECharacteristicValue) {
	setTimeout(function(){
		uni.writeBLECharacteristicValue({
		  deviceId: deviceId,
		  serviceId: gWriteService,
		  characteristicId: gWriteCharacteristic,
		  value: buffer,
		  success: function (res) {
		    writeBLECharacteristicValue(true);
		  },
		  fail: function (res) {
		    console.log(res,'----------------=====');
		    writeBLECharacteristicValue(false);
		  }
		});
	},300)

}

/**
 * 获取设备发过来的数据
 */
function onBLECharacteristicValueChange() {
	console.log('========================---55-65-6-6')
  uni.onBLECharacteristicValueChange(function (characteristic) {
	  console.log(characteristic,'characteristiccharacteristiccharacteristic')
    var resultArrayBufferData = characteristic.value;
    var receiverHexData = utils.buf2hex(resultArrayBufferData);
    var arrayData = utils.hexStringToArray(receiverHexData);
    logger.e('characteristic array value:', arrayData + "  hex value:" + receiverHexData);
    for (var response = parseUtil.filterOnePage(arrayData); response != null; response = parseUtil.filterOnePage(null)) {
      if (response != null) {
        //成功获取一包数据
        var hex = utils.buf2hex(response);
        logger.e("收到一条完整的包数据 array value：" + response + "  hex value:" + hex);
        if (lastReceiverData == hex) {
          //收到两次相同的结果，原因：回复6001太慢，触发设备重发机制，重发间隔500ms
          logger.e("收到两次相同的结果，原因：回复6001太慢，触发设备重发机制，重发间隔500ms");
          return;
        }
        lastReceiverData = hex;
        //解析完整包数据
        parseUtil.receiveData(response, lastControlCmd, DEFAULT_CONTROL_CMDS, function (data) {
          if (data.reply && (controlCmds.lastSendSerialNum = data.serilalOBDNum)) {
            //发送6001通用应答
            logger.e('回复6001通用应答');
            dispatcherSend(controlCmds.getNormalCmd(data.serilalOBDNum), true);
          }
          //controlType：控制类型 1，gps 2,状态读取 3，里程电量 4，控制 0,收到6001
          if (data.controlType == 0) {
            if (sendRepetTimeOut) {
              logger.e('取消重复发送:' + (new Date().getTime()));
              clearTimeout(sendRepetTimeOut);
              sendRepetTimeOut = '';
              sendMaxTime = 4;
            }
          } else {
            gOnReceiveValue(data);
          }
        });
      }
    }
  });
  logger.e('22222--==')
}

/*---------------------------------------------------------------*/
/*------------------------初始化数据方法--------------------------*/
/*---------------------------------------------------------------*/

/**
 * 初始化数据
 */
function initSendData(idc, pwd, sendType, bluetoothState, onReceiveValue) {
  if (gPwd != pwd) {
    gPwd = pwd;
  }
  if (gSendType != sendType) {
    gSendType = sendType;
  }
  if (gBluetoothState != bluetoothState) {
    gBluetoothState = bluetoothState;
  }
  if (gOnReceiveValue != onReceiveValue) {
    gOnReceiveValue = onReceiveValue;
  }
  if (gIdc != idc) {
    gIdc = idc;
  }
  onBluetoothDeviceFound();
  sendMaxTime = 4;
}

/*---------------------------------------------------------------*/
/*------------------------指令构建方法--------------------------*/
/*---------------------------------------------------------------*/

/**
 * 创建发送的指令
 */
function parseCmd() {
  var cmd = '';
  //发送数据
  switch (gSendType) {
    case 1: //开门 + 上电
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_OPEN_DOOR_POWER;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 2://开门
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_OPEN_DOOR;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 3://锁门
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_CLOSE_DOOR;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 4://锁门+断电(260121 改为关锁不断电，只针对J24 临时使用)
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_CLOSE_DOOR_OUTAGE;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 5://鸣笛
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_REMOTE_LOOK_FOR_CAR;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 6://读取gps
      cmd = controlCmds.getGPSDataCmd();
      break;
    case 7://读取车辆状态
      cmd = controlCmds.getDeviceStateCmd();
      break;
    case 8://读取电量、续航里程
      cmd = controlCmds.getDeviceCarInfo();
      break;
    case 9://回复通用应答6001
      cmd = controlCmds.getNormalCmd(serialNum);
      break;
    case 10://上电
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_RELEASECAR;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 11://断电
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_CATCHCAR;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 12://读取VIN
      cmd = controlCmds.getDeviceCarVIN();
      break;
    case 13://读取油量
      cmd = controlCmds.getDeviceCarOIL();
      break;
    case 14://DEBUG指令
      cmd = controlCmds.getDEBUGDataCmd();
      break;
    case 15: //后备箱
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_OPEN_TRUNK;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 16://升窗
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_UP_WND;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 17://降窗
      lastControlCmd = DEFAULT_CONTROL_CMDS.CONTROL_DOWN_WND;
      cmd = controlCmds.getDeviceControlCmd(lastControlCmd, gPwd);
      break;
    case 18://读取胎压
      cmd = controlCmds.getDeviceCarTIRE();
      break;
    case 19://保养原车数据
      cmd = controlCmds.getDeviceCarMAIN();
      break;
    case 20://保养查询参数
      cmd = controlCmds.getDeviceDevMAIN();
      break;
    case 21://特殊数据查询
      cmd = controlCmds.getDeviceDevSPINFO();
      break;
  }
  return cmd;
}

/*---------------------------------------------------------------*/
/*------------------------数据发送方法--------------------------*/
/*---------------------------------------------------------------*/

/**
 * 发送数据（外部调用入口）
 */
function sendData(idc, pwd, sendType, bluetoothState, onReceiveValue) {
  sendMyData(idc, pwd, sendType, bluetoothState, onReceiveValue, true);
}

/**
 * 发送数据核心逻辑
 */
function sendMyData(idc, pwd, sendType, bluetoothState, onReceiveValue, isIntercept) {
  if (isIntercept && isQuickStart('sendMyData')) {
    console.log('不可以频繁点击');
    bluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_SEND_FREQUENTLY);
    return;
  }
  if (isIntercept) {
    //用户的主动行为
    bluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_PRE_EXECUTE);
  }
  initSendData(idc, pwd, sendType, bluetoothState, onReceiveValue);

  if (connected) {
    // 已连接，发送数据

    dispatcherSend(parseCmd(), false);
  } else {
    isSupportedBLE(function (isSupported) {
      if (isSupported) {
        isBLEAdapterAvailable(function (ava) {
          if (ava) {
            if (needScan()) {
              //适配器可用，并已经打开适配器
              startBluetoothDevicesDiscovery();
            } else {
              //开始连接
              startConnect();
            }
          } else {
            //适配器不可用
            gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
            gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ADAPTER_UNAVAILABLE);
          }
        });
      } else {
        bluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
        bluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_UNSUPPORTED);
      }
    });
  }
}

/**
 * 分片发送数据
 */
function dispatcherSend(sendData, noRepeat) {
  lastSendData = sendData;
  var dataLength = sendData.length;
  var num = dataLength / 40;
  send(sendData);
 //  if (num == 0) {
 //    send(sendData.substring(num, dataLength));
	// console.log(sendData.substring(num, dataLength),'5555')
 //  } else {
 //    for (var i = 0; i < num; i++) {
 //      var start = i * 40;
 //      var end = start + 40;
 //      end = end > dataLength ? dataLength : end;
 //      var data = sendData.substring(start, end);
	//   // if(i==0){
	// 	 //  delaySend(data, noRepeat);
	//   // }else{
	// 	 //   setTimeout(function(){
	// 		//      delaySend(data, noRepeat);
	// 	 //   },500) 
	//   // }
	//   // delaySend(data, noRepeat);
	//   // sleep(1000)
      
 //    }
 //  }
}

/**
 * 延时发送
 */
function delaySend(data, noRepeat) {
	console.log(noRepeat,'44444')
  var d = data;
  setTimeout(function () {
    send(d, noRepeat);
  }, 200);
}

/**
 * 发送数据
 */
function send(hex, noRepeat) {
	console.log(noRepeat,'333333333333333')
  //发送数据
  var typedArray = utils.hexStringToArrayBuffer(hex);
  var buffer = typedArray.buffer
  logger.e(typedArray);
  logger.e("发送数据：" + hex);
  if (connected) {
    writeBLECharacteristicValue(buffer, function (isSuccess) {
      if (isSuccess) {
		  
        logger.e("指令发送成功:" + (new Date().getTime())+'hex'+hex);
		console.log(1111)
        // if (noRepeat)
        //   releaseBle();
        // else
        //   sendRepet(true, noRepeat);
      } else {
        logger.e("指令发送失败:" + (new Date().getTime())+'hex'+hex);
        // sendRepet(false, noRepeat);
      }
    });
  }
}

/**
 * 重复发送
 */
function sendRepet(isSuccess, noRepeat) {
  if (sendRepetTimeOut) {
    logger.e('连续发送,取消上次设置的重复发送');
    clearTimeout(sendRepetTimeOut);
    sendRepetTimeOut = '';
  }
  if (isSuccess) {
    if (!noRepeat) {
      console.log('设置--500ms后,重新发送');
      sendRepetTimeOut = setTimeout(function () {
        if (sendMaxTime > 0) {
          console.log(`重复发送${sendMaxTime}:` + lastSendData);
          sendMaxTime--;
          dispatcherSend(lastSendData, noRepeat);
        } else {
          console.log('4次发送无响应:' + lastSendData);
          sendMaxTime = 4;
          gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
          gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_NO_RESPONSE);
        }
      }, repeatSendTime * 50);
    }
  } else {
    sendRepetTimeOut = setTimeout(function () {
      if (sendMaxTime > 0) {
        logger.e(`重复发送${sendMaxTime}:` + lastSendData);
        sendMaxTime--;
        dispatcherSend(lastSendData, noRepeat);
      } else {
        logger.e('4次发送失败:' + lastSendData);
        sendMaxTime = 4;
        gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_ERROR);
        gBluetoothState(DEFAULT_BLUETOOTH_STATE.BLUETOOTH_SEND_FAILED);
      }
    }, repeatSendTime);
  }
}

/*---------------------------------------------------------------*/
/*------------------------外部导出方法--------------------------*/
/*---------------------------------------------------------------*/

export default {

  sendData: sendData,
  releaseBle: releaseBle,
  DEFAULT_BLUETOOTH_STATE: DEFAULT_BLUETOOTH_STATE,
};