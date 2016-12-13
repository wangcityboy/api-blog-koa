/**
 * Created by 云飞凌风 on 2016/9/29.
 */

'use strict';
var session = require('koa-generic-session');
var thunkify = require('thunkify');
var md5 = require('md5');
var uid2 = require('uid2');
var slashes = require('slashes');

var MUsers = require('../model/users.js');
var MNotes = require('../model/notes.js')
var C = require('../config/index');
var F = require('../common/function');
var mysql = require('./mysql.js');


var _ = require('underscore');
_.str = require('underscore.string');
_.v = require('validator');

var redisCo = F.redisCo;


/*
 *@todo  API01 广告轮播图
 * */
exports.getAdvertiselist = function*(Env){
    var fields = Env.I;
    var type = fields.type;
    let advertiseData = yield MUsers.getAdvertiselist("tg_id,tg_image,tg_content,tg_url,tg_type", "tg_type=?", [type]);
    return F.returnMsg('200', '广告轮播图列表返回成功', 3, advertiseData);
}

/*
 *@todo  API02 获取相册列表
 * */
exports.getDirslist = function*(Env){
    var fields = Env.I;
    var type = fields.type;
    let photoDirData = yield MUsers.getDirlist("tg_id,tg_name,tg_password,tg_content,tg_face,tg_dir,tg_date", "tg_type=?", [type]);
    return F.returnMsg('200', '相册列表返回成功', 3, photoDirData);
}

/*
 *@todo  API03 根据相册ID来获取相片列表
 * */
exports.getPhotoslist = function*(Env){
    var fields = Env.I;
    var sid = fields.sid;
    let photosData = yield MUsers.getPhotoslist("tg_id,tg_name,tg_url,tg_content,tg_readcount,tg_username,tg_date", "tg_sid=?", [sid]);
    return F.returnMsg('200', '相片列表返回成功', 3, photosData);
}

/*
 * @TODO 获取菜单分类
 * @uid
 * @origin 来源: 分类ID
 * @ip
 */
exports.getMenu = function*(param){
    //console.log(Env);
    //var fields = Env.I;
    //console.log("fields=",fields);
    //var sid = fields.parent;
    let par = yield mysql.queryOne('select * from tg_menu where tg_id = ?',[param]);
    //let par = yield MUsers.getMenu("tg_id,tg_title,tg_type,tg_url,tg_topimage,tg_parent","tg_id",[param]);
    console.log("par="+par);

    //get child
    let child = yield mysql.query('select * from tg_menu where tg_parent = ?',[param]);
    console.log("child="+child);
    return {parent:par,child:child};
};

/*
 *@todo  API18 日志列表
 * */
exports.getNoteslist = function*(Env){
    var fields = Env.I;
    var classifyid = fields.classifyid;
    if (classifyid == null){
        classifyid = (10007,10008,10009,10010,10011,10012,10013,10014);
    }
    let noteData = yield MNotes.getNotes("tg_id,tg_username,tg_classify,tg_title,tg_content,tg_image,tg_readcount,tg_nickname,tg_date", "tg_classify=?", [classifyid]);
    return F.returnMsg('200', '日记列表返回成功', 3, noteData);
}


/*
 *@todo  API04 登录
 * */
exports.login = function* (Env) {
    var fields = Env.I;
    var apiVer = fields.apiVer;//版本号
    var mobile = fields.mobile;
    var password = fields.password;
    var act = fields.act;
    let region_data = yield F.getUserCityData(Env.ip);

    if (!F.isMobile(mobile)) {//判断手机号码格式是否正确
        return F.returnMsg(400, '手机号码格式不正确', 1);
    }
    var attemptLimit = C.login.login_attemptLimit;
    var attempts = yield redisCo.get(C.login.login_attemptCountPrefix + mobile);
    attempts = attempts || 0;
    if (attempts >= attemptLimit) {
        return F.returnMsg(400, '尝试次数过多，请等待5分钟后再试', 1);
    }
    var userData = yield MUsers.getUser("tg_id,tg_uniqid,tg_username,tg_password,tg_nickname,tg_mobile,tg_face", "tg_mobile=?", [mobile]);
    if (userData.length > 0 && userData[0]['tg_password'] == _.str.trim(password)) {
        var newUniqid = uid2(40);
        F.redisClient.expire('siss:user:tg_id_' + userData[0]['tg_id'], C.session.ttl);
        F.redisClient.SETEX('siss:user:tg_uniqid_' + newUniqid, C.session.ttl, userData[0]['tg_id']);
        yield MUsers.updateToken(userData[0]['tg_id'], newUniqid);
        return F.returnMsg(200, '登录成功', 3, {
            tg_id: userData[0]['tg_id'],
            tg_uniqid: newUniqid,
            tg_nickname: userData[0]['tg_nickname'],
        });
    }
};

