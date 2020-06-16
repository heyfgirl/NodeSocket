'use strict';
const UserModel = require('../models').User;
const IdentifyModel = require('../models').Identify;
const RoomModel = require('../models').Room;
const chance = require('chance')();
const CustomError = require('../../common/lib/error_constructor').CustomError;
const ErrorConf = require('../../common/config').error_conf;
module.exports = {
    // 注册用户
    async Register(ctx, next) {
        let { user_hash, nickname, avatar, mod } = ctx.request.body;
        mod = mod || 'default';
        let isRegister = true;
        if (!user_hash) {
            throw new CustomError('异常错误缺少参数', ErrorConf.ParamError);
        }
        // 查看该模块下的此用户是否在当前平台注册过
        let userInfo = await UserModel.findOne({
            'attributes': [ 'id', 'hash' ],
            'where': {
                'hash': user_hash,
                'mod': mod,
            },
            'raw': true,
        });
        if (!userInfo) {
            if (!nickname || !avatar) {
                throw new CustomError('异常错误缺少参数', ErrorConf.ParamError);
            }
            userInfo = await UserModel.create({
                'mod': mod,
                'hash': user_hash,
                'nickname': nickname,
                'avatar': avatar,
            });
        } else {
            // 存在就是更改而非注册
            isRegister = false;
            if (nickname || avatar) {
                await UserModel.update({
                    'nickname': nickname,
                    'avatar': avatar,
                }, {
                    'where': {
                        'mod': mod,
                        'hash': user_hash,
                    },
                });
            }
        }
        // 获取到用户之后再进行用户的token获取
        let IdentifyInfo;
        if (isRegister) {
            let token = chance.hash({ 'length': 32 });
            IdentifyInfo = await IdentifyModel.create({
                'token': token,
                'uid': userInfo.id,
            }, {
                'raw': true,
            });
        } else {
            IdentifyInfo = await IdentifyModel.findOne({
                'uid': userInfo.id,
            }, {
                'raw': true,
            });
        }

        ctx.result['data'] = {
            'user_hash': user_hash,
            'token': IdentifyInfo.token,
        };
        ctx.result['success'] = true;
        await next();
    },
    // 获取房间列表
    async GetRooms(ctx, next) {
        let { limit, offset } = ctx.request.body;
        let user_hash = ctx.userInfo.hash;
        // 获取自己所在房间列表  最后消息时间倒叙
        let rooms = await RoomModel.findAndCountAll({
            'where': {
                'user_hashs': {
                    '$overlap': [ user_hash ],
                },
            },
            'limit': limit,
            'offset': offset,
            'order': [[ 'msgAt', 'desc' ]],
            'raw': true,
        });
        let user_hashs = [ ...(new Set(rooms.rows.map(item => item.user_hashs).reduce((a, b) => a.concat(b), [])).delete(user_hash)) ];
        // 获取所有用户信息
        let userAll = await UserModel.findAll({
            'hash': {
                '$in': user_hashs,
            },
            'raw': true,
        });
        let userObjAll = { };
        userAll.forEach(u => {
            userObjAll[u.hash] = u;
        });
        rooms.rows.map(room => {
            room.users = {};
            for (let uhash of room.user_hashs) {
                room.users[uhash] = userObjAll[uhash];
            }
            return room;
        });
        ctx.result['data'] = {
            'rooms': rooms,
        };
        ctx.result['success'] = true;
        return await next();
    },
};
