'use strict';
const config = require('./app/config/config');
// 子模块只使用在了 redis的client中
require('./common/model/redis.client')('socket', config.redis_common); // 初始化 redis
const Koa = require('koa');
const App = new Koa();
const bodyParser = require('koa-bodyparser');
const cors = require('koa-cors');
const http = require('http');
const routing = require('koa2-routing');
const routes = require('./app/routes');
const Sequelize = require('./app/models/index');
const commonHandle = require('./common/middleware/common_handle')(Sequelize.getSequelize(), Sequelize.RequestLog);
const Socket = require('./socket');

// 解决跨域问题2
App.use(cors({
    'credentials': true,
}));
App.use(bodyParser());
App.use(commonHandle);
// 加载路由
App.use(routing(App));
routes(App);


App.use(async (ctx, next) => {
    await next();
});

// 信令服务器 控制文件
let server = http.createServer(App.callback());
Socket(server);

server.listen(config.port, () => {
    console.log('socket 开启 success port = ' + config.port);
});

