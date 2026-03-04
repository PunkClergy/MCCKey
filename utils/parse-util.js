// 获取工具类
import utils from './byte-util.js';
import { bytesToInt } from './byte-util.js';

// 获取全局App实例（适配uni-app）
const app = getApp ? getApp() : getApp({ allowDefault: true });

/*---------------------------------------------------------------*/
/*---------------------------全局变量-----------------------------*/
/*---------------------------------------------------------------*/

/**
 * 粘包处理的缓存数据
 */
var packageContent = null;

/*---------------------------------------------------------------*/
/*---------------------------通用方法-----------------------------*/
/*---------------------------------------------------------------*/

/**
 * CRC校验 - 计算CRC值
 * @param {Array} data 待校验数据
 * @param {Number} start 起始索引
 * @param {Number} length 校验长度
 * @returns {Number} 计算出的CRC值
 */
function getCRCValueWith(data, start, length) {
  var crc = 0xffff;
  for (var i = start; i < length + start; i++) {
    crc = (crc >> 8) ^ app?.globalData?.CRC_TABLE_XW[(crc ^ data[i]) & 0xff];
  }
  return crc;
}

/**
 * 验证CRC是否正确
 * @param {Array} data 待校验的完整数据包
 * @returns {Boolean} CRC校验结果
 */
function isRightCrc(data) {
  var crcValue = getCRCValueWith(data, 4, data.length - 6);
  var lenData = data.slice(data.length - 2, data.length);
  var crcCurrent = utils.getShortWith(lenData, false);
  return (crcValue == crcCurrent);
}

/**
 * 粘包处理 - 从缓存中提取完整的数据包
 * 使用示例：
 * for (var response = filterOnePage(a); response != null; response = filterOnePage(null)) {
 *   if (response != null) {
 *     // 处理完整数据包
 *   }
 * }
 * @param {Array} content 新接收的字节数据（可为null）
 * @returns {Array|null} 提取出的完整数据包，无完整包时返回null
 */
function filterOnePage(content) {
  if (packageContent == null) {
    packageContent = new Array();
  }
  if (content != null) {
    packageContent = packageContent.concat(content);
  }

  var count = packageContent.length;
  var headerIndex = -1;

  for (var i = 0; i < count; i++) {
    var b0 = packageContent[i];
    var firstint = b0 & 0xff;

    // 找到包头标识 0x7E
    if (0x7E == firstint) {
      headerIndex = i;
      // 数据长度至少包含包头+长度字段
      if (headerIndex + 4 <= count) {
        var lenData = packageContent.slice(headerIndex + 2, headerIndex + 2 + 2);
        var size = utils.getShortWith(lenData, true);
        var onePackageLen = 4 + size;

        // 验证数据包是否完整
        if (onePackageLen + headerIndex <= count && onePackageLen + headerIndex >= 0) {
          var subData = packageContent.slice(headerIndex, headerIndex + onePackageLen);

          // CRC校验通过则返回完整包，并清理缓存
          if (isRightCrc(subData)) {
            packageContent = packageContent.slice(headerIndex + onePackageLen, count);
            return subData;
          }
        }
      }
    }
  }
  return null;
}

/*---------------------------------------------------------------*/
/*-------------------------核心解析方法---------------------------*/
/*---------------------------------------------------------------*/

/**
 * 构建解析结果对象
 * @param {Number} controlType 控制类型：1-GPS 2-状态读取 3-里程电量 4-控制 5-VIN 6-油量 7-debug响应 8-胎压 9-保养车辆参数 10-保养设备参数 11-车型特殊数据
 * @param {Number} serilalOBDNum 流水号
 * @param {Any} result 解析结果数据
 * @param {Boolean} reply 是否需要回复6001通用应答
 * @returns {Object} 标准化的解析结果
 */
function parseResult(controlType, serilalOBDNum, result, reply) {
  var data = {};
  data.controlType = controlType;
  data.serilalOBDNum = serilalOBDNum;
  data.result = result;
  data.reply = reply;
  return data;
}

/**
 * 处理一个完整的包数据
 * @param {Array} data 完整的字节数组数据包
 * @param {String} lastControlCmd 最后一次发送的控制指令
 * @param {Object} DEFAULT_CONTROL_CMDS 控制指令常量配置
 * @param {Function} callback 解析结果回调函数
 */
function receiveData(data, lastControlCmd, DEFAULT_CONTROL_CMDS, callback) {
  var s = utils.buf2hex(data);
  var length = data.length;
  if (length > 7) {
    // 解析流水号
    var currentOBDSerialNum = [data[4], data[5]];
    var currentOBDSerialNumShort = utils.getShortWith(currentOBDSerialNum, true);
    // 解析命令标识符
    var cmdIdentifier = [data[6], data[7]];
    var cmdIdentifierShort = utils.getShortWith(cmdIdentifier, true);
    // 分发到对应解析逻辑
    dispatcherState(cmdIdentifierShort, data, length, s, currentOBDSerialNum, lastControlCmd, DEFAULT_CONTROL_CMDS, callback);
  }
}

