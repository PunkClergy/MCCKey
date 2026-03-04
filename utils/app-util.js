export const getSystemInfoComplete = (systemInfo, complete) => {
	uni.getSystemInfo({
		success: systemInfo,
		complete
	});
};

export default {
	getSystemInfoComplete
};