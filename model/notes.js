/**
 * Created by 云飞凌风 on 2016/9/29.
 */
'use strict';

var mysql = require('../common/mysql.js');

/*
 @todo 获取日志列表
 @fields 查找字段 格式为field1，field2...
 @where  查找条件 格式为field1=? and field=?
 @values 条件值   格式为[value1，value2]
 */
exports.getNotes = function*(fields, where, values) {
    var data = yield mysql.query("select " + fields + " from tg_article where " + where, values);
    if (data.length > 0) {
        return data;
    }
    return [];
};

