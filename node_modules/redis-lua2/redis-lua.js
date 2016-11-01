var createHash = require('crypto').createHash,
    _          = require('lodash'),
    sha        = function(str) {return createHash('sha1').update(str).digest('hex');};


function keyval(cb) {
  return function(err, res) {
    var hash = {}, i, key, val;

    if (err) {
      cb(err);
    } else if (res.length % 2 !== 0) {
      cb('result length not even');
    } else {
      for (i = 0; i < res.length; i += 2) {
        key = res[i].toString();
        val = res[i + 1];
        hash[key] = val;
      }
      cb(null, hash);
    }
  };
}

exports.attachLua = function(redis) {

  /**
   * redis.lua( SCRIPTNAME , SCRIPT_PLAINTEXT, [keyed]);
   * @param  {String} name     Script name
   * @param  {String} script   Script string
   * @param  {[type]} keyed    [description]
   * @chainable
   * @return {Redis}
   */
  redis.lua = function(name, script, keyed) {
    var script_sha = null;

    redis.RedisClient.prototype[name] = function(){
      var cb = function(){}, self = this, params;

      params = [].slice.call(arguments);

      if (params.length > 0 && typeof params[params.length - 1] == 'function') {
        cb = params.pop();
      }

      if(!_.isArray(params)){
        params = [params];
      }

      params  = _.flatten(params);
      params.unshift(script);

      if(keyed){
        cb = keyval(cb);
      }

      params.push(cb);

      // node_redis now support eval
      // https://github.com/mranney/node_redis/blob/master/index.js#L1067
      this.eval.apply(this, params);
    };

    return this;
  };

  return redis;
};
