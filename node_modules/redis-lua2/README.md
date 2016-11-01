Fork of **node_redis_lua** by shirro
====================================

Patch redis script commands into node-redis prototype.

## Npm

    npm install redis-lua2

## Usage
First attach `redis-lua` to `node_redis`:

    redis = require('redis');
    require('redis-lua2').attachLua(redis)

Then define some scripts (scripts may take an _unlimited_ number of arguments):

    redis.lua('myset', 'return redis.call("set", KEYS[1], KEYS[2])');

If the last parameter is set to `true` the command result will be converted to a JavaScript
object literal:

    redis.lua('hashtest, 0, 'return redis.call("hgetall", "something")', true);

Finally create a redis client and call the script like a regular redis command:

    r = redis.createClient();
    r.myset(2, 'testing', 'surprise', redis.print);

Note: `2` is the number of keys that the script will receive. Arrays are also supported:

    var args = ['testing', 'surprise']
    ,   r = redis.createClient();
    r.myset(args.length, args, function(err, res){console.log(arguments)});

The lua script will be passed by `eval` the first time and subsequent calls by `evalsha`.