/*
 *@todo  API05 登出
 */
exports.logout = function*(Env) {
    var fields = Env.I;
    var act = fields.act;
    if (act == 1) {
        var tokenKey = fields.tokenkey;
        F.redisClient.del('siss:user:token_' + tokenKey);
    } else if (act == 11) {
        var session = Env.session;
        session.uid = null;
    }
    return F.returnMsg(200, '退出成功', 3);
};
/*
 * @todo API04 获取短信验证码
 * */
exports.sendVerification = function*(Env) {
    var fields = Env.I;

    // 验证2分钟内重复发送
    var ip = Env.ip;
    var exist = yield redisCo.exists('sms:IP_' + ip);
    var existVal = yield redisCo.get('sms:IP_' + ip);
    if (exist && existVal == 1) {
        return F.returnMsg(400, '尝试次数过多，请等待' + C.SMS.sms_interval / 60 + '分钟后再试', 1);
    }

    //判断手机号码是否有效
    var mobile = fields.mobile;
    var act = fields.act;//action 1/11注册 2/12重置密码
    if (!F.isMobile(mobile)) {
        return F.returnMsg(400, '手机号码无效', 1);
    }

    var isExist = yield F.existMobile(mobile);//查找手机号码是否存在（重置密码）
    if (act == 2 || act == 12) {//重置密码（1注册2重置密码）
        if (!isExist) {//判断手机号码是否存在
            return F.returnMsg(400, '此手机号码未注册过', 1);
        }
        if (parseInt(mobile) >= 18900000000 && parseInt(mobile <= 19999999999)) {//内部测试
            return F.returnMsg(200, '验证码已发送', 1);
        } else {
            var verCode = F.getRandom(5);
            var flag = yield F.sendSMS(mobile, '找回密码验码[' + verCode + '],有效期为' + parseInt(C.verificationTimeOut) / 60 + '分钟');
            if (flag) {
                F.redisClient.SETEX('sms:verCode_' + mobile, C.verificationTimeOut, verCode);//保存验证码
                F.redisClient.SETEX('sms:IP_' + ip, C.SMS.sms_interval, 1);
                return F.returnMsg(200, '验证码已发送', 1);
            } else {
                return F.returnMsg(400, '验证码发送失败', 1);
            }
        }
    } else if (act == 1 || act == 11) { // 注册
        if (isExist) {//判断手机号码是否存在
            return F.returnMsg(400, '此手机号码已注册过', 1);
        }
        if (parseInt(mobile) >= 18900000000 && parseInt(mobile <= 19999999999)) {//内部测试
            return F.returnMsg(200, '验证码已发送', 1);
        } else {
            var verCode = F.getRandom(5);
            var flag = yield F.sendSMS(mobile, '感谢您注册，注册验码[' + verCode + ']有效期为' + parseInt(C.verificationTimeOut) / 60 + '分钟');
            if (flag) {
                F.redisClient.SETEX('sms:verCode_' + mobile, C.verificationTimeOut, verCode);//保存验证码
                F.redisClient.SETEX('sms:IP_' + ip, C.SMS.sms_interval, 1);
                return F.returnMsg(200, '验证码已发送', 1);
            } else {
                return F.returnMsg(400, '验证码发送失败', 1);
            }
        }
    }
};


/*
 *@todo  API02 获取短信验证凭证
 * */
