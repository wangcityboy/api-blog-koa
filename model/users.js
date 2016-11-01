/**
 * Created by 云飞凌风 on 2016/9/29.
 */
'use strict';

var mysql = require('../common/mysql.js');

/*
 @todo 获取用户信息
 @fields 查找字段 格式为field1，field2...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.getUser = function*(fields, where, values) {
    var user = yield mysql.query("select " + fields + " from tg_user where " + where, values);
    if (user.length > 0) {
        return user;
    }
    return [];
};


/*
 @todo 修改用户基本信息
 @fields 修改字段 格式为field1=?，field2=?...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.editUser = function*(fields, where, values) {
    var flag = yield mysql.query("update tg_user set " + fields + " where " + where, values);
    if (flag.affectedRows > 0) {
        return true;
    }
    return false;
};



/*
 @todo 获取广告轮播图
 @fields 查找字段 格式为field1，field2...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.getAdvertiselist = function*(fields, where, values) {
    var advertise = yield mysql.query("select " + fields + " from tg_advertise where " + where, values);
    if (advertise.length > 0) {
        return advertise;
    }
    return [];
};



/*
 @todo 获取相册列表
 @fields 查找字段 格式为field1，field2...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.getDirlist = function*(fields, where, values) {
    var photoDirs = yield mysql.query("select " + fields + " from tg_dir where " + where, values);
    if (photoDirs.length > 0) {
        return photoDirs;
    }
    return [];
};


/*
 @todo 根据相册获取相片列表
 @fields 查找字段 格式为field1，field2...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.getPhotoslist = function*(fields, where, values) {
    var photos = yield mysql.query("select " + fields + " from tg_photo where " + where, values);
    if (photos.length > 0) {
        return photos;
    }
    return [];
};