/**
 * 指令分发 - 根据命令标识符分发到对应解析逻辑
 * @param {Number} cmdIdentifierText 命令标识符（16进制转10进制）
 * @param {Array} data 完整数据包
 * @param {Number} length 数据包长度
 * @param {String} receiver 16进制字符串形式的数据包
 * @param {Array} serilalOBDNum 流水号字节数组
 * @param {String} lastControlCmd 最后一次发送的控制指令
 * @param {Object} DEFAULT_CONTROL_CMDS 控制指令常量配置
 * @param {Function} callback 解析结果回调函数
 */
function dispatcherState(cmdIdentifierText, data, length, receiver,
  serilalOBDNum, lastControlCmd, DEFAULT_CONTROL_CMDS, callback) {

  if (0x0295 == cmdIdentifierText) {
    console.log("---------------收到一条控制信息-----------------");
    var result = data[length - 7];
    callback(parseResult(4, serilalOBDNum, parseControlResult(lastControlCmd, DEFAULT_CONTROL_CMDS, result), true));
  }
  else if (0x0283 == cmdIdentifierText) {
    console.log("---------------收到一条GPS信息-----------------");
    var result = parseZisGps(receiver);
    callback(parseResult(1, serilalOBDNum, result, true));
  }
  else if (0x0A07 == cmdIdentifierText) {
    console.log("---------------收到一条车辆状态信息-----------------");
    var arr = parseZisCarStatus(receiver);
    var result = analyticStatusNew(arr[1], arr[2], arr[3]);
    callback(parseResult(2, serilalOBDNum, result, true));
  }
  else if (0x0299 == cmdIdentifierText) {
    console.log("---------------收到一条电量、里程信息-----------------");
    var result = parseZisMileRange(receiver);
    callback(parseResult(3, serilalOBDNum, result, true));
  }
  else if (0x029B == cmdIdentifierText) {
    console.log("---------------收到一条VIN信息-----------------");
    var result = parseZisVIN(receiver);
    callback(parseResult(5, serilalOBDNum, result, true));
  }
  else if (0x020B == cmdIdentifierText) {
    console.log("---------------收到一条油量信息-----------------");
    var result = parseZisOIL(receiver);
    callback(parseResult(6, serilalOBDNum, result, true));
  }
  else if (0x099A == cmdIdentifierText) {
    console.log("---------------收到一条调试信息-----------------");
    var result = parseZisDebug(receiver);
    callback(parseResult(7, serilalOBDNum, result, true));
  }
  else if (0x021B == cmdIdentifierText) {
    console.log("---------------收到一条胎压信息-----------------");
    var result = parseZisTIRE(receiver);
    callback(parseResult(8, serilalOBDNum, result, true));
  }
  else if (0x022B == cmdIdentifierText) {
    console.log("---------------收到一条原车保养信息-----------------");
    var result = parseZisCarMAIN(receiver);
    callback(parseResult(9, serilalOBDNum, result, true));
  }
  else if (0x023B == cmdIdentifierText) {
    console.log("---------------收到一条设备保养参数-----------------");
    var result = parseZisDevMAIN(receiver);
    callback(parseResult(10, serilalOBDNum, result, true));
  }
  else if (0x024B == cmdIdentifierText) {
    console.log("---------------收到一条车型特殊数据-----------------");
    var result = parseZisDevSPINFO(receiver);
    callback(parseResult(11, serilalOBDNum, result, true));
  }
  else if (0x6001 == cmdIdentifierText) {
    console.log("---------------收到一条通用应答信息-----------------");
    if (length > 10) {
      var state = utils.getShortWith(data[10], true);
      if (state == 0x00) {
        console.log("------------成功解析6001-----");
        callback(parseResult(0, serilalOBDNum, '', false));
      }
    }
  }
}

/*---------------------------------------------------------------*/
/*-------------------------业务解析方法---------------------------*/
/*---------------------------------------------------------------*/

/**
 * 解析控制结果
 * @param {String} lastControlCmd 最后一次发送的控制指令
 * @param {Object} DEFAULT_CONTROL_CMDS 控制指令常量配置
 * @param {Number} resultCode 控制结果码
 * @returns {String} 解析后的控制结果描述
 */
