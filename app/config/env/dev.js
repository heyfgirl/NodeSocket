'use strict';
module.exports = {
    'redis_common': {
        'port': 6379,
        'host': 'dev.guaishoubobo.com',
        'password': 'sC5Ja6yx',
        'max_clients': 10,
        'min_clients': 1,
    },
    'postgresql': {
        'host': 'dev.guaishoubobo.com',
        'port': 5432,
        'dbname': 'socket_dev',
        'username': 'postgres',
        'password': 'O8MxsIhH',
        'pool': {
            'max': 200,
            'min': 0,
            'idle': 10000,
        },
    },
};
