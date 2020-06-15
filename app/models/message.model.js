'use strict';
const Sequelize = require('sequelize');
exports.key = 'message';
exports.name = '消息表';
exports.options = {
    'paranoid': false,
};
exports.attributes = {
    'id': {
        'comment': 'ID',
        'type': Sequelize.INTEGER,
        'primaryKey': true,
        'autoIncrement': true,
    },
    'type': {
        'comment': '消息类型',
        'allowNull': false,
        'defaultValue': 'text', // 默认文字性消息
        'type': Sequelize.STRING,
    },
    'user_hash': {
        'comment': '发表消息的人',
        'allowNull': false,
        'type': Sequelize.STRING,
    },
    'room_id': {
        'comment': '发表消息的房间',
        'allowNull': false,
        'type': Sequelize.INTEGER,
    },
    'extension': {
        'title': '扩展数据',
        'comment': '自行定义处理的字段',
        'allowNull': true,
        'defaultValue': {},
        'type': Sequelize.JSONB,
    },
};
