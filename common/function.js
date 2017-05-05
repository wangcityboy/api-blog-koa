/**
 * Created by 云飞凌风 on 2016/9/29.
 */
var _ = require('underscore');

var request = require('koa-request');
var async_request = require('request');
var fs = require('fs');
var path = require('path');

var C = require('../config');
var mysql = require('./mysql.js');

var _C = {}; // MySQL 配置方式
_C.cityInfo = []; // 城市信息, 内部对象命名方式为: citycode_020: {citycode: 020,cityname: 广州}


var redis = require('redis');
require('redis-lua2').attachLua(redis);
var redisClient;
if (C.redis.unix_socket) { // Unix Socket 方式
    redisClient = redis.createClient(C.redis.unix_socket, C.redis.options);
} else { // TCP 方式
    redisClient = redis.createClient(C.redis.port, C.redis.host, C.redis.options);
}

var redisClientDb1; // db1
if (C.redis.unix_socket) { // Unix Socket 方式
    redisClientDb1 = redis.createClient(C.redis.unix_socket, C.redis.options);
} else { // TCP 方式
    redisClientDb1 = redis.createClient(C.redis.port, C.redis.host, C.redis.options);
}
redisClientDb1.select(1, function() {});

var wrapper = require('co-redis');
var redisCo = wrapper(redisClient);
exports.redisCo = redisCo;
exports.redisClient = redisClient;

/*
 @todo 取到秒的时间戳
 函数名：timestamp
 * 参数：无
 * 返回：当前时间的10位UNIX时间戳
 */
function timestamp() {
    return parseInt(new Date().getTime() / 1000);
}
exports.timestamp = timestamp;



Date.prototype.format = function (format) //author: meizz
{
    var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(),    //day
        "h+": this.getHours(),   //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3),  //quarter
        "S": this.getMilliseconds() //millisecond
    };
    if (/(y+)/.test(format)) format = format.replace(RegExp.$1,
        (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)if (new RegExp("(" + k + ")").test(format))
        format = format.replace(RegExp.$1,
            RegExp.$1.length == 1 ? o[k] :
                ("00" + o[k]).substr(("" + o[k]).length));
    return format;
};




// 获取某天的起始时间戳 默认为当天 单位秒
exports.beginTimestamp = function (time1) {
    time1 = time1 == undefined ? timestamp() : parseInt(time1);
    var newDate = new Date(time1 * 1000);
    return parseInt(new Date(newDate.format('yyyy-MM-dd') + ' 0:0:0 CST+800').getTime() / 1000);
};

// 计算日期间隔 单位秒,time1 比 time2 晚时则为负数
exports.dateDiff = function (time1, time2) {
    time1 = this.beginTimestamp(time1); // 计算某天的起始时间戳
    time2 = this.beginTimestamp(time2); // 计算某天的起始时间戳
    return parseInt((time2 - time1) / (60 * 60 * 24));
};






/*
 @todo 验证是否是手机号码
 */
exports.isMobile = function (mob) {
    if (mob > 19999999999 || mob < 13000000000) {
        return false;
    } else {
        return true;
    }
};

/*
 @todo 检测手机号码是否存在
 */
exports.existMobile = function*(mobile) {
    var flag = false;
    var userData = yield mysql.query("select tg_id from tg_user where tg_mobile=?", [mobile]);
    if (userData.length > 0) {
        flag = true;
    }
    return flag;
};


/* 函数名：sendSMS
 * 参数：mob:手机号码,msg:UTF-8编码的短信内容
 * 返回：
 * 功能：发送短信
 */

exports.sendSMS = function* (mob, msg) {
    var options = {
        url: C.SMS.sms_url + '?sn=' + C.SMS.sms_sn + '&pwd=' + C.SMS.sms_pwd + '&mobile=' + mob + '&content=' + escape(msg + C.SMS.sms_footer) + '&ext=&stime=&rrid=' + C.SMS.sms_rrid,
        headers: {'User-Agent': 'request'}
    };
    var response = yield request(options); //Yay, HTTP requests with no callbacks!
    var retCode = response.body.match(/(\d{4,15})/mg);
    return (retCode == C.SMS.sms_rrid);
};



/*
 * @TODO login日志
 * @uid
 * @origin 来源: 1 User/Password,2 Tokenkey
 * @ip
 */