function parseControlResult(lastControlCmd, DEFAULT_CONTROL_CMDS, resultCode) {
  var result = '';
  console.log("\r\n------------------------------------------------" + resultCode + "\r\n--------------------------------------------------------------")
  switch (resultCode) {
    case 0x00:// 成功
      if (lastControlCmd == DEFAULT_CONTROL_CMDS.CONTROL_OPEN_DOOR_POWER) {
        result = '开门+上电 成功';
      } else if (lastControlCmd == DEFAULT_CONTROL_CMDS.CONTROL_OPEN_DOOR) {
        result = '开门 成功';
      } else if (lastControlCmd == DEFAULT_CONTROL_CMDS.CONTROL_CLOSE_DOOR) {
        result = '锁门 成功';
      } else if (lastControlCmd == DEFAULT_CONTROL_CMDS.CONTROL_CLOSE_DOOR_OUTAGE) {
        result = '锁门+断电 成功';
      } else if (lastControlCmd == DEFAULT_CONTROL_CMDS.CONTROL_REMOTE_LOOK_FOR_CAR) {
        result = '鸣笛 成功';
      } else if (lastControlCmd == DEFAULT_CONTROL_CMDS.CONTROL_RELEASECAR) {
        result = '上电 成功';
      } else if (lastControlCmd == DEFAULT_CONTROL_CMDS.CONTROL_CATCHCAR) {
        result = '断电 成功';
      } else {
        result = '成功';
      }
      break;
    case 0x01:// 总线忙
      result = "设备忙!";
      break;
    case 0x02:// 不支持
      result = "不支持当前指令!";
      break;
    case 0x04:// 收到控制时间超过有效期(10分钟)
      result = "时间不一致!";
      break;
    case 0x06:// 无效授权
      result = "无效授权";
      break;
    case 0x19:// ON状态不执行
      result = "ON状态不执行!";
      break;
    case 0x1A:// 原车PKE操作退出执行
      result = "车辆已被原车接管,请拨掉钥匙重试!";
      break;
    case 0x1B:// 门未关
      result = "锁车失败(门未关)!";
      break;
    case 0x1C:// 动作执行前执行失败
      result = "前置动作失败!";
      break;
    case 0x1D:// 中控锁未锁
      result = "关锁失败,请重试!";
      break;
    case 0x1E:// 开锁后中控锁为锁状态
      result = "开锁失败,请重试!";
      break;
    case 0x38:
      result = "控制失败,请关闭车灯和ACC!";
      break;
    default:
      result = "控制失败(代码:" + resultCode + "),请重试!";
      break;
  }
  return result;
}

/**
 * 解析GPS数据
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} GPS解析结果对象
 */
function parseZisGps(data) {
  var bytes = utils.hexStringToArray(data);
  var gpsBean = new Object();
  var n = 9;
  n += 4;

  gpsBean.Longitude = utils.converTude2Double(bytes, n);
  n += 4;
  gpsBean.Latitude = utils.converTude2Double(bytes, n);
  n += 4;

  gpsBean.Speed = utils.bytesToShort(bytes[n], bytes[n + 1]) / 10;
  n += 2;

  gpsBean.Direction = bytes[n++] & 0xff;
  gpsBean.Altitude = Math.min(30000, utils.bytesToShort(bytes[n], bytes[n + 1]));
  n += 2;

  gpsBean.SalState = -1;
  gpsBean.BindState = bytes[n++] & 0xff;
  gpsBean.SalCount = bytes[n++] & 0xff;

  return gpsBean;
}

/**
 * 解析续航里程、电量、总里程、转速、车速等信息
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} 里程电量解析结果对象
 */
function parseZisMileRange(data) {
  var bytes = utils.hexStringToArray(data);
  var mileBean = new Object();
  var n = 10;
  
  // 剩余电量
  if (bytes[n] == 0x01)
    mileBean.RemainBattery = bytes[n + 1];
  else if (bytes[n] == 0x02)
    mileBean.RemainBattery = -1;
  else if (bytes[n] == 0x03)
    mileBean.RemainBattery = -2;
  else
    mileBean.RemainBattery = '';
  n += 2;

  // 续航里程
  if (bytes[n] == 0x01)
    mileBean.MileRange = utils.bytesToShort(bytes[n + 1], bytes[n + 2]);
  else if (bytes[n] == 0x02)
    mileBean.MileRange = -1;
  else if (bytes[n] == 0x03)
    mileBean.MileRange = -2;
  else
    mileBean.MileRange = '';
  n += 3;

  // 总里程
  if (bytes[n] == 0x01)
    mileBean.TotalMileage = utils.bytesToInt(bytes[n + 1], bytes[n + 2], bytes[n + 3], bytes[n + 4]);
  else if (bytes[n] == 0x02)
    mileBean.TotalMileage = -1;
  else if (bytes[n] == 0x03)
    mileBean.TotalMileage = -2;
  else
    mileBean.TotalMileage = '';
  n += 5;

  // 发动机转速
  if (bytes[n] == 0x01)
    mileBean.Rpm = utils.bytesToShort(bytes[n + 1], bytes[n + 2]);
  else if (bytes[n] == 0x02)
    mileBean.Rpm = -1;
  else if (bytes[n] == 0x03)
    mileBean.Rpm = -2;
  else
    mileBean.Rpm = '';
  n += 3;

  // 车速
  if (bytes[n] == 0x01)
    mileBean.Speed = utils.bytesToShort(bytes[n + 1], bytes[n + 2]);
  else if (bytes[n] == 0x02)
    mileBean.Speed = -1;
  else if (bytes[n] == 0x03)
    mileBean.Speed = -2;
  else
    mileBean.Speed = '';
  n += 3;

  mileBean.CmdID = utils.bytesToInt(bytes[n], bytes[n + 1], bytes[n + 2], bytes[n + 3]);
  n += 4;

  return mileBean;
}

/**
 * 解析VIN码
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} VIN解析结果对象
 */