exports.registerTicket = function*(Env) {
    let fields = Env.I;
    let loginStatus = fields.loginStatus;
    var act = fields.act;
    var mobile = fields.mobile;//手机
    var password = fields.password;
    var verCode = fields.ticketCode;//验证码
    var existCode = yield redisCo.get('sms:verCode_' + mobile);
    var timesExists = yield redisCo.exists('sms:trytimes_' + mobile);
    var timesVal = yield redisCo.get('sms:trytimes_' + mobile);
    timesVal = parseInt(timesVal);

    if (C.env != 'production' && verCode == 88888 && parseInt(mobile) >= 18900000000 && parseInt(mobile) <= 19999999999) { //非正式环境，验证码 88888 默认通过。
        var ticket = uid2(32);
        existCode = 88888;
        if (act == 1) {
            F.redisClient.SETEX('reg:ticket_' + mobile, C.user.regExp, ticket);
            return F.returnMsg(200, '短信验证成功', 1, {'ticket': ticket});
        }
    }

    if (!timesExists) {
        timesVal = 0;
    }
    if (act == 2 || act == 3) {
        //当act=2或者act=3的时候，验证服务器生成的ticket code
        existCode = yield redisCo.get('reg:ticket_' + mobile);
    } else if (act == 4) {//验证用户当前的密码
        if (!loginStatus.status) {
            return F.returnMsg(401, '登录用户才能继续操作', 1);
        }
        let uid = parseInt(loginStatus.uid);
        let userData = yield MUsers.getUser("tg_password,tg_salt", "tg_id=?", [uid]);
        if (userData.length > 0 && userData[0]['password'] == md5.digest_s(password + userData[0]['salt'])) {
            return F.returnMsg(200, '密码验证成功', 1);
        } else {
            return F.returnMsg(400, '密码验证失败', 1);
        }
    }

    if (timesExists && timesVal > 5) {
        return F.returnMsg(400, '尝试次数过多，请10分钟后再尝试', 1);
    } else {
        if (verCode == existCode && mobile != '') {
            F.redisClient.del('sms:verCode_' + mobile);//当验证客户端的验证码通过后，删除验证码
            F.redisClient.del('sms:trytimes_' + mobile);
            if (act == 1) {
                var ticket = uid2(32);
                F.redisClient.SETEX('reg:ticket_' + mobile, C.user.regExp, ticket);
                return F.returnMsg(200, '短信验证成功', 1, {'ticket': ticket});
            } else if (act == 2 || act == 3) {
                if (fields.tokenkey != undefined) {//没传tokenkey,返回提示信息必须先登录
                    if (!loginStatus.status) {
                        return F.returnMsg(401, '登录用户才能继续操作', 1);
                    } else {
                        let uid = parseInt(loginStatus.uid);
                        //20151012 --取消验证是否已经绑定过手机，以便用户重复绑定手机号码
                        let isMobileExist = yield mysql.query('select tg_mobile,tg_id from tg_user where tg_mobile=?', [mobile]);
                        if (isMobileExist.length > 0) {
                            if (isMobileExist[0].uid == uid) {
                                if (act == 2) {//如果只是绑定手机操作，则直接返回
                                    return F.returnMsg(400, '该手机已被您绑定，无需再次绑定', 1);
                                }
                            } else {
                                return F.returnMsg(400, '绑定失败，该手机号码已被其他用户绑定', 1);
                            }
                        }
                        if (act == 2) {
                            let ret = yield mysql.query('update mh_user set mobile=? where uid=?', [mobile, uid]);
                            if (ret.affectedRows > 0) {
                                let key = C.redisPre.user_info;
                                key = _.str.sprintf(key, parseInt(uid));
                                F.redisClient.del(key);
                                //更新Mongo数据库mobile信息（由mongo判断是否存在该uid用户）
                                yield o2o_F.o2oUpdateUserInfo({uid: uid, mobile: mobile});
                                return F.returnMsg(200, '绑定手机成功', 1);
                            } else {
                                return F.returnMsg(401, '绑定手机失败，请重试', 3);
                            }
                        } else if (act == 3) {
                            var salt = F.getRandom(6);
                            var result = yield mysql.query('UPDATE mh_user SET password = ?, salt = ?, mobile = ? where uid=?', [md5.digest_s(password + salt), salt, mobile, uid]);
                            if (result && result.affectedRows >= 1) {
                                let key = C.redisPre.user_info;
                                key = _.str.sprintf(key, parseInt(uid));
                                F.redisClient.del(key);//清楚个人信息缓存，以显示手机号码
                                return F.returnMsg(200, '手机与密码设置成功', 1);
                            } else {
                                return F.returnMsg(400, '操作失败', 3);
                            }
                        }
                    }
                }
                else {
                    return F.returnMsg(401, '请先传入tokenkey参数', 3);
                }
            }
            else if (act == 11) {
                var session = Env.session;
                session.verOk = 1;
                return F.returnMsg(200, '短信验证成功', 1);
            }
        } else {
            F.redisClient.SETEX('sms:trytimes_' + mobile, C.login.login_lockInterval, timesVal + 1);
            return F.returnMsg(400, '手机号码无效或验证码不匹配', 1);
        }
    }
};



