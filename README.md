# 猫猫游园会 · Cat Amusement Park

一个温馨治愈的 3D 游乐园。陪一只小黑猫散步，点亮设施，坐一会儿热气球，等夜幕和烟花到来。

A cozy, interactive miniature amusement park built with **Three.js + React + TypeScript + Vite**. No backend, account, API key, or paid service required.

## 玩法

- 移动鼠标引导猫猫；手机点击地面；也可先点击场景，再使用方向键或 WASD。
- 猫猫会绕开设施和树木。靠近设施时，灯光亮起、设施运转。
- 五种设施：摩天轮、旋转木马、碰碰车、糖果转转杯、云朵热气球。
- 走近热气球后，猫猫跳入中空吊篮，收好后腿、放平前爪、卷起尾巴，升空停留约 8 秒后返回地面。
- 点击右上角太阳图标：居中时钟快进 2 秒，再进入深蓝夜景，天空随机绽放烟花。
- 底部图标可直接引导猫猫前往对应设施；右上角重置图标让猫猫回到入口。
- 适配桌面和手机，支持系统的“减少动态效果”设置。需要支持 WebGL 的浏览器。

## 本地运行

需要 **Node.js 22.13+** 和 npm。

```sh
git clone https://github.com/juliettesfriday/cat-amusement-park.git
cd cat-amusement-park
npm ci
npm run dev
```

打开终端显示的本地地址（默认 `http://127.0.0.1:5173`）。本地预览需要终端里的服务保持运行。

```sh
npm run typecheck  # TypeScript 检查
npm test           # 热气球乘坐状态与恢复逻辑
npm run build      # 生成 dist/ 静态网站
npm run preview    # 本地检查生产构建
```

## 发布网页

将 `dist/` 内容部署到支持静态网站的服务即可。构建使用相对资源路径，可放在域名根目录或子目录；访问部署目录的首页。GitHub 仓库用于源码托管，上传源码并不自动启用 GitHub Pages。

## 代码结构

- `src/CatPark.tsx`：页面控件、昼夜切换和时钟过渡。
- `src/world.ts`：Three.js 场景、程序化模型、小猫动作、路径寻找、灯光与设施。
- `src/balloon-ride.ts`：登篮、坐稳、升空、停留、降落和离篮的状态管理。
- `src/fireworks.ts`：夜间烟花粒子。
- `src/NightClock.tsx`：昼夜切换时的模拟时钟。
- `src/*.css`：绘本风格界面与响应式样式。
- `public/sky.png`：为本项目生成的天空背景。

## 内容与许可证

项目代码与随附原创素材以 [MIT License](LICENSE) 开源。3D 猫猫和设施由代码生成，天空背景由 AI 辅助生成；未包含参考图片、外部角色模型、登录凭据或私人配置。第三方依赖保留各自许可证，参见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

欢迎提交 Issue 和 Pull Request。请在提交前运行 `npm test` 和 `npm run build`，并检查白天、夜晚和热气球乘坐效果。
