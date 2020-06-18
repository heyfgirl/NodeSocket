'use strict';
// const PushController = require('../controllers/push.controller');
const UserController = require('../controllers/user.controller');
const AuthUser = require('../middleware/auth_user');

module.exports = function(app) {
    // app.route('/api/socket/push').all(AuthWhite(), PushController.Push);
    // 获取房间列表
    app.route('/get/rooms').all(AuthUser(), UserController.GetRooms);
    app.route('/get/room').all(AuthUser(), UserController.GetRoom);
    app.route('/get/user_token').all(UserController.Register);// 注册用户获取用户连接token
    app.route('/get/messages').all(AuthUser(), UserController.GetMessages);// 注册用户获取用户连接token
};

