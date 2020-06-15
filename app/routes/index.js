'use strict';
// const PushController = require('../controllers/push.controller');
const UserController = require('../controllers/user.controller');
const AuthWhite = require('../middleware/auth_white');

module.exports = function(app) {
    // app.route('/api/socket/push').all(AuthWhite(), PushController.Push);
    // 获取房间列表
    app.route('/get/rooms').all(UserController.GetRooms);
    app.route('/get/uset_token').all(UserController.Register);// 注册用户获取用户连接token
};

