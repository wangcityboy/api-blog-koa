/**
 * Created by 云飞凌风 on 2016/9/29.
 */

module.exports = {
  /*
   * server configure
   */
  apiPort: 1888,
  debug: true,

  /*
   * mysql config
   */
  mysqlServers: [
    {
      //host: (process.env.CS_MYSQL || 'hdm14969059.my3w.com'),
      //port: 3306,
      //user: 'hdm14969059',
      //password: 'whf324512',
      host: (process.env.CS_MYSQL || '127.0.0.1'),
      port: 3306,
      user: 'root',
      password: 'KeYpZrZx'
    }
  ],
  //mysqlDatabase: 'hdm14969059_db',
  mysqlDatabase:'guest',
  mysqlMaxConnections: 20,
  mysqlQueryTimeout: 5000,

  // mongodb 设置
  mongo: {
    uri: 'mongodb://127.0.0.1:27017/yunfeiapp',
    options: {
      db: {native_parser: true},
      auto_reconnect: 1,
      server: {poolSize: 4},
      //user: 'app',
      //pass: 'kjhDh38273erdfEd'
    }
  },

  // redis config
  // use for koa-limit module as storage
  redis: {
    host: '127.0.0.1',
    port: 6379,
    options: {
      //auth_pass: 'd53aOe1F9q'
    }
  }
};
