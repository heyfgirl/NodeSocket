'use strict';
/**
 * @Author  wqiong
 * @Date Mon May 27 2019 17:56:00 GMT+0800 (中国标准时间)
 * @Description 用户token验证相关中间件
 */
const CustomError = require('../../common/lib/error_constructor').CustomError;
module.exports = () => {
    // 白名单验证
    return async (ctx, next) => {
        await next();
    };
};
