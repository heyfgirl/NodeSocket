'use strict';
let config = {
    'port': 8084, // 项目端口
    'redisKey': {
        'token': 'token_body', // token的key
        'user': 'user_info',
        'ws': 'ws_info',
    },

};

console.log(process.env.NODE_ENV);

if (process.env.NODE_ENV) {
    config = Object.assign(config, require(`./env/${process.env.NODE_ENV}`));
} else {
    config = Object.assign(config, require('./env/dev'));
}
module.exports = config;
