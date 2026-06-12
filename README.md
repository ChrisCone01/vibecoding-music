# SoundDrift

音乐卡片展示网页：半圆弧传送带卡片、点击居中播放、随音乐节奏 3D 倾斜、逐字歌词、顶部 MV 混剪、网易云在线搜索。

封面 / 音频 / 歌词 / MV 全部**实时取自网易云音乐**（经本地 Node 代理转同源），无需打包大媒体文件。

## 在新电脑上运行

**最省事**：让 Claude Code 读并执行仓库里的 [`给ClaudeCode的指令.md`](给ClaudeCode的指令.md) —— 它会自动检查 Node、克隆、验证网络、启动服务。

**手动运行**（Windows）：
1. 装 [Node.js LTS](https://nodejs.org)
2. 克隆本仓库（已含 `netease/` 依赖，无需 npm install）
3. 双击 `启动SoundDrift.bat` → 浏览器自动打开 `http://127.0.0.1:8080/`
4. 关闭：双击 `关闭SoundDrift.bat`

> ⚠️ **必须能访问网易云**（`music.163.com`、`*.music.126.net`、`*.vod.126.net`）。公司/校园网若屏蔽则无法使用，需换网络。

## 架构

两个本地 Node 服务（缺一不可）：
- **端口 3000**：网易云接口服务（`NeteaseCloudMusicApi`，入口 `netease/node_modules/NeteaseCloudMusicApi/app.js`）
- **端口 8080**：主站 + `/ncm/*` 代理（`server.js`，纯 Node 内置模块）。浏览器只访问 8080，内部再调 3000。

代理路由（`server.js`）：
- `/ncm/audio?id=` 音频流（Range+CORS，内部调 song/url/v1）
- `/ncm/mv?id=` MV 流
- `/ncm/img?u=` 封面图（同源，避免 canvas 取色污染）
- `/ncm/api/<path>` 透传网易云接口（search / lyric / song-detail 等）

前端 `index.html` 单文件：GSAP 动画 + Web Audio 节奏分析 + 搜索。本地字体在 `assets/fonts/`。

## 会员歌曲（可选）

少数会员歌曲未登录只播 30 秒试听。要整首播放，用网易云账号扫码登录一次：
1. 3000 服务��行时执行 `node qrlogin.js` → 生成 `ncm_login_qr.png`
2. 手机网易云 App 扫码登录
3. 执行 `node qrcheck.js` → 写入 `ncm_cookie.txt`
4. 重启 `server.js`

> `ncm_cookie.txt` 含账号登录令牌，已 `.gitignore` 排除，**不会上传**，每台机器需各自登录。

## 不需要

数据库、构建打包、公网、域名、服务器都不需要。纯本地双 Node 进程 + 浏览器。
