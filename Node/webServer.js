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
