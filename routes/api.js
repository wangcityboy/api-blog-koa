/**
 * Created by 云飞凌风 on 2016/9/29.
 */
'use strict';
var F = require('../common/function');
var C = require('../config/index');

var mysql = require('../common/mysql');
var commUser = require('../common/user');

module.exports = function (app) {
  var self = this;
  var apiPre = C.apiPre;

    /*
     @todo API01 获取短信验证码
     */
    app.get(apiPre + '/:apiVer/verification', function*() {
        this.I = yield F.Init(this, [1, 11, 2, 12]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.sendVerification(this);
        }
    });

    /*
     @todo API02 获取短信验证凭证
     */
    app.get(apiPre + '/:apiVer/registerTicket', function*() {
        this.I = yield F.Init(this, [1, 2, 3, 4, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.registerTicket(this);
        }
    });



    /*
     @todo API01 获取侧边栏菜单数据
     */
  app.get(apiPre + '/:apiVer/menu', function*() {
      let result;
      this.I = yield F.Init(this, [1]);
      if (this.I.errors) {
          this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
      } else {
          let param = parseInt(this.I.parent);
          if(param == 0){
              result = [];
              let parent = yield mysql.query('select * from tg_menu where tg_parent = ?',[param]);
              for(let i of parent){
                  let obj = yield commUser.getMenu(i.tg_id);
                  let tmpObj = obj.parent;
                  tmpObj.children = obj.child;
                  result.push(tmpObj);
              }
          }else if(param > 0){
             let obj =  yield commUser.getMenu(param);
              result = obj.parent;
              result.children = obj.child;
          }
          this.jsonp = F.returnMsg(200,'菜单数据返回成功',1,result);
      }
  });




    /*
     @todo API02 获取日志列表
     */
    app.get(apiPre + '/:apiVer/noteslist',function*(){
        this.I = yield F.Init(this, [1, 2, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.getNoteslist(this);

        }
    });



    /*
     @todo API01 获取相册列表
     */
    app.get(apiPre + '/:apiVer/dirslist',function*(){
        this.I = yield F.Init(this, [1, 2, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.getDirslist(this);

        }
    });



    /*
     @todo API01 获取相片列表
     */
    app.get(apiPre + '/:apiVer/photoslist',function*(){
        this.I = yield F.Init(this, [1, 2, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.getPhotoslist(this);

        }
    });



    /*
     @todo API01 获取广告轮播图
     */
    app.get(apiPre + '/:apiVer/advertiselist',function*(){
        this.I = yield F.Init(this, [1, 2, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.getAdvertiselist(this);

        }
    });

    /*
     @todo API03 注册
     */
    app.post(apiPre + '/:apiVer/register', function* () {
        this.I = yield F.Init(this, [1, 2, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.register(this);
        }
    });

    /*
     @todo API04 登录
     */
    app.post(apiPre + '/:apiVer/login', function*() {
        console.log('test');
        this.I = yield F.Init(this, [1, 2, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.login(this);
        }
    });

    /*
     @todo API05 登出
     */
    app.post(apiPre + '/:apiVer/logout', function*() {
        this.I = yield F.Init(this, [1, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.logout(this);
        }
    });

    /*
     @todo API06 获取个人资料
     */
    app.get(apiPre + '/:apiVer/userinfo', function*() {
        this.I = yield F.Init(this, [1, 2, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.getUserinfo(this);
        }
    });

    /*
     @todo API07 修改个人资料
     */
    app.post(apiPre + '/:apiVer/userinfo', function*() {
        this.I = yield F.Init(this, [1, 11]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.setUserinfo(this);
        }
    });

    /*
     @todo API10 修改、重置用户密码
     */
    app.post(apiPre + '/:apiVer/userpassword', function*() {
        this.I = yield F.Init(this, [1, 2, 11, 12, 3]);
        if (this.I.errors) {
            this.jsonp = F.returnMsg(400, this.I.errors.msg, this.I.errors.level);
        } else {
            this.jsonp = yield commUser.changePassword(this);
        }
    });


};