function parseZisVIN(data) {
  var bytes = utils.hexStringToArray(data);
  var VINBean = new Object();
  var n = 8;
  
  // 验证VIN数据是否有效
  if (
    bytes[n] != 0x00 && bytes[n+1] != 0x00 && bytes[n+2] != 0x00 && bytes[n+3] != 0x00 &&
    bytes[n+4] != 0x00 && bytes[n+5] != 0x00 && bytes[n+6] != 0x00 && bytes[n+7] != 0x00 &&
    bytes[n+8] != 0x00 && bytes[n+9] != 0x00 && bytes[n+10] != 0x00 && bytes[n+11] != 0x00 &&
    bytes[n+12] != 0x00 && bytes[n+13] != 0x00 && bytes[n+14] != 0x00 && bytes[n+15] != 0x00 &&
    bytes[n+16] != 0x00
  ) {
    VINBean.VIN = utils.buf2string(bytes).substr(8,17);
    VINBean.VIN = VINBean.VIN.toUpperCase();
  } else {
    VINBean.VIN = -1;
  }
  return VINBean;
}

/**
 * 解析油量信息
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} 油量解析结果对象
 */
function parseZisOIL(data) {
  var bytes = utils.hexStringToArray(data);
  var OilBean = new Object();

  var num = 13;
  if (bytes[num] == 0x01) {
    var n = 16;
    if (bytes[n] == 0xff) {
      OilBean.OilPst = -1;
      OilBean.OilVal = -1;
    } else if (bytes[n] == 0x01) {
      OilBean.OilPst = bytes[n+4];
      OilBean.OilVal = -1;
    } else if (bytes[n] == 0x00) {
      OilBean.OilPst = -1;
      OilBean.OilVal = utils.bytesToInt(bytes[n+1], bytes[n+2], bytes[n+3], bytes[n+4])/1000;
    }
  } else if (bytes[num] == 0x02) {
    var n = 16;
    if (bytes[n] == 0x01) {
      OilBean.OilPst = bytes[n+4];
      OilBean.OilVal = utils.bytesToInt(bytes[n+8], bytes[n+9], bytes[n+10], bytes[n+11])/1000;
    } else if (bytes[n] == 0x00) {
      OilBean.OilPst = bytes[n+11];
      OilBean.OilVal = utils.bytesToInt(bytes[n+1], bytes[n+2], bytes[n+3], bytes[n+4])/1000;
    }
  }
  return OilBean;
}

/**
 * 解析胎压信息
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} 胎压解析结果对象
 */
function parseZisTIRE(data) {
  var bytes = utils.hexStringToArray(data);
  var TireBean = new Object();

  var num = 13;
  if (bytes[num] == 0x01) {
    var n = 16;
    if (bytes[n] == 0x01) {
      TireBean.TireSta = '支持胎压';
      TireBean.LFTire = bytes[n+1]/10;
      TireBean.RFTire = bytes[n+2]/10;
      TireBean.LRTire = bytes[n+3]/10;
      TireBean.RRTire = bytes[n+4]/10;
    } else if (bytes[n] == 0x00) {
      TireBean.TireSta = '不支持胎压';
      TireBean.LFTire = -1;
      TireBean.RFTire = -1;
      TireBean.LRTire = -1;
      TireBean.RRTire = -1;
    }
  }
  return TireBean;
}

/**
 * 解析原车保养参数
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} 原车保养参数解析结果对象
 */
function parseZisCarMAIN(data) {
  var bytes = utils.hexStringToArray(data);
  var MainBean = new Object();

  var num = 13;
  if (bytes[num] == 0x01) {
    var n = 16;
    
    // 保养日期设置
    if (bytes[n] == 0x01) {
      MainBean.BigSetMainDate = utils.bytesToInt(0,0,bytes[n+1],bytes[n+2]);
      MainBean.SmallSetMainDate = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]);
    } else {
      MainBean.BigSetMainDate = -1;
      MainBean.SmallSetMainDate = -1;
    }
    n += 5;

    // 保养里程设置
    if (bytes[n] == 0x01) {
      MainBean.BigSetMainMile = utils.bytesToInt(0,0,bytes[n+1],bytes[n+2]) * 100;
      MainBean.SmallSetMainMile = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]) * 100;
    } else {
      MainBean.BigSetMainMile = -1;
      MainBean.SmallSetMainMile = -1;
    }
    n += 5;

    // 保养机油设置
    if (bytes[n] == 0x01) {
      MainBean.MainSetOil = utils.bytesToInt(0,0,0,bytes[n+1]) / 256 * 100;
    } else {
      MainBean.MainSetOil = -1;
    }
    n += 2;

    // 保养日期运行值
    if (bytes[n] == 0x01) {
      MainBean.BigRunMainDate = utils.bytesToInt(0,0,bytes[n+1],bytes[n+2]);
      MainBean.SmallRunMainDate = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]);
    } else {
      MainBean.BigRunMainDate = -1;
      MainBean.SmallRunMainDate = -1;
    }
    n += 5;

    // 保养里程运行值
    if (bytes[n] == 0x01) {
      MainBean.BigRunMainMile = utils.bytesToInt(0,0,bytes[n+1],bytes[n+2]) * 100;
      MainBean.SmallRunMainMile = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]) * 100;
    } else {
      MainBean.BigRunMainMile = -1;
      MainBean.SmallRunMainMile = -1;
    }
    n += 5;

    // 保养机油运行值
    if (bytes[n] == 0x01) {
      MainBean.MainRunOil = utils.bytesToInt(0,0,0,bytes[n+1]);
    } else {
      MainBean.MainRunOil = -1;
    }
    n += 2;

    // 保养日期剩余值
    if (bytes[n] == 0x01) {
      MainBean.BigRemMainDate = -1;
      MainBean.SmallRemMainDate = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]);
    } else {
      MainBean.BigRemMainDate = -1;
      MainBean.SmallRemMainDate = -1;
    }
    n += 5;

    // 保养里程剩余值
    if (bytes[n] == 0x01) {
      MainBean.BigRemMainMile = -1;
      MainBean.SmallRemMainMile = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]) * 100;
    } else {
      MainBean.BigRemMainMile = -1;
      MainBean.SmallRemMainMile = -1;
    }
    n += 5;

    // 保养机油剩余值
    if (bytes[n] == 0x01) {
      MainBean.MainRemOil = utils.bytesToInt(0,0,0,bytes[n+1]);
    } else {
      MainBean.MainRemOil = -1;
    }
  }
  return MainBean;
}

