### 来由
 - 16年，我对后台开发有了兴趣，那个时候我正在一家公司上班，在工作过程中，慢慢接触并熟悉了后台接口开发，下班后，闲着没事，就想着把之前用php语言开发的接口改进一下，于是乎用nodejs来开发，当时公司用的是koa框架，这个后台接口也是结合公司的框架来开发的；<br>
 - 学起来js语法并不难，之前在大学里都有学过，之前做网站也有了解，因此看了几下视频，慢慢动手自己写了一点，就有了今天的这个小的api接口，业务逻辑并不复杂，所以基本上能满足我的移动端开发要求；<br>


### 运行环境要求：
-主机环境：Mac os <br>
-数据库：Mysql 5.0以上<br>
-Redis:需要在本地配置好redis服务并启动：


### 安装步骤：
- 将代码下载到本地，然后进入到代码所在目录，安装相关的库到目录：npm i <br>
- 配置好数据库连接后，并启动数据库服务<br>
- 配置好连接Redis服务，并启动Redis服务<br>
- 启动接口服务：node singleServer.js <br>

### 更新日志：<br/>
    2016-11-1:
    1.首次公开，并分享到github.com，希望大家提意见。
    
    2016-9-29:
    1.首次开发，并相应了开发了多个接口，目前是用在安卓应用开发上
    
### 思路,eg:获取日志列表
api.js[ app.get(apiPre + '/:apiVer/noteslist',function*() ] -> user.js[ exports.getNoteslist = function*(Env) ] -> notes.js[ exports.getNotes = function*(fields, where, values) ] 





