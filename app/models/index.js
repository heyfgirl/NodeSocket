'use strict';
const Sequelize = require('sequelize');
const config = require('../config/config');
// ///////////////数据库环境

// 创建数据库流
let sequelizeClient = new Sequelize(config.postgresql.dbname, config.postgresql.username, config.postgresql.password,
    {
        'host': config.postgresql.host,
        'port': 5432,
        'dialect': 'postgres',
        'timezone': '+08:00',
        'pool': {
            'max': 5,
            'min': 0,
            'idle': 10000,
        },
    }
);

function modelDefine(model_conf) {
    let Model = sequelizeClient.define(model_conf.key, model_conf.attributes, model_conf.options);
    return Model;
}
const RequestLog = modelDefine(require('../../common/model/request.log.model')); // 加载请求日志模块


const User = modelDefine(require('./user.model'));// 加载用户模块
sequelizeClient.authenticate().then(() => {
    // console.log(sequelizeClient);
    for (let i in sequelizeClient.models) {
        sequelizeClient.models[i].sync({ 'alter': true });
        sequelizeClient.models[i].update = function(values, options) {
            for (let k in values) {
                if (typeof values[k] === 'undefined') {
                    delete values[k];
                }
            }
            // let ss = Object.getPrototypeOf(this);
            return Object.getPrototypeOf(this).update.apply(this, arguments);

        };
    }
}).catch(err => {
    console.log('Unable to connect to the database', err);
});


// 获取数据库示例
function getSequelize() {
    return sequelizeClient;
}

module.exports = {
    getSequelize,
    User,
    RequestLog,
};
