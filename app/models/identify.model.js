'use strict';
const Sequelize = require('sequelize');
exports.key = 'identify';
exports.name = '模块对接用户标识表';
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
    'token': {
        'title': '唯一Hash',
        'comment': '编号,hash形式，不可修改',
        'unique': 'true',
        'allowNull': false,
        'type': Sequelize.STRING,
    },
    'uid': {
        'comment': '用户id',
        'unique': 'uid_module',
        'allowNull': false,
        'type': Sequelize.INTEGER,
    },
    'module': {
        'comment': '开发模块',
        'unique': 'uid_module',
        'allowNull': false,
        'type': Sequelize.STRING,
    },
    'extension': {
        'title': '扩展数据',
        'comment': '自行定义处理的字段',
        'allowNull': true,
        'defaultValue': {},
        'type': Sequelize.JSONB,
    },
};
