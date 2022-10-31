# 一、概述

关键词：Cesium、数据加密

在做公司的 Cesium 项目时，项目需要部署在外网的云服务器上。上面的一些 3D Tiles、高精度无人机影像图层、地形数据，如果直接挂在 Nginx 等Web服务器下，就相当于数据直接暴露在了不安全的外网环境下。

不怀好意的第三方开发者，只需要写一个简单的爬虫就能把数据全部 Download 走！



# 二、数据安全性问题

上面的问题就引申出了 <u>数据安全性如何得到保证的问题</u>，业界主要是采用以下几种方案：



# 三、目前几大主流解决方案



## 1、拒绝跨域访问

数据直接放在Web服务器下，拒绝跨域访问资源。

> 缺陷：这个安全性最低！第三方程序员只需要写一个请求转发的后端程序，就能直接盗用资源数据。



## 2、携带资源访问令牌

这个是绝大部分在线地图商采用的方案，服务端要求客户端在请求头中携带资源访问令牌，即 Token ，并允许跨域访问。

> 缺陷：Token 极易泄露！例如 天地图影像、MapBox影像、Ceisum 官方地形数据，都采用的这种方式，开发者者打开浏览器控制台，盗走 Token 轻而易举。



## 3、资源访问权限拦截

检查当前用户是否登录，如果为未登录则拒绝资源请求 URL。

例如：数据放在 Tomcat 目录下，使用 Java Session 会话技术检查用户权限。该方案实际上是检查资源请求头中的 Session ID，做用户权限判断，**安全性有明显提升**。

> 缺陷：但如果攻击者有业务系统的合法账号，数据仍有被爬虫盗取的可能。同时需要编写的代码量比较大。



## 4、其他

当然还有其他一些作者不知道的方案...



# 四、数据加密

## 1、实现方式

以上的方案都是基于访问权限做的限制，那我们能不能针对数据本的本身去做加密呢？

例如：

- 将数据（3D Tiles、影像、图层、矢量）在服务端就加密完成
- 传输到客户端后由 Cesium 进行解密

这当然是可行的

## 2、实现思路

这需要前后端配合

- 写一个后端程序，使用加密算法对静态资源文件数据包加密后，再响应回客户端

- 写一个 Cesium 的 Resources 解密 JS 插件

## 3、存在的问题

原始数据进行加密之后文件体积不可避免的会变大，如果采用 **AES** 加密算法进行加密，文件体积会增大为原来的两倍，例如：

一张 **242kb** 的图层瓦片，加密后大小体积为 **501kb** 。



# 五、代码示例

## 1、后端代码

使用 Nodejs 实现：

```
- Node
	- file
		- worldImage.jpg
	- lib
		- CryptoUtil.js
	- webServer.js
```



`webServer.js`

```js
const Koa = require('koa');
const cors = require('koa2-cors');
const compress = require('koa-compress');
const path = require('path');
const fs = require('fs');
const CryptoUtil = require('./lib/CryptoUtil.js');

function bufferToHex(buffer) {
    return buffer.toString('hex');
}

let server = new Koa();


const router = require('koa-router')();
router.get('/worldImage.jpg', async function (ctx, next) {
    let buffer = fs.readFileSync(path.join(__dirname, './file/worldImage.jpg'));
    // ctx.set('Content-Type', '.jpg');
    // ctx.set('content-Disposition', `attachment;filename=${'worldImage.jpg'}`);

    let hexStr = bufferToHex(buffer);
    let ciphertext = CryptoUtil.Encrypt(hexStr, '1234567890');

    ctx.body = ciphertext;
});

server.listen(3000, function () {
    // 允许跨域
    server.use(cors());
    // 进行 Gzip 压缩
    server.use(compress({br: false}));
    // 添加路由
    server.use(router.routes());

    console.log('server is running at http://localhost:3000');
});
```



`CryptoUtil.js`

```js
const CryptoJS = require('crypto-js');

class CryptoUtil {
    static Encrypt(dataStr, key) {
        return CryptoJS.AES.encrypt(dataStr, key).toString();
    }

    static Decrypt(ciphertext, key) {
        let bytes = CryptoJS.AES.decrypt(ciphertext, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}

module.exports = CryptoUtil;
```



## 2、前端代码

```
- lib
	- axios.min.js
	- crypto-js.min.js
	- CryptoUtil.js
- index.html
```

`index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Web端</title>
    <script src="./lib/axios.min.js"></script>
    <script src="./lib/crypto-js.min.js"></script>
</head>
<body>
<img id="img" width="500">
<script type="module">
    import CryptoUtil from './lib/CryptoUtil.js';


    function hexToBlob(hex) {
        let bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return new Blob([bytes]);
    }

    async function main() {
        let {data} = await axios.get('http://localhost:3000/worldImage.jpg');

        data = CryptoUtil.Decrypt(data, '1234567890');

        let blob = hexToBlob(data);

        let img = document.getElementById('img');

        img.src = window.URL.createObjectURL(blob);

        console.log(blob);
    }

    main();
</script>
</body>
</html>
```



`CryptoUtil.js`

```js
class CryptoUtil {
    static Encrypt(dataStr, key) {
        return CryptoJS.AES.encrypt(dataStr, key).toString();
    }

    static Decrypt(ciphertext, key) {
        let bytes = CryptoJS.AES.decrypt(ciphertext, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}

export default CryptoUtil;
```



## 3、代码仓库

我已经把实现代码上传到 GitHub 仓库上了

地址：



# 六、项目化解决方案

我已经把实现代码上传到 GitHub 仓库上了



















