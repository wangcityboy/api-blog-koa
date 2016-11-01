安装 node-gyp
npm install -g node-gyp

NODE_ENV=production pm2 start --name dictServer --merge-logs --node-args="--harmony"  /data/html/mahoo.cn/api/dictServer.js  -u www
NODE_ENV=production pm2 start --name apiServer --merge-logs --node-args="--harmony" /data/html/mahoo.cn/api/apiServer.js  -u www

NODE_ENV=production pm2 start --name o2oService --merge-logs --node-args="--harmony" /data/html/mahoo.cn/api/o2o/index.js  -u www

// 开发环境
pm2 start --name dictServer --merge-logs --node-args="--harmony" --watch /data/html/mahoo.cn/api/dictServer.js  -u root
pm2 start --name apiServer --merge-logs --node-args="--harmony" --watch /data/html/mahoo.cn/api/apiServer.js  -u root
pm2 start --name o2oService --merge-logs --node-args="--harmony" --watch /data/html/mahoo.cn/api/o2o/index.js  -u root

set NODE_ENV=development

<<<<<<< .mine
============================
iptables -A INPUT -s 192.168.61.0/24 -p tcp --destination-port 27017 -m state --state NEW,ESTABLISHED -j ACCEPT
iptables -A OUTPUT -d 192.168.61.0/24 -p tcp --source-port 27017 -m state --state ESTABLISHED -j ACCEPT
=======
pm2 start --name apiOnly --merge-logs --node-args="--harmony" --watch /data/html/mahoo.cn/api/apiOnly.js  -i 4>>>>>>> .r1379



1 启动redis