/*
 *@todo  API03 注册
 * parms post过来的数据
 * return 注册成功返回true失败返回false
 */
exports.register = function* (Env) {
    var fields = Env.I;
    var act = fields.act;//1app端手机注册，11web端 ，2 第三方账户注册
    var gender = 2;//注册时性别默认为女
    if (act != 2) {//2为第三方登录，不需要手机
        var mobile = parseInt(fields.mobile);
        var isMobile = F.isMobile(mobile);
        if (!isMobile) {
            return F.returnMsg(400, '手机号码格式不对', 1);
        }
        var userData = yield MUsers.getUser("tg_id", "tg_mobile=?", [mobile]);//检注册的手机是否存在
        if (userData.length > 0) return F.returnMsg(400, '手机号码已注册过！', 1);
    }

    if (act == 1) {//app端
        var uniqid = fields.uniqid;
        var tempUniqid = yield redisCo.get("reg:uniqid_" + mobile);
        if (uniqid != tempUniqid) {
            return F.returnMsg(400, '注册过时,注册必须在' + parseInt(C.user.regExp) / 60 + '分钟内完成', 1);
        }
    }

    var ip = Env.ip || '';//客户端ip
    var username = fields.username;
    var email = fields.email;
    var qq = fields.qq;
    var url = fields.url;
    var flag = false;//标记注册是否成功
    var lastloginIp = ip;
    var nickname = fields.nickname != undefined ? _.str.trim(fields.nickname) : '';
    if (act != 2) {//第三方注册不需密码
        var salt = F.getRandom(6);//随机六位数
        var password = fields.password;
        if (password == undefined) {
            return F.returnMsg(400, '密码不能为空', 1);
        }
        password = md5.digest_s(password + salt);
    }
    if (nickname === '') { //如未定义昵称，则自动生成不重复的昵称
        var newNickName;
        var nickExist;
        do {
            newNickName = '小蜜蜂' + F.getRandom(8);
            nickExist = yield MUsers.getUser("tg_id", "tg_nickname=?", [newNickName]);//检查昵称是否存在
        }
        while (nickExist.length > 0);
        nickname = newNickName;
    }
    var newUid = 0;//保存新注册的用户id
    var face = _.random(1, 32);
    if (act != 2) {
        var newUser = yield mysql.query("insert into tg_user(tg_username,tg_password,tg_nickname,tg_mobile,tg_sex,tg_email,tg_qq,tg_url,tg_last_ip,tg_last_time,tg_face) values(?,?,?,?,?,?,?,?,?,UNIX_TIMESTAMP(),?)", [username, password, nickname, mobile, gender, email, qq, url, lastloginIp, face]);
        flag = true;
    } else {/////////////第三方注册没有手机跟密码
        var newUser = yield mysql.query("insert into tg_user(tg_username,tg_password,tg_nickname,tg_mobile,tg_sex,tg_email,tg_qq,tg_url,tg_last_ip,tg_last_time,tg_face) values(?,?,?,?,?,?,?,?,?,UNIX_TIMESTAMP(),?)", [username, password, nickname, mobile, gender, email, qq, url, lastloginIp, face]);
    }
    newUid = newUser.insertId;
    if (flag) {
        if (act == 1 || act == 2) {//app端和第三方
            // 通过IP获取所在地
            if (ip.length > 0) {
                F.ip2city(ip, function (error, citycode) {
                    console.log('CITYCODE:' + citycode);
                    if (!error && citycode != '') {
                        mysql.query('update tg_user set tg_citycode = ? where tg_id=?', [citycode, newUid],
                            function (error, results) {
                                if (error) {
                                    console.log("ERROR: 通过IP获取所在地" + error.message);
                                }
                            }
                        );
                    }
                });
            }
            return F.returnMsg(200, '注册成功', 4, {
                'uid': newUid,
                'face': face,
                'nickname': nickname
            });
        } else if (act == 11) {//web端
            session.verOk = null;
            session.uid = newUid;
            return F.returnMsg(200, '注册成功', 3, {'uid': newUid});
        }
    } else {
        return F.returnMsg(400, '注册失败', 1);
    }
};




