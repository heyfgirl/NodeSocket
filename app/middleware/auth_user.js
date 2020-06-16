'use strict';
/**
 * @Author  wqiong
 * @Date Mon May 27 2019 17:56:00 GMT+0800 (中国标准时间)
 * @Description 用户token验证相关中间件
 */
const IdentifyModel = require('../models').Identify;
const UserModel = require('../models').User;

const CustomError = require('../../common/lib/error_constructor').CustomError;
const ErrorConf = require('../../common/config').error_conf;
module.exports = () => {
    // 白名单验证
    return async (ctx, next) => {
        let token = ctx.headers['ws-token'];
        let Ident = await IdentifyModel.findOne({
            'where': {
                'token': token,
            },
            'raw': true,
        });
        if (!Ident) {
            throw new CustomError('异常错误，验证失败', ErrorConf.authfail);
        }
        let userInfo = await UserModel.findOne({
            'where': {
                'id': Ident.uid,
            },
            'raw': true,
        });
        if (!userInfo) {
            throw new CustomError('异常错误，验证失败', ErrorConf.authfail);
        }
        ctx.userInfo = userInfo;
        await next();
    };
};