/**
 * 解析设备保养参数
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} 设备保养参数解析结果对象
 */
function parseZisDevMAIN(data) {
  var bytes = utils.hexStringToArray(data);
  var MainBean = new Object();

  var num = 13;
  if (bytes[num] == 0x01) {
    var n = 16;
    
    // 保养日期
    if (bytes[n] == 0x01) {
      MainBean.BigMainDate = utils.bytesToInt(0,0,bytes[n+1],bytes[n+2]);
      MainBean.SmallMainDate = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]);
    } else {
      MainBean.BigMainDate = -1;
      MainBean.SmallMainDate = -1;
    }
    n += 5;

    // 保养里程
    if (bytes[n] == 0x01) {
      MainBean.BigMainMile = utils.bytesToInt(0,0,bytes[n+1],bytes[n+2]) * 100;
      MainBean.SmallMainMile = utils.bytesToInt(0,0,bytes[n+3],bytes[n+4]) * 100;
    } else {
      MainBean.BigMainMile = -1;
      MainBean.SmallMainMile = -1;
    }
    n += 5;

    // 保养机油
    if (bytes[n] == 0x01) {
      MainBean.MainOil = utils.bytesToInt(0,0,0,bytes[n+1]) / 256 * 100;
    } else {
      MainBean.MainOil = -1;
    }
    n += 3;

    // 设备状态
    if (bytes[n] == 0x01) {
      MainBean.Dev = "准备执行";
    } else if (bytes[n] == 0x00) {
      MainBean.Dev = "初始化";
    } else if (bytes[n] == 0x02) {
      MainBean.Dev = "执行完毕";
    } else {
      MainBean.Dev = -1;
    }
  }
  return MainBean;
}

/**
 * 解析车型特殊数据
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} 车型特殊数据解析结果对象
 */
function parseZisDevSPINFO(data) {
  var bytes = utils.hexStringToArray(data);
  var SPINFOBean = new Object();

  var num = 16;
  SPINFOBean.SPReady = utils.bytesToInt(0,0,0,bytes[num]);
  num++;
  SPINFOBean.SPType = utils.bytesToInt(0,0,0,bytes[num]);
  num++;
  SPINFOBean.fourdoor = utils.bytesToInt(0,0,0,bytes[num]);
  num++;
  SPINFOBean.keynum = utils.bytesToInt(0,0,0,bytes[num]);
  num++;
  return SPINFOBean;
}

/**
 * 解析Debug响应数据
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Object} Debug解析结果对象
 */