/*
 *@todo  API06 获取个人资料
 * */
exports.getUserinfo = function*(Env) {
    let fields = Env.I;
    let loginStatus = fields.loginStatus;
    var apiVer = fields.apiVer;//版本号
    var uid = fields.uid || loginStatus.uid;
    var manager = fields.manager;
    var page = fields.page || 1;
    var pageSize = fields.pagesize != undefined ? parseInt(fields.pagesize) : C.threadlist.pageSize;
    var beginIndex = (page - 1) * pageSize;
    let act = fields.act || 0;
    if (!loginStatus.status && !uid) {
        if (act != 2) {
            return F.returnMsg('401', '身份验证失败,请先登陆', 3);
        }
    }
    if (parseInt(act) == 2) {
        if (!(manager && manager == 1 && F.isManager(loginStatus.groupid))) {
            return F.returnMsg('300', '权限不足，获取失败.', 1);
        } else {
            let user_device_arr = [];
            let ret_user_device_arr = [];
            let val_arr = [beginIndex, pageSize];
            let sqlWhereuid = '';
            if (fields.uid && parseInt(fields.uid) > 0) {
                sqlWhereuid = ' and mu.uid=? ';
                val_arr.unshift(fields.uid);
            }
            let userDeviceData = yield mysql.query('SELECT distinct mul.device_id,mu.uid,mu.nickname from mh_user_log mul LEFT JOIN mh_user mu on mul.uid=mu.uid where LENGTH(mul.device_id)>0 '
                + sqlWhereuid + ' ORDER BY mul.device_id,mu.uid LIMIT ?,?', val_arr);
            if (userDeviceData.length == 0) {
                return F.returnMsg(300, '没有数据了', 1);
            }
            for (let userDevice of userDeviceData) {
                if (!_.v.isIn(userDevice.device_id, user_device_arr)) {
                    if (!_.v.isIn(userDevice.device_id, user_device_arr)) {
                        user_device_arr.push(userDevice.device_id);
                    }
                    let user_device = {device_id: userDevice.device_id};
                    user_device.users = [];
                    let user_array = _.filter(userDeviceData, function (user) {
                        return user.device_id == userDevice.device_id;
                    });
                    user_array.forEach(function (obj) {
                        user_device.users.push({uid: obj.uid, nickname: obj.nickname});
                    });
                    ret_user_device_arr.push(user_device);
                }
            }
            return F.returnMsg('200', '获取成功', 3, ret_user_device_arr);
        }
    }

    var userInfo = yield F.returnUserInfo(uid);
    userInfo = userInfo[0];
    //var userInfo = yield mysql.queryOne('SELECT u.uid, u.nickname, u.groupid,u.face, u.bodytype, ui.threads, ui.friends, ui.fans, ui.tfavtimes, ui.gender, ui.signature,ui.pintagtimes as pinTags,ui.beliked FROM mh_user u LEFT JOIN mh_user_info ui on u.uid = ui.uid WHERE u.uid = ?',uid);
    if (userInfo) {
        if (userInfo.hasOwnProperty('face')) {
            var face = userInfo.face;
            userInfo.face = F.generateFaceUrl(face, uid, 1);
            userInfo.minface = F.generateFaceUrl(face, uid);
        }
        userInfo.friendStatus = false;
        if (loginStatus.status) {
            var isFriend = yield MUsers.isFriend(loginStatus.uid, uid);
            if (isFriend) {
                userInfo.friendStatus = true;
            } else if (_.v.isIn(uid, C.sns.manager_uid)) {  //if (_.v.isIn(fuid, C.sns.manager_uid)){ //判断是否系统发言用户
                userInfo.friendStatus = true;
            }
            if (parseInt(loginStatus.uid) != uid) {
                mysql.query('INSERT INTO mh_user_viewlog(uid,timeline,uid1) VALUES(?,UNIX_TIMESTAMP(),?)', [parseInt(loginStatus.uid), uid]);
            }
        }

        if (!(manager && manager == 1 && F.isManager(loginStatus.groupid))) {
            delete userInfo.name;
            delete userInfo.groupid;
        }
        userInfo.alterpwd = false;//允许修改密码（有手机时可以修改）
        if (userInfo.mobile != '') {
            userInfo.alterpwd = true;
        }
        if (uid != loginStatus.uid) { //不是查本人资料
            delete userInfo.mobile;
            delete userInfo.hasPassword;
        }
        //如果是自己查看自己的信息时，动态读取发帖数
        if (act == 1 && fields.tokenkey != undefined && loginStatus.uid > 0) {
            let userThreads = yield mysql.queryOne('SELECT count(1) as threads from mh_thread where uid=? and `status` IN(1,2)', [uid]);
            userInfo.threads = parseInt(userThreads['threads']);
            let user3rdbindInfo = yield F.get3rdBindInformation(uid);
            userInfo.QQ = user3rdbindInfo.QQ;
            userInfo.WX = user3rdbindInfo.WX;
        }

        userInfo.friends += C.sns.manager_uid.length;

        //增加系统发言人的关注数
        if ((loginStatus.status && loginStatus.uid == uid) || (manager && manager == 1 && F.isManager(loginStatus.groupid))) {
            console.log('userInfo.level',userInfo.level);
            var curlevel = F.getIntegralInfo(parseInt(userInfo.level));//获取当前等级信息
            console.log('curlevel',curlevel);
            //var nextlevel= F.getIntegralInfo(parseInt(userInfo.level)+1);//获取下一等级信息
            userInfo.currentlevel = curlevel[0].range_l;
            userInfo.nextlevel = curlevel[0].range_h + 1;
            userInfo.msg = ''; // '距升级还差'+(nextlevel[0].range_l-curlevel[0].range_l)+'分'
            userInfo.alowertalent = yield F.isAlowerTalent(userInfo);
        } else {
            delete userInfo.integral;
            delete userInfo.lastupgradetime;
            delete userInfo.lastsigntime;
            delete userInfo.signtimes;
        }
        return F.returnMsg('200', '获取个人信息成功', 3, userInfo);
    } else {
        return F.returnMsg('300', '获取个人信息失败', 1);
    }
};

