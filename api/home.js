import {
	http
} from '@/utils/request/http'

export const u_getCarPoisitonByCode = (data) => http.postFormData('/renterApi/getCarPoisitonByCodeNew', data)
export const u_verifyControlcode = (data) => http.postFormData('/renterApi/verifyControlcode', data)
export const u_operation = (data) => http.postFormData('/dzBussinessMobileApi/operation', data)
export const u_logo = (data) => http.get('/deskapi/logo', data)
export const u_getQrcodeImg = (data) => http.get('/deskapi/getQrcodeImg', data)
export const u_wxLogin = (data) => http.postFormData('/userapi/zcyWxLogin', data)
export const u_login = (data) => http.postFormData('/userapi/zcyLogin', data)
export const u_getControlCodeByMobile = (data) => http.get('/renterApi/getControlCodeByMobile', data)






export const u_navlist20 = (data) => http.get('/deskapi/navlist20', data)
export const u_carList = (data) => http.get('/carapi/getCarList', data)
export const u_sendInfo = (data) => http.postFormData('/renterApi/uploadControlRecord', data)
export const u_uploadLog = (data) => http.post('/loggerapi/uploadLog', data)
export const u_bannerlist20 = (data) => http.get('/deskapi/bannerlist20', data)
export const u_getHomeArea = (data) => http.get('/deskapi/homeArea', data)
export const u_booklist = (data) => http.get('/deskapi/booklist', data)
export const u_mylist = (data) => http.get('/deskapi/mylist', data)
export const u_paivatecarList = (data) => http.get('/carapi/getCarList', data)
export const u_paivateAddOrUpdateCar = (data) => http.postFormData('/carapi/addOrUpdateCar', data)
export const u_paivateCarapiDeleteCar = (data) => http.postFormData('/carapi/deleteCar', data)
export const u_paivateUpdateRentKey = (data) => http.postFormData('/rentKeyApi/updateRentKey', data) 
export const u_paivateCarList = (data) => http.get('/carapi/getCarList', data) 
export const u_paivateRentRecord = (data) => http.get('/rentKeyApi/rentRecord', data) 
export const u_paivateSendRentKey = (data) => http.get('/rentKeyApi/sendRentKey', data) 
export const u_paivateCancelRentKey = (data) => http.get('/rentKeyApi/cancelRentKey', data) 
export const u_promotionalApi = (data) => http.get('/promotionalApi/list', data)
export const u_promotionalApiWxBooklist = (data) => http.get('/promotionalApi/wxFilelist', data)
export const u_industryList = (data) => http.get('/promotionalApi/industryList', data)
export const login = (data) => http.postFormData('/api/login', data) 
export const u_register = (data) => http.postFormData('/userapi/userReg', data) //注册
export const u_sendRentKey = (data) => http.get('/rentKeyApi/sendRentKey', data) //发送
export const u_updateRentKey = (data) => http.postFormData('/rentKeyApi/updateRentKey', data) //修改


