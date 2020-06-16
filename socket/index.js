'use strict';
/**
 * @Author  wqiong
 * @Date    2019-08-12T15:19:08+08:00
 * @Description socket 信令服务器主文件
 */
const Ws = require('ws');
const WebSocketServer = Ws.Server;
const fs = require('fs');
const path = require('path');
const FolderPath = __dirname + '/../socket/function_conf';
const readDir = fs.readdirSync(FolderPath);// 信令处理文件
let cmdFunList = {
    'cmd': [],
    'func': {},
};
readDir.forEach(file_path => { // 遍历文件夹获取文件
    file_path = path.join(FolderPath, file_path);
    let commonConf = require(file_path);// 加载某文件

    cmdFunList.func = Object.assign({}, commonConf);
    cmdFunList.cmd = cmdFunList.cmd.concat(cmdFunList.cmd, Object.keys(commonConf).map(item => {
        return item.replace(/^on_/, '');
    }));
});

const IdentfiyModel = require('../app/models').Identify;
const UserModel = require('../app/models').User;
const chance = require('chance')();
const config = require('../app/config/config');
const redisClient = require('../common/model/redis.client')('socket');

let io;
let a = 1,
    a_cp = 1,
    interval;
module.exports = server => {
    if (!server) {
        if (!io) {
            throw new Error('异常错误，初始化socket失败');
        } else {
            return io;
        }
    }
    io = new WebSocketServer({
        server,
        // 连接验证
        'verifyClient': async (info, cb) => {
            // let
            try {
                while (a_cp === a) {
                    let sid = chance.hash({ 'length': 32 });
                    if (!io || !io.sockets.has(sid)) {
                        info.req.sid = sid;
                        break;
                    }
                }
                // 对该socket进行用户验证
                let vars = info.req.url.split('&');
                let query = {};
                for (let i = 0; i < vars.length; i++) {
                    let pair = vars[i].split('=');
                    if (pair.length === 2) {
                        if (pair[0].indexOf('?') > -1) {
                            let par_i = pair[0].split('?');
                            pair[0] = par_i[1];
                        }
                        query[pair[0]] = pair[1];
                    }
                }
                let { token, vsf } = query;
                if (!token || !vsf) {
                    cb(false, 403, '验证失败');
                }
                // 用户在该平台的唯一标识
                let IndenfiyInfo = await IdentfiyModel.findOne({
                    'where': {
                        'token': token,
                    },
                    'raw': true,
                });
                if (!IndenfiyInfo) {
                    cb(false, 403, '验证失败');
                }
                // 用户信息
                let UserInfo = await UserModel.findOne({
                    'where': {
                        'id': IndenfiyInfo.uid,
                    },
                    'raw': true,
                });
                if (!UserInfo) {
                    cb(false, 403, '验证失败');
                }
                info.req.user_hash = UserInfo.hash;
                // 更新redis缓存信息
                await redisClient.set(`${config.redisKey.ws}_${info.req.sid}`, {
                    'user_hash': info.req.user_hash,
                    'mod': UserInfo.mod,
                });
                let userInfoCache = await redisClient.get(`${config.redisKey.user}_${UserInfo.mod}_${UserInfo.hash}`);
                info.req.vsf = vsf;
                info.req.mod = UserInfo.mod;
                if (userInfoCache) {
                    userInfoCache[vsf] = {
                        'sid': info.req.sid,
                        'nickname': UserInfo.nickname,
                        'avatar': UserInfo.avatar,
                    };
                } else {
                    userInfoCache = {
                        [vsf]: {
                            'sid': info.req.sid,
                            'nickname': UserInfo.nickname,
                            'avatar': UserInfo.avatar,
                        },
                    };
                }
                await redisClient.set(`${config.redisKey.user}_${UserInfo.mod}_${UserInfo.hash}`, userInfoCache);
            } catch (err) {
                return cb(false, 403, '验证失败');
            }
            return cb(true);
        },
        'clientTracking': false, // 去除自带 io.clients的set记录方式，使用object记录
    });
    io.sockets = new Map();// 初始化所有客户端[ws模块会自己将client添加到]
    io.on('connection', async function connection(ws, req) {
        ws.vsf = req.vsf;
        ws.mod = req.mod;
        ws.sid = req.sid;
        ws.user_hash = req.user_hash;
        io.sockets.set(ws.sid, ws);// [ws.sid ] = ws;
        ws.SendError = function(cmd, hash, error) {
            let data = {
                'cmd': cmd || null,
                'hash': hash || null,
                'success': false,
                'data': null,
                'error': error,
            };
            return ws.send(JSON.stringify(data));
        };
        ws.SendInfo = function(cmd, hash, info) {
            let data = {
                'cmd': cmd || null,
                'hash': hash || null,
                'success': true,
                'data': info,
                'error': null,
            };
            return ws.send(JSON.stringify(data));
        };

        ws.on('message', message => {
            // console.log('received: %s', message);
            try {
                message = JSON.parse(message);
                // 集中统一信令服务器，指令事件
                commandListF(message, ws, io);
            } catch (error) {
                console.log('解析指令失败');
                NoResponse(message, ws);
            }
        });
        // ping通过,说明连接存活
        ws.on('pong', () => {
            this.isAlive = true;
        });
        // 监听断开事件
        ws.on('close', async function() {
            console.log('断开连接 sid =>', ws.sid);
            await socketClose(this);
        });

    });
    io.on('close', function close() {
        clearInterval(interval);
    });
    return io;
};

// 心跳
interval = setInterval(function ping() {
    if (io && io.sockets) {
        io.sockets.forEach(ws => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping(() => {
                ws.isAlive = true;
            });
        });
    }
}, 5000);


// 客户端断开连接
async function socketClose(ws) {
    io.sockets.delete(ws.sid);
    await redisClient.destroy(`${config.redisKey.ws}_${ws.sid}`);
    let userInfo = await redisClient.get(`${config.redisKey.user}_${ws.mod}_${ws.user_hash}`);
    if (userInfo && userInfo[ws.vsf]) {
        delete userInfo[ws.vsf];
        await redisClient.set(`${config.redisKey.user}_${ws.mod}_${ws.user_hash}`, userInfo);
    } else {
        await redisClient.destroy(`${config.redisKey.user}_${ws.mod}_${ws.user_hash}`);
    }
}
// 对未监听 事件作出响应
function NoResponse(message, ws) {
    ws.send(JSON.stringify({
        'cmd': (message || {}).cmd || null,
        'hash': (message || {}).hash || null,
        'success': false,
        'data': null,
        'error': {
            'code': 404,
            'message': `监听到消息，但服务其并未对事件进行监听.【 ${JSON.stringify({ message })} 】。`,
        },
    }));
}
// 加载监听客户端 指令 【暂时无用】
function commandListF(message, ws, io) {
    let isAnswer = false; // 假设无响应
    cmdFunList.cmd.forEach(cmd => {
        if (message.cmd === cmd) {
            if (!message.data) {
                message.data = {};
            }
            isAnswer = true;
            cmdFunList.func[`on_${cmd}`](message, ws, io);
            return;
        }
    });
    // 确实无监听事件  则返回消息
    if (!isAnswer) {
        NoResponse(message, ws);
    }
}