/*
 *@todo  API07 修改个人资料
 * */
exports.setUserinfo = function*(Env) {
    let fields = Env.I;
    let loginStatus = fields.loginStatus;
    var apiVer = fields.apiVer;//版本号
    // 身份验证
    if (!loginStatus.status) {
        return F.returnMsg('401', '身份验证失败', 3);
    }
    var name = fields.name;
    var nickname = fields.nickname;
    var btype = fields.btype;
    var signature = fields.signature;
    var gender = fields.gender;
    var uid = loginStatus.uid;
    var manager = fields.manager;
    var updateUserCache = {};
    var updateFieldsArray = [];
    var updateValueArray = [];

    var updateFieldsArrayI = [];
    var updateValueArrayI = [];
    var citycode = fields.citycode;

    // 管理员版主可修改其他用户
    if (manager && manager == 1 && F.isManager(loginStatus.groupid, [1, 2])) { // 判断是否1 管理员
        uid = parseInt(fields.uid) > 0 ? parseInt(fields.uid) : uid;
    }
    if (name != undefined && manager && manager == 1 && F.isManager(loginStatus.groupid, [1, 2])) {//修改姓名暂时只对后台开放
        name = _.str.trim(name);
        updateUserCache.name = name;
        updateFieldsArrayI.push('name=?');
        updateValueArrayI.push(name);
    }
    if (nickname != undefined) {
        nickname = _.str.trim(nickname);
        //昵称不能包含‘瓷肌’二字
        if (nickname.indexOf('瓷肌') > -1) {
            return F.returnMsg('400', '昵称不能\'瓷肌\'二字，请更换昵称', 1);
        } else {
            let reg = /^.*瓷.{0,3}肌.*$/;
            if (reg.test(nickname)) {
                return F.returnMsg('400', '昵称不能\'瓷肌\'二字，请更换昵称', 1);
            }
        }
        //检查昵称是否存在
        var nickExist = yield MUsers.getUser("uid", "nickname=? and uid<>?", [nickname, uid]);
        if (nickExist.length > 0) {
            return F.returnMsg('400', '昵称已存在，请更换昵称', 1);
        }
        var userData = yield mysql.queryOne('SELECT nickname FROM mh_user WHERE uid=?', [uid]);//取用户昵称
        var oldNickName = userData['nickname'];
        if (oldNickName != nickname) {//昵称是否修改
            var userThread = yield mysql.query('SELECT tid FROM mh_thread WHERE uid=? and `status`=1', [uid]);
            if (userThread.length > 0) {
                var tidArr = [];
                for (var i in userThread) {
                    tidArr.push(userThread[i].tid);
                }
                var key = C.redisPre.thread_info;
                var expire = C.redisPre.thread_ttl;
                yield F.redisCo.mhupdatethread(4, key, expire, nickname, 'nickname', tidArr);//批量修改缓存帖子发帖人昵称
            }
            F.redisClient.hmset('siss:user:uid_' + uid, 'nickname', nickname);//保存会话昵称
        }
        updateUserCache.nickname = nickname;
        updateFieldsArray.push('nickname=?');
        updateValueArray.push(nickname);
    }

    if (btype != undefined) {
        updateUserCache.bodytype = parseInt(btype);
        updateFieldsArray.push('bodytype=?');
        updateValueArray.push((btype == '' || parseInt(btype) > 5) ? 0 : parseInt(btype));
    }

    if (gender != undefined) {
        updateUserCache.gender = parseInt(gender);
        updateFieldsArrayI.push('gender=?');
        updateValueArrayI.push((gender == '' || parseInt(gender) > 2) ? 0 : parseInt(gender));
    }

    if (signature != undefined) {
        updateUserCache.signature = signature;
        updateFieldsArrayI.push('signature=?');
        updateValueArrayI.push(signature);
    }

    if (citycode != undefined) {
        var cityInfo = F.getCityInfo(citycode);
        if (!_.isEmpty(cityInfo)) {
            updateUserCache.citycode = citycode;
            updateUserCache.city = (cityInfo.province != cityInfo.city ? cityInfo.province + ' ' + cityInfo.city : cityInfo.city);

            updateFieldsArrayI.push('citycode=?');
            updateValueArrayI.push(citycode);
        }
    }
    // 管理员、版主可修改用户组id
    if (fields.groupid != undefined && F.isManager(loginStatus.groupid)) {
        if (uid != loginStatus.uid) {
            var groupid = parseInt(fields.groupid) >= loginStatus.groupid ? parseInt(fields.groupid) : loginStatus.groupid; // 只能设置为大于等于自己groupid  即版主不能设置别人为管理员
            if ((groupid > loginStatus.groupid || loginStatus.groupid == 1) && parseInt(fields.uid) > 0) {
                if (groupid < 3 && (name == undefined || name == '')) {
                    return F.returnMsg('400', '设为管理员或超级版主时,名字不能为空', 1);
                }
                updateUserCache.groupid = groupid;
                mysql.query('UPDATE mh_user SET groupid=? WHERE uid=?', [groupid, parseInt(fields.uid)]);

                var userInfo = yield redisCo.hmget('siss:user:uid_' + uid, ['uid', 'groupid', 'nickname', 'vestuid', 'vestnickname']);
                if (groupid == 5) {//如果是设为禁止访问组，删除登录信息
                    F.redisClient.del('siss:user:uid_' + uid);
                }
                if (userInfo[0] != null && groupid != 5) {//存在缓存，且非禁止访问组 则重新设置组
                    F.redisClient.hmset('siss:user:uid_' + uid,
                        'groupid', groupid
                    );
                }
            } else {
                return F.returnMsg('400', '修改个人资料失败', 1);
            }
        } else {
            return F.returnMsg('400', '不能改自己的用户组', 1);
        }
    }

    updateValueArray.push(uid);
    updateValueArrayI.push(uid);

    if (updateFieldsArray.length > 0) {
        var result = yield mysql.query('UPDATE mh_user SET ' + updateFieldsArray.join(',') + ' WHERE uid=?', updateValueArray);
        if (result.affectedRows < 1) {
            return F.returnMsg('400', '修改个人资料失败', 1);
        }
    }
    if (updateFieldsArrayI.length > 0) {
        var result = yield mysql.query('UPDATE mh_user_info SET ' + updateFieldsArrayI.join(',') + ' WHERE uid=?', updateValueArrayI);
        if (result.affectedRows < 1) {
            return F.returnMsg('400', '修改个人资料失败', 1);
        }
    }

    if (updateFieldsArray.length > 0 || updateFieldsArrayI.length > 0) {
        yield F.updateUserCache(parseInt(uid), updateUserCache);//更新用户缓存
        var userData = yield F.returnUserInfo(uid);
        return F.returnMsg('200', '成功', 3, {'city': userData[0].city});
    } else {
        return F.returnMsg('200', '无修改', 3);
    }
};

