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

let sids = new Set();
let io;
let a = 1,
    a_cp = 1;
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
        'verifyClient': (info, cb) => {
            cb(true);
        },
    });
    io.sockets = {};// 初始化所有客户端[ws模块会自己将client添加到 io.clients的Set里面]
    io.on('connection', async function connection(ws, request, client) {
        // ping通过,说明连接存活
        ws.on('pong', () => {
            this.isAlive = true;
        });
        // 监听断开事件
        ws.on('close', async function() {
            console.log('断开连接 sid =>', ws.sid);
            await socketClose(this);
        });
        // 新连接 【验证等操作】
        let [ err ] = await newConnection(ws, request);
        if (err) {
            ws.send(JSON.stringify({
                'cmd': 'connection',
                'data': {
                    'success': false,
                    'message': 'auth_error',
                },
                'error': err,
            }));
            ws.terminate('验证失败');
        } else {
            ws.send(JSON.stringify({
                'cmd': 'connection',
                'data': {
                    'success': true,
                    'message': 'ok',
                },
            }), null, function() {
                console.log(`sid =》 ${ws.sid} 客户端接收验证成功', '可以开始监听客户端数据`);
                // 监听消息
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
            });
        }
    });
    return io;
};

// 心跳
const interval = setInterval(function ping() {
    io.clients.forEach(ws => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(() => {
            ws.isAlive = true;
        });
    });
}, 5000);
// 客户端断开连接
async function socketClose(ws) {
    sids.delete(ws.sid);
    delete io.sockets[ws.sid];
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
        'cmd': (message || {}).cmd || 'undefined',
        'data': {
            'success': false,
        },
        'error': {
            'code': 404,
            'message': `监听到消息，但服务其并未对事件进行监听.【 ${JSON.stringify({ message })} 】。`,
        },
    }));
}
// 新连接 客户端到来
async function newConnection(ws, request) {
    // 新增 socket增加socket的sid
    try {
        while (a_cp === a) {
            let sid = chance.hash({ 'length': 32 });
            if (!sids.has(sid)) {
                io.sockets[sid] = ws;
                sids.add(sid);
                ws.sid = sid;
                break;
            }
        }
        // 对该socket进行用户验证
        let vars = request.url.split('&');
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
        let { token } = query;
        let vsf = request.headers.vsf;
        if (!token || !vsf) {
            return [ new Error('验证失败') ];
        }
        // 用户在该平台的唯一标识
        let IndenfiyInfo = await IdentfiyModel.findOne({
            'where': {
                'token': token,
            },
            'raw': true,
        });
        if (!IndenfiyInfo) {
            return [ new Error('验证失败') ];
        }
        // 用户信息
        let UserInfo = await UserModel.findOne({
            'where': {
                'id': IndenfiyInfo.uid,
            },
            'raw': true,
        });
        if (!UserInfo) {
            return [ new Error('验证失败') ];
        }
        ws.user_hash = UserInfo.hash;
        // 更新redis缓存信息
        await redisClient.set(`${config.redisKey.ws}_${ws.sid}`, {
            'user_hash': ws.user_hash,
            'mod': UserInfo.mod,
        });
        let userInfoCache = await redisClient.get(`${config.redisKey.user}_${UserInfo.mod}_${UserInfo.hash}`);
        ws.vsf = vsf;
        ws.mod = UserInfo.mod;
        if (userInfoCache) {
            userInfoCache[vsf] = {
                'sid': ws.sid,
                'nickname': UserInfo.nickname,
                'avatar': UserInfo.avatar,
            };
        } else {
            userInfoCache = {
                [vsf]: {
                    'sid': ws.sid,
                    'nickname': UserInfo.nickname,
                    'avatar': UserInfo.avatar,
                },
            };
        }
        await redisClient.set(`${config.redisKey.user}_${UserInfo.mod}_${UserInfo.hash}`, userInfoCache);
    } catch (err) {
        return [ err ];
    }
    return [ null ];
}
// 加载监听客户端 指令 【暂时无用】
function commandListF(message, ws, io) {
    let isAnswer = false; // 假设无响应
    cmdFunList.cmd.forEach(cmd => {
        if (message.cmd === cmd) {
            isAnswer = true;
            cmdFunList.func[`on_${cmd}`](message.data, ws, io);
        }
    });
    // 确实无监听事件  则返回消息
    if (!isAnswer) {
        NoResponse(message, ws);
    }
}