function parseZisDebug(data) {
  var bytes = utils.hexStringToArray(data);
  var DebugBean = new Object();
  var n = 8;
  
  if (bytes[n] == 0x00) {
    DebugBean.DebugType = "复位指令";
    if (bytes[n+1] == 0x01) DebugBean.DebugRes = "成功";
    else DebugBean.DebugRes = "失败";
  } else if (bytes[n] == 0x01) {
    DebugBean.DebugType = "修改IDC指令";
    if (bytes[n+1] == 0x01) DebugBean.DebugRes = "成功";
    else DebugBean.DebugRes = "失败";
  } else if (bytes[n] == 0x02) {
    if (bytes[n+1] == 0x01) {
      DebugBean.DebugType = "修改IP指令";
      DebugBean.DebugRes = "成功";
    } else if ((bytes[n+1]&0xf0) == 0xf0) {
      DebugBean.DebugType = "查询IP指令";
      if ((bytes[n+1]&0x0f) == 0x01)
        DebugBean.DebugRes = "ZXT IP";
      else if ((bytes[n+1]&0x0f) == 0x02)
        DebugBean.DebugRes = "SZ IP";
      else if ((bytes[n+1]&0x0f) == 0x03)
        DebugBean.DebugRes = "HL IP";
    } else {
      DebugBean.DebugType = "失败";
      DebugBean.DebugRes = "失败";
    }
  } else if (bytes[n] == 0x03) {
    DebugBean.DebugType = "匹配模式指令";
    if (bytes[n+1] == 0x01) DebugBean.DebugRes = "3V3打开成功";
    else if (bytes[n+1] == 0x00) DebugBean.DebugRes = "3V3关闭成功";
    else DebugBean.DebugRes = "失败";
  } else if (bytes[n] == 0x04) {
    DebugBean.DebugType = "复合修改指令";
    if (bytes[n+1] == 0x01) DebugBean.DebugRes = "成功";
    else if (bytes[n+1] == 0x00) DebugBean.DebugRes = "失败";
    else DebugBean.DebugRes = "失败";
  } else if (bytes[n] == 0xA0) {
    DebugBean.DebugType = "设置保养时间里程百分比参数";
    if (bytes[n+1] == 0x01) DebugBean.DebugRes = "成功";
    else if (bytes[n+1] == 0x00) DebugBean.DebugRes = "失败";
    else DebugBean.DebugRes = "失败";
  } else if (bytes[n] == 0xA1) {
    DebugBean.DebugType = "设置保养执行参数";
    if (bytes[n+1] == 0x01) DebugBean.DebugRes = "成功";
    else if (bytes[n+1] == 0x00) DebugBean.DebugRes = "失败";
    else DebugBean.DebugRes = "失败";
  } else if (bytes[n] == 0xf0) {
    DebugBean.DebugType = "CAN数据透传";
    if (bytes[n+1] == 0x01) {
      DebugBean.DebugRes = "成功";
      n += 2;
      DebugBean.DebugRLen = bytes[n];
      n++;
      var tmpRID = utils.bytesToInt(bytes[n], bytes[n+1], bytes[n+2], bytes[n+3]);
      DebugBean.DebugRIDArray = utils.intToBytes(tmpRID, true);
      DebugBean.DebugRID = utils.buf2hex(DebugBean.DebugRIDArray) + '';
      DebugBean.DebugRID = DebugBean.DebugRID.toUpperCase();
      n += 4;
      var tmpRData = [];
      for (var i=0; i<DebugBean.DebugRLen; i++) {
        tmpRData.push(bytes[n]);
        n++;
      }
      DebugBean.DebugRData = utils.buf2hex(tmpRData) + '';
      DebugBean.DebugRData = DebugBean.DebugRData.toUpperCase();
      DebugBean.DebugRDataArray = tmpRData;
    } else if (bytes[n+1] == 0x00) {
      DebugBean.DebugRes = "失败";
    } else {
      DebugBean.DebugRes = "失败";
    }
  }
  return DebugBean;
}

/**
 * 解析车辆状态原始数据
 * @param {String} data 16进制字符串形式的数据包
 * @returns {Array} 车辆状态解析结果数组
 */
function parseZisCarStatus(data) {
  var bytes = utils.hexStringToArray(data);
  var arr = new Array(4);
  var n = 10;
  
  arr[0] = utils.bytesToInt(bytes[n], bytes[n + 1], bytes[n + 2], bytes[n + 3]);
  n += 4;
  
  var len = bytes[n++];
  if (len >= 3) {
    for (var i = 0; i < len; i++) {
      switch (bytes[n++]) {
        case 1:
          if (bytes[n] >= 2) {
            var lightState = bytes.slice(n + 1, n + 1 + bytes[n]);
            arr[1] = utils.buf2hex(lightState);
          }
          break;
        case 2:
          if (bytes[n] >= 2) {
            var doorState = bytes.slice(n + 1, n + 1 + bytes[n]);
            arr[2] = utils.buf2hex(doorState);
          }
          break;
        case 3:
          if (bytes[n] >= 3) {
            var otherState = bytes.slice(n + 1, n + 1 + bytes[n]);
            arr[3] = utils.buf2hex(otherState);
          }
          break;
      }
      n += 1 + bytes[n];
    }
  }
  return arr;
}

/**
 * 解析车辆状态（灯光、车门、档位、充电等）
 * @param {String} lightState 灯光状态16进制字符串
 * @param {String} doorState 车门状态16进制字符串
 * @param {String} otherState 其他状态16进制字符串
 * @returns {Object} 标准化的车辆状态对象
 */
