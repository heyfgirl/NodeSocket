'use strict';
const UserModel = require('../models').User;
const IdentifyModel = require('../models').Identify;
const RoomModel = require('../models').Room;
const MessageModel = require('../models').Message;
const LooKModel = require('../models').Look;
const Sequelize = require('sequelize');
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
                'where': {
                    'uid': userInfo.id,
                },
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
        let room_ids = [];

        // 查出所有未读消息个数
        let count = await MessageModel.count({
            'include': [
                {
                    'model': RoomModel,
                    'as': 'room',
                    'include': [
                        {
                            'model': LooKModel,
                            'as': 'lookInfo',
                            'where': {
                                'user_hash': user_hash,
                                'outAt': {
                                    '$lte': Sequelize.col('"room"."msgAt"'),
                                },
                            },
                            'required': true,
                        },
                    ],
                    'required': true,
                },
            ],
        });


        // 获取自己所在房间列表  最后消息时间倒叙
        let rooms = await RoomModel.findAndCountAll({
            'where': {
                'user_hashs': {
                    '$overlap': [ user_hash ],
                },
            },
            'limit': limit,
            'offset': offset,
            'include': [
                {
                    'model': MessageModel,
                    'attributes': [ 'room_id', 'createdAt', 'info' ],
                    'limit': 1,
                    'as': 'msgs',
                    'order': [[ 'createdAt', 'desc' ]],
                    'required': false,
                },
                // 获取房间未读消息个数
                {
                    'model': LooKModel,
                    'attributes': [ 'id', 'room_id' ],
                    'as': 'lookInfo',
                    'where': {
                        'user_hash': user_hash,
                        'outAt': {
                            '$lte': Sequelize.col('"room"."msgAt"'),
                        },
                    },
                    'required': false,
                },

            ],
            'order': [[ 'msgAt', 'desc' ]],
            // 'raw': true,
        });
        // 获取所有双人房间的对方用户信息  双人房间头像为对方用户头像
        let user_hashs = [];
        let notreadmsgRoomIds = [];
        rooms.rows = rooms.rows.map(room => {
            // let msg = room.msgs[0].get({ 'plain': true });
            room = room.get({ 'plain': true });
            if (room.msgs && Array.isArray(room.msgs)) {
                room.msg = room.msgs[0];
                delete room.msgs;
            }
            room_ids.push(room.id);
            if (room.type === 'double' && room.user_hashs && Array.isArray(room.user_hashs)) {
                user_hashs = user_hashs.concat(room.user_hashs);
            }

            // 处理未读消息个数
            // if (room.lookInfo && room.lookInfo.lookMessage && Array.isArray(room.lookInfo.lookMessage)) {
            //     room.notreadmsg = room.lookInfo.lookMessage.length;
            //     delete room.lookInfo;
            // }
            if (room.lookInfo) {
                notreadmsgRoomIds.push(room.id);
            }
            return room;
        });

        let notReadMessages = await MessageModel.count({
            'attributes': [ 'room_id' ],
            'where': {
                'room_id': {
                    '$in': notreadmsgRoomIds,
                },
            },
            'group': [ 'room_id' ],
        });
        let notReadMessagesObj = {};
        if (notReadMessages && Array.isArray(notReadMessages)) {
            notReadMessages.forEach(item => {
                notReadMessagesObj[item.room_id] = item.count;
            });
        }

        let Setuser_hashs = new Set(user_hashs);
        Setuser_hashs.delete(user_hash);
        user_hashs = [ ... Setuser_hashs ].filter(item => item);
        // 获取所有用户信息
        let userAll = await UserModel.findAll({
            'attributes': [ 'id', 'hash', 'avatar', 'nickname' ],
            'where': {
                'hash': {
                    '$in': user_hashs,
                },
            },
            'raw': true,
        });
        let userObjAll = { };
        userAll.forEach(u => {
            userObjAll[u.hash] = u;
        });

        rooms.rows.map(room => {
            // 所有双人房展示 对话人信息
            if (room.type === 'double') {
                room.toUser = {};
                let user_hashs = new Set(room.user_hashs);
                user_hashs.delete(user_hash);
                let [ toUserhash ] = [ ... user_hashs ];
                room.toUser = userObjAll[toUserhash];
            }
            if (notReadMessagesObj[room.id] || Number.isInteger(notReadMessagesObj[room.id])) {
                room.notreadmsg = parseInt(notReadMessagesObj[room.id]);
            } else {
                room.notreadmsg = 0;
            }

            delete room.lookInfo;
            delete room.user_hashs;
            return room;
        });
        ctx.result['data'] = {
            'rooms': rooms,
            'notreadmsg': count,
        };
        ctx.result['success'] = true;
        return await next();
    },
    // 获取消息列表
    async GetMessages(ctx, next) {
        let { limit = 20, offset = 0, roomId, toUserHash } = ctx.request.body;
        let user_hash = ctx.userInfo.hash;
        let roomWhere = {
            'id': roomId,
        };
        if (!roomId) {
            if (!toUserHash) {
                throw new CustomError('异常错误', ErrorConf.ParamError);
            }
            roomWhere = {
                'type': 'double',
                'user_hashs': {
                    '$overlap': [ user_hash, toUserHash ],
                },
            };
        }
        let roomInfo = await RoomModel.findOne({
            'where': roomWhere,
            'raw': true,
        });
        roomId = roomInfo.id;
        if (!roomInfo || roomInfo.user_hashs.indexOf(user_hash) <= -1) {
            throw new CustomError('异常错误', ErrorConf.ParamError);
        }
        let message = await MessageModel.findAndCountAll({
            'where': {
                'room_id': roomId,
            },
            'limit': limit,
            'offset': offset,
            'include': [{
                'model': UserModel,
                'as': 'fromUser',
            }],
            'order': [[ 'createdAt', 'desc' ]],
            // 'raw': true,
        });
        ctx.result['data'] = {
            'messages': message,
            'roomId': roomInfo.id,
        };
        ctx.result['success'] = true;
        return;
    },
    // 拉取一个单独的房间
    async GetRoom(ctx, next) {
        let { roomId } = ctx.request.body;
        let user_hash = ctx.userInfo.hash;
        // 获取自己所在房间列表  最后消息时间倒叙
        let room = await RoomModel.findOne({
            'where': {
                'user_hashs': {
                    '$overlap': [ user_hash ],
                },
                'id': roomId,
            },
            'include': [
                {
                    'model': MessageModel,
                    'attributes': [ 'room_id', 'createdAt', 'info' ],
                    'limit': 1,
                    'as': 'msgs',
                    'order': [[ 'createdAt', 'desc' ]],
                },
            ],
        });
        if (!room) {
            throw new CustomError('异常错误', ErrorConf.ParamError);
        }
        let user_hashs = [];
        room = room.get({ 'plain': true });
        if (room.msgs && Array.isArray(room.msgs)) {
            room.msg = room.msgs[0];
            delete room.msgs;
        }
        if (room.type === 'double' && room.user_hashs && Array.isArray(room.user_hashs)) {
            user_hashs = user_hashs.concat(room.user_hashs);
        }
        let Setuser_hashs = new Set(user_hashs);
        Setuser_hashs.delete(user_hash);
        user_hashs = [ ... Setuser_hashs ].filter(item => item);
        // 获取所有用户信息
        let userAll = await UserModel.findAll({
            'where': {
                'hash': {
                    '$in': user_hashs,
                },
            },
            'raw': true,
        });
        let userObjAll = { };
        userAll.forEach(u => {
            userObjAll[u.hash] = u;
        });
        if (room.type === 'double') {
            room.toUser = {};
            let user_hashs = new Set(room.user_hashs);
            user_hashs.delete(user_hash);
            let [ toUserhash ] = [ ... user_hashs ];
            room.toUser = userObjAll[toUserhash];
        }
        ctx.result['data'] = {
            'room': room,
        };
        ctx.result['success'] = true;
        return await next();

    },
};