exports.loginLog = function (uid, origin, ip,region) {
    uid = parseInt(uid);
    origin = parseInt(origin);
    mysql.query('insert into mh_login_log(uid,origin,ip,timeline,cityid,city) values(?,?,?,UNIX_TIMESTAMP(),?,?)', [uid, origin, ip,region.city_id,region.city], function () {
    });
    mysql.query('update mh_user SET logintimes = logintimes+1,lastloginip=?,lastlogintime=UNIX_TIMESTAMP() WHERE uid=?', [ip, uid], function () {
    });
    mysql.query('update mh_user_info SET lastestregionid = ? WHERE uid=?', [region.city_id,uid], function () {
    });
};





/* ip地址查城市 淘宝接口获取
 return {
 “citycode”: “020”,
 "country": "中国",
 "country_id": "CN",
 "area": "华南",
 "area_id": "800000",
 "region": "广东省",
 "region_id": "440000",
 "city": "佛山",
 "city_id": "440600",
 "county": "",
 "county_id": "-1",
 "isp": "电信",
 "isp_id": "100017",
 "ip": "14.215.31.77"
 }
 */

function city2code(city) {
    if (city != undefined) {
        for (var i in _C.cityInfo) {
            if (_C.cityInfo[i].city == city) {
                return _C.cityInfo[i].citycode;
            }
        }
    }
    return '';
}
exports.city2code = city2code;

exports.ip2city = function (ip, cb) {
    var ip_start = ip.lastIndexOf(':');
    ip = ip.slice(ip_start >= 0 ? ip_start + 1 : 0);
    console.log(ip);
    if (ip.slice(0, 8) == '192.168.') {
        cb('Local', '');
    } else {
        var options = {
            url: 'http://ip.taobao.com/service/getIpInfo.php?ip=' + ip
        };
        async_request.get(options, function (error, response, body) {
            if (error) {
                if (typeof cb === 'function') {
                    cb(error, '');
                } else {
                    console.error('ip2city ERROR:', error);
                }
            }
            var cityInfo = isJson(body);
            if (cityInfo.code == 0) { // 有效数据
                var city = cityInfo.data.city.slice(0, -1);
                var citycode = city2code(city);
                if (typeof cb === 'function') {
                    cb(error, citycode);
                }
            }
        });
    }
};

/*
 @todo 获取用户ip地址对应的城市信息
 1.如果ip存在于表，并且没过期（暂定最后更新日期在一年内），则返回ip对应的region跟city信息；若已经过期，则到淘宝查询对应ip地址所在城市信息
 2.如果该ip不存在于本地SQL数据库里面，则到淘宝API查询对应的城市信息，并插入，返回城市信息
 函数名：getUserCity
 * 参数：无
 * 返回：{region:a,citycode:b}
 */
exports.getUserCityData=function*(ip){
    let ip_valid=false;
    let ip_exist=false;
    let return_data={};

    // 通过IP获取所在地
    let ip_start = ip.lastIndexOf(':');
    ip = ip.slice(ip_start >= 0 ? ip_start + 1 : 0);
    if (ip.slice(0, 8) == '192.168.'||ip=='::1'||ip=='1') {
        return_data.is_local = true;
        return_data.city_id = '0';
        return_data.city = 'local';
        return return_data;
    }

    let ip_info=yield mysql.query('SELECT city_id,city,timestampdiff(year,FROM_UNIXTIME(timeline, \'%Y-%m-%d\'),FROM_UNIXTIME(unix_timestamp(now()), \'%Y-%m-%d\')) duration from tg_ip_info where ip=? order by ipid desc limit 0,1',[ip]);
    if (ip_info && ip_info.length > 0) {
        if (ip_info && parseInt(ip_info[0].duration) == 0) {
            ip_valid = true;
            return_data.city_id = ip_info[0].city_id;
            return_data.city = ip_info[0].city;
            return return_data;
        }else{
            ip_exist = true;
        }
    }
    if(!ip_valid) {//如果不存在该ip或该ip已过期
        let options = {
            url: 'http://ip.taobao.com/service/getIpInfo.php?ip=' + ip,
            headers: {'User-Agent': 'request'},
            method: 'GET',
            timeout: 50000
        };
        let home = yield request(options);
        let cityInfo = isJson(home.body);
        if (cityInfo.code == 0) { // 有效数据
            return_data.is_local = false;
            return_data.city_id = cityInfo.data.city_id;
            return_data.city = cityInfo.data.city;
            if (ip_exist) {//IP存在则更新，不存在更插入到数据库
                mysql.query('update tg_ip_info set country=?,area=?,city_id=?,city=?,region=?,timeline=UNIX_TIMESTAMP(),json_info=? where ip=?', [cityInfo.data.country,
                    cityInfo.data.area, cityInfo.data.city_id, cityInfo.data.city, cityInfo.data.region, JSON.stringify(cityInfo.data), ip]);
            } else {
                let sql = ' where not exists(SELECT 1 from tg_ip_info where ip =\'' + ip + '\')';
                yield mysql.query('INSERT INTO tg_ip_info(ip,country,area,city_id,city,region,timeline,json_info) select ?,?,?,?,?,?,UNIX_TIMESTAMP(),? from dual ' + sql,
                    [ip, cityInfo.data.country, cityInfo.data.area, cityInfo.data.city_id, cityInfo.data.city, cityInfo.data.region, JSON.stringify(cityInfo.data)]);
            }
        }
    }
    return return_data;
};