function analyticStatusNew(lightState, doorState, otherState) {
  var cr = new Object();

  // 初始化所有状态值
  var shikuoLight = -1;//示廓灯
  cr.shikuoLightValue = shikuoLight;
  var dippedHeadlight = -1;//近光灯
  cr.dippedHeadlightValue = dippedHeadlight;
  var highbeam = -1;//远光灯
  cr.highbeamValue = highbeam;
  var foglight = -1;//雾灯
  cr.foglightValue = foglight;

  var rightflash = -1;//左转
  cr.rightflashValue = rightflash;
  var leftflash = -1;//右转
  cr.leftflashValue = leftflash;
  var dangerflash = -1;//危险
  cr.dangerflashValue = dangerflash;
  var faultlight = -1;//故障
  cr.faultlightValue = faultlight;

  var rearRight = -1;//右后门
  cr.rearRightValue = rearRight;
  var rearLeft = -1;//左后门
  cr.rearLeftValue = rearLeft;
  var frontRight = -1;//右前门
  cr.frontRightValue = frontRight;
  var frontLeft = -1;//左前门
  cr.frontLeftValue = frontLeft;
  var boot = -1;//后备箱
  cr.bootValue = boot;
  var engine = -1;//发动机状态
  cr.engineValue = engine;
  var acc = -1;//acc状态
  cr.accValue = acc;
  var on = -1;//on状态
  cr.onValue = on;

  var belt = -1;//安全带
  cr.beltValue = belt
  var handbreak = -1;//手刹
  cr.handbreakValue = handbreak
  var footbreak = -1;//脚刹
  cr.footbreakValue = footbreak
  var hood = -1;//机盖
  cr.hoodValue = hood;
  var shiftr = -1;//r
  cr.shiftrValue = shiftr;
  var shiftp = -1;//p
  cr.shiftpValue = shiftp;
  var shiftn = -1;//n
  cr.shiftnValue = shiftn;
  var shiftd = -1;//d
  cr.shiftdValue = shiftd;
  var ZV = -1;//中控锁
  cr.ZVValue = ZV
  var catchcar = -1;//拦截
  cr.catchcarValue = catchcar
  var charge = -1;//充电状态
  cr.chargeValue = charge;
  var chargefast = -1;//快充慢充
  cr.chargefastValue = chargefast;
  var chargeslow = -1;//快充慢充
  cr.chargeslowValue = chargeslow;

  try {
    // 初始化默认值，避免空值报错
    if (lightState.length <= 0) lightState = "0000";
    if (doorState.length <= 0) doorState = "0000";
    if (otherState.length <= 0) otherState = "0000000000";

    var lights = utils.hexStringToArray(lightState);
    var doors = utils.hexStringToArray(doorState);
    var others = utils.hexStringToArray(otherState);

    // 解析灯光状态
    shikuoLight = (((lights[0] & 0x40) >> 6));
    var shikuoLightValue = (((lights[0] & 0x80) >> 7));
    cr.shikuoLightValue = shikuoLight == 1 ? (shikuoLightValue == 1 ? "开启" : "关闭") : "不支持";

    dippedHeadlight = (((lights[0] & 0x10) >> 4));
    var dippedHeadlightValue = (((lights[0] & 0x20) >> 5));
    cr.dippedHeadlightValue = dippedHeadlight == 1 ? (dippedHeadlightValue == 1 ? "开启" : "关闭") : "不支持";

    highbeam = (((lights[0] & 0x04) >> 2));
    var highbeamValue = (((lights[0] & 0x08) >> 3));
    cr.highbeamValue = highbeam == 1 ? (highbeamValue == 1 ? "开启" : "关闭") : "不支持";

    foglight = (((lights[0] & 0x01)));
    var foglightValue = (((lights[0] & 0x02) >> 1));
    cr.foglightValue = foglight == 1 ? (foglightValue == 1 ? "开启" : "关闭") : "不支持";

    rightflash = (((lights[1] & 0x04) >> 6));
    var rightflashValue = (((lights[1] & 0x08) >> 7));
    cr.rightflashValue = rightflash == 1 ? (rightflashValue == 1 ? "开启" : "关闭") : "不支持";

    leftflash = (((lights[1] & 0x01) >> 4));
    var leftflashValue = (((lights[1] & 0x02) >> 5));
    cr.leftflashValue = leftflash == 1 ? (leftflashValue == 1 ? "开启" : "关闭") : "不支持";

    dangerflash = (((lights[1] & 0x04) >> 2));
    var dangerflashValue = (((lights[1] & 0x08) >> 3));
    cr.dangerflashValue = dangerflash == 1 ? (dangerflashValue == 1 ? "开启" : "关闭") : "不支持";

    faultlight = (((lights[1] & 0x01)));
    var faultlightValue = (((lights[1] & 0x02) >> 1));
    cr.faultlightValue = faultlight == 1 ? (faultlightValue == 1 ? "开启" : "关闭") : "不支持";

    // 解析车门状态
    rearRight = (((doors[0] & 0x40) >> 6));
    var rearRightValue = (((doors[0] & 0x80) >> 7));
    cr.rearRightValue = rearRight == 1 ? (rearRightValue == 1 ? "开启" : "关闭") : "不支持";

    rearLeft = (((doors[0] & 0x10) >> 4));
    var rearLeftValue = (((doors[0] & 0x20) >> 5));
    cr.rearLeftValue = rearLeft == 1 ? (rearLeftValue == 1 ? "开启" : "关闭") : "不支持";

    frontRight = (((doors[0] & 0x4) >> 2));
    var frontRightValue = (((doors[0] & 0x8) >> 3));
    cr.frontRightValue = frontRight == 1 ? (frontRightValue == 1 ? "开启" : "关闭") : "不支持";

    frontLeft = (doors[0] & 0x1);
    var frontLeftValue = (((doors[0] & 0x2) >> 1));
    cr.frontLeftValue = frontLeft == 1 ? (frontLeftValue == 1 ? "开启" : "关闭") : "不支持";

    boot = (((doors[1] & 0x40) >> 6));
    var bootValue = (((doors[1] & 0x80) >> 7));
    cr.bootValue = boot == 1 ? (bootValue == 1 ? "开启" : "关闭") : "不支持";

    engine = (((doors[1] & 0x10) >> 4));
    var engineValue = (((doors[1] & 0x20) >> 5));
    cr.engineValue = engine == 1 ? (engineValue == 1 ? "开启" : "关闭") : "不支持";

    acc = (((doors[1] & 0x04) >> 2));
    var accValue = (((doors[1] & 0x08) >> 3));
    cr.accValue = acc == 1 ? (accValue == 1 ? "开启" : "关闭") : "不支持";

    on = (doors[1] & 0x1);
    var onValue = (((doors[1] & 0x2) >> 1));
    cr.onValue = on == 1 ? (onValue == 1 ? "开启" : "关闭") : "不支持";

    // 解析其他状态
    belt = (((others[0] & 0x40) >> 6));
    var beltValue = (((others[0] & 0x80) >> 7));
    cr.beltValue = belt == 1 ? (beltValue == 1 ? "开启" : "关闭") : "不支持";

    handbreak = (((others[0] & 0x04) >> 2));
    var handbreakValue = (((others[0] & 0x08) >> 3));
    cr.handbreakValue = handbreak == 1 ? (handbreakValue == 1 ? "开启" : "关闭") : "不支持";

    footbreak = (((others[0] & 0x01)));
    var footbreakValue = (((others[0] & 0x02) >> 1));
    cr.footbreakValue = footbreak == 1 ? (footbreakValue == 1 ? "开启" : "关闭") : "不支持";

    hood = (((others[1] & 0x01)));
    var hoodValue = (((others[1] & 0x02) >> 1));
    cr.hoodValue = hood == 1 ? (hoodValue == 1 ? "开启" : "关闭") : "不支持";

    // 解析档位
    if (others[2] == 0x50) {
      cr.shiftpValue = "开启";
      cr.shiftnValue = "关闭";
      cr.shiftrValue = "关闭";
      cr.shiftdValue = "关闭";
    } else if (others[2] == 0x52) {
      cr.shiftpValue = "关闭";
      cr.shiftnValue = "关闭";
      cr.shiftrValue = "开启";
      cr.shiftdValue = "关闭";
    } else if (others[2] == 0x4e) {
      cr.shiftpValue = "关闭";
      cr.shiftnValue = "开启";
      cr.shiftrValue = "关闭";
      cr.shiftdValue = "关闭";
    } else if (others[2] == 0x44) {
      cr.shiftpValue = "关闭";
      cr.shiftnValue = "关闭";
      cr.shiftrValue = "关闭";
      cr.shiftdValue = "开启";
    } else {
      cr.shiftpValue = "关闭";
      cr.shiftnValue = "关闭";
      cr.shiftrValue = "关闭";
      cr.shiftdValue = "关闭";
    }

    // 解析中控锁
    ZV = (((others[4] & 0x10) >> 4));
    var ZVValue = ((others[4] & 0x20) >> 5);
    cr.ZVValue = ZV == 1 ? (ZVValue == 1 ? "开启" : "关闭") : "不支持";

    // 解析拦截状态
    catchcar = (((others[4] & 0x04) >> 2));
    var catchcarValue = ((others[4] & 0x08) >> 3);
    cr.catchcarValue = catchcar == 1 ? (catchcarValue == 1 ? "开启" : "关闭") : "不支持";

    // 解析充电状态
    charge = others[4] & 0x1;
    var chargeValue = (others[4] & 0x2) >> 1;
    cr.chargeValue = charge == 1 ? (chargeValue == 1 ? "开启" : "关闭") : "不支持";

    // 解析快充/慢充
    if (others.length > 5) {
      chargefast = (((others[5] & 0x40) >> 6));
      var chargefastValue = ((others[5] & 0x80) >> 7);
      cr.chargefastValue = chargefast == 1 ? (chargefastValue == 1 ? "开启" : "关闭") : "不支持";

      chargeslow = (((others[5] & 0x10) >> 4));
      var chargeslowValue = ((others[5] & 0x20) >> 5);
      cr.chargeslowValue = chargeslow == 1 ? (chargeslowValue == 1 ? "开启" : "关闭") : "不支持";
    } else {
      cr.chargefastValue = "不支持";
      cr.chargeslowValue = "不支持";
    }

    return cr;
  } catch (err) {
    return '';
  }
}

/*---------------------------------------------------------------*/
/*------------------------外部导出方法--------------------------*/
/*---------------------------------------------------------------*/

export default {
  // 粘包处理
  filterOnePage: filterOnePage,
  // 解析一个完整包的数据
  receiveData: receiveData,
  // 解析车状态原始数据
  parseZisCarStatus: parseZisCarStatus,
  // 解析车状态（标准化）
  analyticStatusNew: analyticStatusNew,
  // 解析电量、里程
  parseZisMileRange: parseZisMileRange,
  // 解析GPS
  parseZisGps: parseZisGps,
  // 解析VIN
  parseZisVIN: parseZisVIN,
  // 解析油量
  parseZisOIL: parseZisOIL,
  
  // 补充导出其他常用解析方法（可选）
  parseZisTIRE: parseZisTIRE,
  parseZisCarMAIN: parseZisCarMAIN,
  parseZisDevMAIN: parseZisDevMAIN,
  parseZisDevSPINFO: parseZisDevSPINFO,
  parseZisDebug: parseZisDebug,
  parseControlResult: parseControlResult
};