'use strict';

/**
 * Module dependencies.
 */

var path = require('path');
var os = require('os');
var _ = require('underscore');


var root = path.dirname(__dirname);

var allConfig = {
    /**
     * Cluster mode
     */
    enableCluster: true,
    numCPUs: os.cpus().length,

    // max request json body size
    jsonLimit: '10mb',

    // log dir name
    logdir: path.join(root, '.tmp', 'logs'),

    apiPre: '/api',

    SMS: {
        sms_url: 'http://sdk2.entinfo.cn:8060/webservice.asmx/mdSmsSend_u',
        sms_sn: 'SDK-TOM-010-00093',
        sms_pwd: 'CCA304B14316566D6E17BC5439469FC6',
        sms_footer: '【云飞凌风博客网站】',
        sms_rrid: '78123987',
        sms_interval: 120//同一ip每次发短信间隔,单位秒
    },
    verificationTimeOut: 600,//短信验证码过期时间(单位秒)

    login: {
        login_attemptLimit: 5,  // 可尝试次数
        login_attemptCountPrefix: 'login:attemptCount_',  // Redis 已尝试次数key前缀
        login_lockPrefix: 'login:lock_',  // Redis 是否被锁key前缀
        login_lockInterval: 300  // 锁定时间，5分钟
    },

    session: {
        key: 'mh.sid',
        prefix: 'mh:sess:',
        ttl: 120 * 60, // session 过期时间 120分钟，单位秒（登录会话）
        site_ttl: 5 * 60//统计网站信息会话
    },

    cookie: {
        domain: 'wanghaifeng.net',//
        maxage: null
    },

    user: {
        tokenKeyExp: 30,//手机端tokenKey过期时间(单位天)
        regExp: 600//注册过期时间（单位秒）
    }
};


// 通过NODE_ENV来设置环境变量，如果没有指定则默认为生产环境
var env = process.env.NODE_ENV || 'development';
env = env.toLowerCase();

// C.env 为运行环境
allConfig.env = env;

// 载入配置文件
var file = path.resolve(__dirname, env + '.js');
try {
    var envConfig = require(file);
    var config = _.extend(allConfig, envConfig);
    console.log('Load config: [%s] %s', env, file);
} catch (err) {
    console.error('Cannot load config: [%s] %s', env, file);
    throw err;
}


module.exports = config;
