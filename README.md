# SoundDrift

vibecoding 音乐卡片展示项目。半圆弧传送带入场 + 无限循环，悬停预览高潮段、点击居中播放整首并跟节奏 3D 倾斜、顶部随机 MV 混剪、SplitText 歌词。

## 运行

```bash
node server.js
# 打开 http://127.0.0.1:8080/
```

## 媒体文件（未入库，需本地放置）

为控制仓库体积，`assets/audio/`（音频）和 `assets/video/`（MV）**未上传**（见 `.gitignore`）。封面图、歌词、字体已包含。

到新机器后按封面号放回：

- **音频** `assets/audio/audioN.mp3`（N=1~19，对应封面号；cover2=Shoot 等）。高潮段起止秒数在 `index.html` 的 `AUDIO` 表里。
- **MV** `assets/video/mvN.mp4`（N=1~19，cover2 无 MV）+ `assets/video/mvdefault.mp4`（顶部默认混剪的兜底视频）。映射见 `index.html` 的 `MV` 表与顶部混剪 `POOL`。

封面↔歌曲↔文件名对应关系见 `index.html` 里的 `META` / `AUDIO` / `MV` 注释。

## 技术

纯 HTML 单文件（`index.html`）+ 本地 GSAP（`lib/gsap.min.js`）+ Node 静态服务器（`server.js`，支持 mp4 Range）。字体 Fraunces / Cervanttis 在 `assets/fonts/`。