/*
 @todo获取页面返回信息（返回对象）
 @status 状态码
 @msg  返回信息
 @level 返回信息等级
 @data 数据项（对象）
 */
exports.returnMsg = function (status, msg, level, data) {
    var returnData = {};
    returnData.status = status || 200;
    returnData.message = {
        msg: msg || "",
        level: level || 3,
        time: this.timestamp()
    };
    returnData.result = {};
    if (typeof data === "object" && data !== null) {
        returnData.result = data;
    }

    if (level == 4) { // 增加经验和悦币, msg 格式为: {e:-123,b:0,act:'点赞成功'}  【e:经验,b:悦币】
        returnData.message.msg = "";
        returnData.message.level = 3;
        if (typeof msg === "object") {
            var e = msg.e || 0;
            var b = msg.b || 0;
            if (e != 0 && b != 0) { //如果既传经验，也传悦币
                //格式: 经验 +10，悦币 +5
                returnData.message.msg = "经验 " + (e > 0 ? "+" : "") + e + "分，悦币 " + (b > 0 ? "+" : "");
            } else if (e != 0) { //只传经验
                //格式: 经验 +10
                returnData.message.msg = "经验 " + (e > 0 ? "+" : "") + e + "分";
            } else if (b != 0) {
                //格式: 悦币 +10
                returnData.message.msg = "悦币 " + (e > 0 ? "+" : "") + e;
            }

            // 插入动作
            if (returnData.message.msg != '' && msg.act != undefined) {

                returnData.message.msg = msg.act + ' ' + returnData.message.msg;
            }
            returnData.message.level = 4;
        }
    }

    if (C.env != 'production') {
        console.log('[RETURN] [%s] [%s]', returnData.status, returnData.message.msg);
    }
    return returnData;
};


/*
 @todo 获取随机数
 @len 随机数位数
 */
exports.getRandom = function (len) {
    return Math.floor(Math.random() * (Math.pow(10, len) - Math.pow(10, len - 1)) + Math.pow(10, len - 1));
};



/*
 isJson 判断字符串是否为json类型。返回json对象或false
 */
function isJson(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
}
exports.isJson = isJson;





