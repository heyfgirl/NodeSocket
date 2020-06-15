'use strict';
const Sequelize = require('sequelize');
exports.key = 'user';
exports.name = '用户表';
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
    'hash': {
        'title': '唯一Hash',
        'comment': '编号,hash形式，不可修改',
        'unique': 'true',
        'allowNull': false,
        'type': Sequelize.STRING,
    },
    'avatar': {
        'title': '头像',
        'comment': '头像',
        'allowNull': false,
        'type': Sequelize.STRING,
    },
    'nickname': {
        'title': '昵称',
        'comment': '用户昵称，可以随意修改',
        'allowNull': false,
        'defaultValue': '新用户',
        'type': Sequelize.STRING,
    },
    'notalk': {
        'title': '是否禁言',
        'comment': '是否禁言',
        'type': Sequelize.BOOLEAN,
        'defaultValue': false,
    },
    'extension': {
        'title': '扩展数据',
        'comment': '自行定义处理的字段',
        'allowNull': true,
        'defaultValue': {},
        'type': Sequelize.JSONB,
    },
};
