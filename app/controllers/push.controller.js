'use strict';
const socket_io = require('../../socket');
module.exports = {
    // 测试
    async Push(ctx, next) {
        try {
            console.log(2);
        } catch (error) {
            console.log(error);
        }
        ctx.result['data'] = 'ok';
        ctx.result['success'] = true;
        await next();
    },
};