exports.Init = function*(Env, actArray, I) {
    var _isSPAM = 0; // 是否垃圾、广告、微商、手机或QQ号码

    if (_.isEmpty(I)) {
        I = {};
        var fields = {};
        if (Env.request.body) {
            fields = Env.request.body.fields;
        }

        if (fields) {
            for (var field in fields) {
                I[field] = fields[field];
            }
        }
        var params = Env.params;
        if (params) {
            for (var parm in params) {
                I[parm] = params[parm];
            }

            if (I['apiVer']) {
                var pattern = /^v(\d+)$/gi;
                var tmpVer = pattern.exec(I['apiVer']);
                if (tmpVer[1] == undefined) {
                    I['apiVerNum'] = 1;
                } else {
                    I['apiVerNum'] = tmpVer[1];
                }
            } else {
                I['apiVerNum'] = 1;
            }
        }
        var querys = Env.query;
        if (querys) {
            for (var query in querys) {
                if(query !=='')
                    I[query] = querys[query];
            }
        }
    }


    var errors = {};
    if (I) {
        for (var i in I) {
            // act 参数存在,并且判断是大于0不超过2位的整数。
            if (_.v.isIn(i, ['act'])) {
                if (_.v.isInt(I[i])) {
                    if (I[i] >= 99 || I[i] < 1) {
                        errors.param = i;
                        errors.msg = i + ' 参数超出取值范围';
                        errors.level = 3;
                        break;
                    }
                    if (!_.v.isIn(I[i], actArray)) {
                        errors.param = i;
                        errors.msg = '未定义的功能';
                        errors.level = 3;
                        break;
                    }
                } else {
                    errors.param = i;
                    errors.level = 3;
                    errors.msg = i + ' 参数必须是整数';
                    break;
                }
            }

            // uid,tid,pid,tagid 参数存在,并且判断是大于0不超过10位的整数。
            if (_.v.isIn(i, ['uid', 'tid', 'pid', 'tagid', 'page', 'pagesize'])) {
                if (_.v.isInt(I[i])) {
                    I[i] = parseInt(I[i]);
                    if (I[i] >= Math.pow(10, 11) || I[i] < 1) {
                        errors.param = i;
                        errors.level = 3;
                        errors.msg = i + ' 参数超出取值范围';
                        break;
                    }
                } else {
                    errors.param = i;
                    errors.msg = i + ' 参数必须是整数';
                    break;
                }
            }

            // pagesize 参数存在,并且判断是大于0不超过50的整数。
            if (_.v.isIn(i, ['pagesize'])) {
                if (_.v.isInt(I[i])) {
                    if (I[i] > 50 || I[i] < 1) {
                        errors.param = i;
                        errors.level = 3;
                        errors.msg = i + ' 参数超出取值范围';
                        break;
                    }
                } else {
                    errors.param = i;
                    errors.msg = i + ' 参数必须是整数';
                    break;
                }
            }

            // mobile 参数存在,并且判断是否符合手机号码。
            if (_.v.isIn(i, ['mobile'])) {
                if (_.v.isInt(I[i])) {
                    if (I[i] > 19999999999 || I[i] < 13000000000) {
                        errors.param = i;
                        errors.level = 1;
                        errors.msg = '手机号码格式不对';
                        break;
                    }
                } else {
                    errors.param = i;
                    errors.level = 1;
                    errors.msg = '手机号码格式不对';
                    break;
                }
            }

            // password,ticket 参数存在,并且判断是否32位。
            if (_.v.isIn(i, ['password', 'ticket', 'oldpwd', 'newpwd'])) {
                if (_.v.isAlphanumeric(I[i])) {
                    if (!_.v.isByteLength(I[i], 32, 32)) {
                        errors.param = i;
                        errors.level = 3;
                        errors.msg = i + ' 参数必须是MD5(32)格式';
                        break;
                    } else if (I[i] == 'd41d8cd98f00b204e9800998ecf8427e') {
                        errors.param = i;
                        errors.level = 1;
                        errors.msg = i + ' 参数不能为空';
                    }
                    if (i == 'password' || i == 'oldpwd' || i == 'newpwd') {
                        I[i] = I[i].toLowerCase();
                    }
                } else {
                    errors.param = i;
                    errors.level = 3;
                    errors.msg = i + ' 参数必须是数字或字母';
                    break;
                }
            }


            // nickname 参数存在,并且判断是不大于10位。
            if (_.v.isIn(i, ['nickname'])) {
                I[i] = _.str.trim(I[i]); //去除收尾空字符,移除HTML标签 .stripTags()
                I[i] = I[i].replace(/\n+|\'|\"/mg, ''); //去除换行符、单引号、双引号
                I[i] = I[i].replace(/\s+/mg, ' '); //多个空格合并为1个空格
                if (!_.v.isLength(I[i], 2, 10)) {
                    errors.param = i;
                    errors.level = 1;
                    errors.msg = '昵称必须在2-10个字符以内';
                    break;
                }
            }


            // signature 参数存在,并且判断是不大于30位。
            if (_.v.isIn(i, ['signature'])) {
                I[i] = _.str.trim(I[i]); //去除收尾空字符,移除HTML标签 .stripTags()
                if (!_.v.isLength(I[i], 0, 30)) {
                    errors.param = i;
                    errors.level = 1;
                    errors.msg = '签名必须在30个字符以内';
                    break;
                }
            }

            // post 参数存在,并且判断是不大于250位。
            if (_.v.isIn(i, ['post'])) {
                I[i] = _.str.trim(I[i]); //去除收尾空字符
                I[i] = _.str.escapeHTML(I[i]); // HTML标签类转义
            }

            // tagtitle 参数存在,并且判断是1-10位。
            if (_.v.isIn(i, ['tagtitle'])) {
                I[i] = _.str.trim(I[i]); //去除收尾空字符,移除HTML标签 .stripTags()
                if (!_.v.isLength(I[i], 1, 30)) {
                    errors.param = i;
                    errors.level = 1;
                    errors.msg = '标签名称必须在1-30个字符以内';
                    break;
                }
            }

            // 判断日期格式是否正常
            if (_.v.isIn(i, ['sDate', 'eDate'])) {
                I[i] = _.str.trim(I[i]); //去除收尾空字符,移除HTML标签 .stripTags()
                if (!_.v.isDate(I[i])) {
                    errors.param = i;
                    errors.level = 1;
                    errors.msg = '日期格式错误';
                    break;
                }
            }

            // 去掉首尾空格
            if (_.v.isIn(i, ['tagtitle', 'nickname', 'post'])) {
                I[i] = _.str.trim(I[i]);
            }
        }

        if (_isSPAM!=0){
            I['_isSPAM'] = _isSPAM;
        }
        I.head_mark={};
        let head_mark = Env.request.accept.headers['mark']||'';
        let pattern = /[a-z,A-Z]{1,3}/mg;
        let markArr=head_mark.split(':');
        if(head_mark==undefined||markArr.length==0){
            I.head_mark.mark='';
        }else{
            I.head_mark.mark=head_mark;
        }
        let objMark={};
        for(let item of markArr){
            let arr=item.match(pattern);
            if (arr) {
                let key=arr[0];
                let value=item.replace(arr[0],'');
                if(_.v.isInt(value)){
                    value=parseInt(value);
                }else{value=0;}
                objMark[key]=value;
            }
        }
        I.head_mark.decodemark=objMark;
        var didInfo = {
            type: 0,
            device_id: ''
        };
        var did = Env.request.accept.headers['did'] || '';
        did = did.toLocaleLowerCase();
        if (did && did.length == 35) {
            let did_arr = did.split("-");
            try {
                didInfo.type = parseInt(did_arr[0]);
                didInfo.device_id = did_arr[1].toLowerCase();
            }
            catch (err) {
                console.log(err);
            }
        }
        I.device_id = didInfo;
        var app_ver = Env.request.accept.headers['app-ver'];
        var appInfo = {
            os: 0, // 0 未知系统, 1 Android, 2 IOS
            code: 0, // 版本 code 号
            ver: '',// 版本号
            test: 0, // 0 正式版本, 1 测试版本
            channel: ''
        };

        I.app_ver_arr = appInfo;

        if (app_ver == undefined) {
            app_ver = '';
        } else { // a-22-2.1.8a-Xiaomi
            let app_ver_arr = app_ver.split("-");
            try {
                // 判断 os
                if (app_ver_arr[0] == 'a') {
                    appInfo.os = 1;
                } else if (app_ver_arr[0] == 'i') {
                    appInfo.os = 2;
                }

                // 判断 code
                if (_.v.isNumeric(app_ver_arr[1])) {
                    appInfo.code = parseInt(app_ver_arr[1]);
                }

                // 判断 ver test
                if (app_ver_arr[2]) {
                    appInfo.ver = app_ver_arr[2];
                    appInfo.test = _.v.isNumeric(app_ver_arr[2].slice(-1)) ? 1 : 0;
                }

                appInfo.channel = app_ver_arr[3];
                I.app_ver_arr = appInfo;
            }
            catch (err) {
                //在这里处理错误
                console.log(err);
            }
        }

        if (I.tokenkey && I.tokenkey.length==40){
            if(Env.foro2o && Env.foro2o==true){
                console.log('call from o2o');
                I['loginStatus'] = yield o2oF.o2oIsLogin({I:I,ip:Env.ip});
            }else{
                I['loginStatus'] = yield exports.isLogin({I:I,ip:Env.ip});
            }
        }else{
            I['loginStatus'] = {
                status: false
            };
        }


        if (!_.isEmpty(errors)) {
            I.errors = errors;
            console.log('[ERR] [%s] [%s] [%s] <%s> [%s] [%s] [%s] <%s>', new Date().format('yyyy-MM-dd hh:mm:ss'), Env.ip, app_ver, did,
                Env.request.method, Env.req.url, errors, Env.request.accept.headers['user-agent']);
        }

        console.log('[INFO] [%s] [%s] [%s] <%s> [%s] [%s] <%s>', new Date().format('yyyy-MM-dd hh:mm:ss'), Env.ip, app_ver, did,
            Env.request.method, Env.req.url, Env.request.accept.headers['user-agent']);
        if (C.env != 'production') {
            console.log('[Input] [%O]', I);
        }
    }

    return I;
};
