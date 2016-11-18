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
    var data = yield mysql.query("select " + fields + " from tg_user where " + where, values);
    if (data.length > 0) {
        return data;
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
 @todo 获取用户菜单列表
 @fields 修改字段 格式为field1=?，field2=?...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.getMenu = function*(fields, where, values) {
    var data = yield mysql.query("select " + fields + " from tg_menu where " + where, values);
    if (data.affectedRows > 0) {
        return data;
    }
    return [];
};

/*
 @todo 获取广告轮播图
 @fields 查找字段 格式为field1，field2...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.getAdvertiselist = function*(fields, where, values) {
    var data = yield mysql.query("select " + fields + " from tg_advertise where " + where, values);
    if (data.length > 0) {
        return data;
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
    var data = yield mysql.query("select " + fields + " from tg_dir where " + where, 0);
    if (data.length > 0) {
        return data;
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
    var data = yield mysql.query("select " + fields + " from tg_photo where " + where, values);
    if (data.length > 0) {
        return data;
    }
    return [];
};



