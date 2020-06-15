'use strict';
const PushController = require('../controllers/push.controller');
// const UserAuth = require('../middleware/user_auth');
const AuthWhite = require('../middleware/auth_white');

module.exports = function(app) {
    /* GET /api/users */
    // app.route('/api/sync').all(async (ctx, next) => {
    //     let { model, force, alter } = ctx.request.body;
    //     await require('../models')[model].sync({ 'force': force, 'alter': alter });
    //     ctx.result = {
    //         'data': 1,
    //     };
    //     await next();
    // });
    app.route('/api/socket/push').all(AuthWhite(), PushController.Push);
};

