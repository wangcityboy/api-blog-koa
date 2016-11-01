/**
 * Created by 云飞凌风 on 2016/9/29.
 */
'use strict';
// Koa 框架
var koa = require('koa');
// HTTP 服务模块
var http = require('http');
// body 模块
var bodyParser = require('koa-better-body');

var jsonp = require('koa-safe-jsonp');
var router = require('koa-router')();
var APIroute = require('../routes/api')(router);
var C = require('./../config/index');
var cors = require('koa-cors');//解决跨域

var gzip = require('koa-gzip');//压缩页面

// 实例化 Koa
var app = koa();
app.use(gzip());

// x-response-time
app.use(function *(next) {
  // (1) 进入路由
  var start = new Date;
  this.startAt = start;
  yield next;
  // (5) 再次进入 x-response-time 中间件，记录2次通过此中间件「穿越」的时间
  var ms = new Date - start;
  this.set('X-Response-Time', ms + 'ms');

});


app.proxy = false;//do not support `X-Forwarded-*` header from 2015-11-23

app.use(cors({credentials: true}));

app.use(bodyParser());

// Session 名
app.keys = ['keys', 'keykeys'];

app.use(router.routes());

jsonp(app, {
  callback: '_callback', // default is 'callback'
  limit: 50 // max callback name string length, default is 512
});


app.on('error', function (err, ctx) {
  console.error('ERROR ON App.');
  console.error(err);

});


module.exports = app;
