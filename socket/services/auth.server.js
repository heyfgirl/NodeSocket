'use strict';
/**
 * @Author  Lolo
 * @Date    2017-09-05T09:49:58+08:00
 * @Description 连接认证模块
 */

// const logger = require('../config/log4js');
const config = require('../../config/config');
const moment = require('moment');
const common = require('../../common/lib/common');
module.exports = {
    /**
   * 连接验证中间件函数
   *  data参数中需要带的字段信息
   *  id: 用户id信息
   *  roomId: 房间id信息
   *  [type]: 验证类型，为后续其他接入用户预留，默认为当前验证方式
   *  token: 验证信息
   *  @param {string}  query - 前段数据
   *  @param {string} ip - 客户端ip
   *  @param {function} cb  - 回调函数
   */
    'check': async function(query, ip, cb) {

        return;
    },
};

