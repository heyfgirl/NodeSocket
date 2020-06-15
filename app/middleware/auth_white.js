'use strict';
/**
 * @Author  wqiong
 * @Date Mon May 27 2019 17:56:00 GMT+0800 (中国标准时间)
 * @Description 用户token验证相关中间件
 */
// const logger = require('../lib/log4js');
const CustomError = require('../../common/lib/error_constructor').CustomError;
// const config = require('../config/config');
let whilte = [ 'x8mwd3l3htnzlu3r', 'r7b8p8dr9e_uvjh' ];
module.exports = () => {
    // 白名单验证
    return async (ctx, next) => {
        if (whilte.indexOf(ctx.appid) === -1) {
            throw new CustomError('异常错误，appid不存在', {
                'code': 1200,
                'info': '该appid不在白名单内',
            });
        }
        await next();
    };
};
