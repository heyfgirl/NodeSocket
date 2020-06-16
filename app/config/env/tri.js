'use strict';
module.exports = {
    'redis_common': {
        'port': 6379,
        'host': '127.0.0.1',
        'password': 'sC5Ja6yx',
        'max_clients': 10,
        'min_clients': 1,
    },
    'postgresql': {
        'host': '127.0.0.1',
        'port': 5432,
        'dbname': 'socket_tri',
        'username': 'postgres',
        'password': 'O8MxsIhH',
        'pool': {
            'max': 200,
            'min': 0,
            'idle': 10000,
        },
    },
};
