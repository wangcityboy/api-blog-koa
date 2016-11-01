/**
 * Created by no1 on 2014/12/11.
 */

var fs = require('fs');
var C = require('./config');
var api = require('./servers/apiHTTP');

api.listen(C.apiPort);
console.log('API server is listening on ' + C.apiPort + ' port.');
