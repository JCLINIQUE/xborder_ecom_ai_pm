# 知 AI · 概念学习手册

[打开已上线示范版](https://ai-concept-notebook.jennifer-kuang12.chatgpt.site)（私有入口，需登录并具备访问权限）。

本目录是 **Day 11 归档的完整源码**；教学使用安排在 [Day 10](<../../10. ai-learning/Day10-AI知识学习PWA.md>)，Day 13 做手机验收。从仓库根目录进入本项目：

```sh
cd "attachments/11. ai-interaction/ai-knowledge-pwa"
```

面向 AI 入门者的中文 PWA。23 张概念卡覆盖 6 个单元：语言模型基础、Prompt、资料与训练、工具与 Agent、评测、运行支撑。

每课按「概念 → 易混点 → 小测 → 可选店铺例子」学习。概念来源仅限 OpenAI 和 Anthropic 官方文档；逐课标明英文术语、原文标题、章节、链接、核验日期与适用范围。中文均为转述，小测和亚马逊店铺例子为课程原创。OpenClaw 尚未收录。历史 Agent Builder 文档仅用于解释流程图概念，相关范围在来源中说明。

## 功能

- 概念地图、学习记录、答题解析与错题复习。
- 阅读、小测、例子练习、延时复习独立统计。
- 相同题目在解析曝光后的即时重做不提升概念检查状态或复习次数；另一道概念题可重新检验理解。每课含两道概念题和一道例子题，复习会重复出现。
- 首次独立检查后约 1 天复习，之后 3、7、14 天；答错重置为 1 天。这是课程设计，并非官方学习效果承诺。
- 学习记录按平台用户身份保存至 D1；IndexedDB 只作离线镜像和待同步队列。恢复连接时幂等补传。
- Service Worker 缓存课程、界面和图标；不缓存身份或进度 API。首次完整打开并显示「离线就绪」后可离线使用，原文链接仍需联网。
- 支持 PWA 安装、手机与桌面布局、键盘操作、减少动效设置。
- WebMCP 仅暴露读取进度和打开课程，无自动标记已学会的功能。

## 开发

Node.js 24+（本地预览使用 node:sqlite），pnpm。

```sh
pnpm install
pnpm db:generate # 仅在 schema 变化时生成新迁移
pnpm build
pnpm test
pnpm dev
```

预览地址：`http://127.0.0.1:4318/`。

本地预览使用固定的测试身份和 `.dev/progress.sqlite`，不会上传测试答题记录。生产由 Sites 认证入口提供 `oai-authenticated-user-id`，缺少身份时进度 API 返回 401。D1 迁移位于 `drizzle/`，生产运行时不创建或修改表。

`build.mjs` 生成 Cloudflare Workers 兼容的 `dist/server/index.js`，包含所有静态学习资产。`.openai/hosting.json` 保留原私有 Site 的项目标识与 D1 绑定；此次目录迁移不改变线上地址或学习记录。课程仓库直接管理本目录源码，不作为嵌套 Git 仓库或子模块。后续部署应复用该 Site，并在其独立部署仓库中同步同版源码后按 Sites 流程发布。无需模型 API 密钥，本版没有实时模型对话功能。

## 验证

`tests/learning.test.mjs` 检查阅读与理解统计、错题与复习、来源准入、用户记录隔离、幂等同步、输入验证、PWA 资源及离线回退。浏览器检查学习导航、错题换题、例子、来源展开、重载持久化、断开预览服务后离线作答与恢复同步，以及手机布局。