/*
 *@todo  API10 修改、重置用户密码
 * */
exports.changePassword = function*(Env) {
    let fields = Env.I;
    let loginStatus = fields.loginStatus;
    var apiVer = fields.apiVer;//版本号
    var act = fields.act;
    var oldPassword = fields.oldpwd;
    var newPassword = fields.newpwd;

    var newSalt = F.getRandom(6);
    var result;
    if (act == 1 || act == 11) { //修改密码
        if (!loginStatus.status) {
            return F.returnMsg(401, '身份验证失败', 3);
        }
        var userData = yield MUsers.getUser('password,salt', 'uid=?', [loginStatus.uid]);
        if (userData.length > 0 && userData[0]['password'] != md5.digest_s(oldPassword + userData[0]['salt'])) {
            return F.returnMsg(400, '旧密码错误', 3);
        }
        var result = yield mysql.query('UPDATE mh_user SET password = ?, salt = ? WHERE uid = ?', [md5.digest_s(newPassword + newSalt), newSalt, loginStatus.uid]);
    } else if (act == 2 || act == 12) { // 重置密码
        var mobile = fields.mobile;
        if (act == 2) {//app端
            var ticket = fields.ticket;
            var tempTicket = yield redisCo.get('reg:ticket_' + mobile);
            if (ticket != tempTicket) {
                return F.returnMsg(400, '重置密码超时,重置密码必须在' + parseInt(C.user.regExp) / 60 + '分钟内完成', 1);
            }
        } else if (act == 12) {//web端
            var session = Env.session;
            if (session.verOk != 1) {
                return F.returnMsg(400, '重置密码过时,重置密码必须在' + parseInt(C.user.regExp) / 60 + '分钟内完成', 1);
            }
        }
        var result = yield mysql.query('UPDATE mh_user SET password = ?, salt = ? WHERE mobile = ?', [md5.digest_s(newPassword + newSalt), newSalt, mobile]);
    } else if (act == 3) {//用户APP端第三方登陆用户设置密码
        if (!loginStatus.status) {
            return F.returnMsg(401, '身份验证失败', 3);
        }
        var result = yield mysql.query('UPDATE mh_user SET password = ?, salt = ? WHERE uid = ?', [md5.digest_s(newPassword + newSalt), newSalt, loginStatus.uid]);
    }
    if (result && result.affectedRows >= 1) {
        return F.returnMsg(200, '密码设置成功', 1);
    } else {
        return F.returnMsg(400, '密码设置失败', 1);
    }
};


