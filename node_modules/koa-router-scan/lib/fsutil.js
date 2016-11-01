/**
 * Created with JetBrains WebStorm.
 * User: Hui Xie
 * Date: 13-8-30
 * Time: 下午4:54
 * To change this template use File | Settings | File Templates.
 */

var fs = require('fs'),
    path = require('path');

module.exports = function () {
    var exports = {};

    var win32 = process.platform === 'win32';

    // Normalize \\ paths to / paths.
    unixifyPath = function (filepath) {
        if (win32) {
            return filepath.replace(/\\/g, '/');
        } else {
            return filepath;
        }
    };

    exports.recurse = function recurse(rootdir, callback, subdir) {
        var abspath = subdir ? path.join(rootdir, subdir) : rootdir;
        fs.readdirSync(abspath).forEach(function(filename) {
            var filepath = path.join(abspath, filename);
            if (fs.statSync(filepath).isDirectory()) {
                recurse(rootdir, callback, unixifyPath(path.join(subdir || '', filename || '')));
            } else {
                callback(unixifyPath(filepath), rootdir, subdir, filename);
            }
        });
    };

    return exports;
};