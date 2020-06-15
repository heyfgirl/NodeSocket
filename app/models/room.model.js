'use strict';
const Sequelize = require('sequelize');
exports.key = 'room';
exports.name = '会话房间';
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
        'comment': '房间类型【many】多人和【double】双人',
        'allowNull': false,
        'defaultValue': 'double',
        'type': Sequelize.STRING,
    },
    'user_hashs': {
        'comment': '用户id列表',
        'allowNull': false,
        'type': Sequelize.ARRAY(Sequelize.STRING),
    },
    'msgAt': {
        'comment': '最后的消息时间',
        'allowNull': true,
        'defaultValue': null,
        'type': Sequelize.DATE,
    },
    'extension': {
        'title': '扩展数据',
        'comment': '自行定义处理的字段',
        'allowNull': true,
        'defaultValue': {},
        'type': Sequelize.JSONB,
    },
};
