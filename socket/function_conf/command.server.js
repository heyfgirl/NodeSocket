'use strict';
const RoomModel = require('../../app/models').Room;
const LookModel = require('../../app/models').Look;
const Messagemodel = require('../../app/models').Message;
const redisClient = require('../../common/model/redis.client')('socket');
const config = require('../../app/config/config');

module.exports = {
    // 加入房间
    'on_joinRoom': async function(data, ws, io) {
        console.log(2);
    },
    // 发送消息【房间】【已经建立房间经过消息处理】
    'on_pushToRoomMsg': async function(message, ws, io) {
        let roomId = message.data.roomId;
        let roomInfo = await RoomModel.findOne({
            'where': {
                'id': roomId,
            },
            'raw': true,
        });
        if (roomInfo) {
            let fromUInfo = await redisClient.get(`${config.redisKey.user}_${ws.mod}_${ws.user_hash}`);
            for (let hash of roomInfo.user_hashs) {
                // 除了自己所有人都发信息
                if (hash !== ws.user_hash) {
                    let toUInfo = await redisClient.get(`${config.redisKey.user}_${ws.mod}_${hash}`);
                    let wsCli = io.sockets.get(toUInfo[ws.vsf].sid);
                    if (wsCli) {
                        wsCli.SendInfo((message || {}).cmd, (message || {}).hash, {
                            'fromUser': {
                                'hash': ws.user_hash,
                                'nickname': fromUInfo[ws.vsf].nickname,
                                'avatar': fromUInfo[ws.vsf].avatar,
                            },
                            'msg': message.data.msg,
                            'roomId': roomId,
                        });
                    }
                }
            }
            await RoomModel.update({
                'msgAt': Date.now(),
            }, {
                'where': {
                    'id': roomId,
                },
            });
        } else {
            return ws.SendError((message || {}).cmd, (message || {}).hash, {
                'code': 500,
                'message': '发送失败',
            });
        }
        return ws.SendInfo((message || {}).cmd, (message || {}).hash, {
            'code': 200,
            'message': '发送成功',
        });
    },
    // 发送消息【某人】【新会需要新建房间】
    'on_pushToUserMsg': async function(message, ws, io) {
        let data = message.data;
        // 获取接收人用户hash
        let toUHash = data.toUHash;
        let fromUHash = ws.user_hash;
        if (!toUHash || !fromUHash) {
            return ws.SendError((message || {}).cmd, (message || {}).hash, {
                'code': 500,
                'message': '缺少参数',
            });
        }
        // 查看双方时候已经创建国房间
        let roomInfo = await RoomModel.findOne({
            'where': {
                'user_hashs': [ fromUHash, toUHash ],
                'type': 'double',
            },
            'raw': true,
        });
        if (roomInfo) {
            let roomId = roomInfo.id;
            message.data.roomId = roomId;
            return this.on_pushToRoomMsg(message, ws, io);
        }
        // 创建双人房间
        roomInfo = await RoomModel.create({
            'type': 'double',
            'user_hashs': [ fromUHash, toUHash ],
            'msgAt': Date.now(),
        });
        // 向接收人发消息
        let toUInfoVsf = await redisClient.get(`${config.redisKey.user}_${ws.mod}_${toUHash}`);
        // 发送人信息
        let fromUInfoVsf = await redisClient.get(`${config.redisKey.user}_${ws.mod}_${fromUHash}`);
        // 发送人一定在线
        // 如果接收人在线 则通过socket直接发送
        if (toUInfoVsf && toUInfoVsf[ws.vsf]) {
            let wsCli = io.sockets.get(toUInfoVsf[ws.vsf].sid);
            if (wsCli) {
                wsCli.SendInfo((message || {}).cmd, (message || {}).hash, {
                    'fromUser': {
                        'hash': ws.user_hash,
                        'nickname': fromUInfoVsf[ws.vsf].nickname,
                        'avatar': fromUInfoVsf[ws.vsf].avatar,
                    },
                    'msg': message.data.msg,
                    'roomId': roomInfo.id,
                });
            } else {
                return ws.SendError((message || {}).cmd, (message || {}).hash, {
                    'code': 500,
                    'message': '缺少参数',
                });
            }
        }
        // 存储消息记录
        await Messagemodel.create({
            'user_hash': ws.user_hash,
            'room_id': roomInfo.id,
            // 'type': '',
        });
        // 创建发送人浏览日志
        await LookModel.create({
            'room_id': roomInfo.id,
            'user_hash': ws.user_hash,
            'inAt': Date.now(),
        });
        return ws.SendInfo((message || {}).cmd, (message || {}).hash, {
            'code': 200,
            'message': '发送成功',
        });
    },

    // 进房间
    'on_inRoom': async function(message, ws, io) {
        let data = message.data;
        let lookInfo = await LookModel.findOne({
            'where': {
                'user_hash': ws.user_hash,
                'room_id': data.roomId,
            },
            'raw': true,
        });
        if (!lookInfo) {
            await LookModel.create({
                'user_hash': ws.user_hash,
                'room_id': data.roomId,
            });
        } else {
            await LookModel.update({
                'inAt': Date.now(),
                'outAt': null,
            }, {
                'where': {
                    'id': lookInfo.id,
                },
            });
        }
        return ws.SendInfo((message || {}).cmd, (message || {}).hash, {
            'code': 200,
            'message': '发送成功',
        });
    },
    // 出房间
    'on_outRoom': async function(message, ws, io) {
        let data = message.data;
        let lookInfo = await LookModel.findOne({
            'where': {
                'user_hash': ws.user_hash,
                'room_id': data.roomId,
            },
            'raw': true,
        });
        if (!lookInfo) {
            await LookModel.create({
                'inAt': Date.now(),
                'outAt': Date.now(),
                'user_hash': ws.user_hash,
                'room_id': data.roomId,
            });
        } else {
            await LookModel.update({
                'outAt': Date.now(),
            }, {
                'where': {
                    'id': lookInfo.id,
                },
            });
        }
        return ws.SendInfo((message || {}).cmd, (message || {}).hash, {
            'code': 200,
            'message': '发送成功',
        });
    },
};
