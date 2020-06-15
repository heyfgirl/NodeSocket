'use strict';
const Sequelize = require('sequelize');
exports.key = 'look';
exports.name = '观看日志';
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
    'room_id': {
        'title': '房间id',
        'comment': '房间id',
        'unique': 'user_room_id',
        'allowNull': false,
        'type': Sequelize.INTEGER,
    },
    'user_hash': {
        'comment': '用户唯一标识',
        'unique': 'user_room_id',
        'allowNull': false,
        'type': Sequelize.STRING,
    },
    'inAt': {
        'comment': '进入时间',
        'allowNull': false,
        'defaultValue': Date.now(),
        'type': Sequelize.DATE,
    },
    'outAt': {
        'comment': '出去时间',
        'allowNull': true,
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
