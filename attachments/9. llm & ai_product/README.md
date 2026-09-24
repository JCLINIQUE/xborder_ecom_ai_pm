# Day 09 · AI 基础①：从模型能力到产品形态

## 教学材料

- [AI 分析前，资料从哪里来？](./Day09-AI如何获取运营上下文.md)：用运营日报例子解释上下文；第 3 节用“问工具清单、填条件调用、接收结果”讲懂 **MCP**，再与 **API、Plugin（插件）** 对照。分清插件增加功能、工具实际取数，以及安装、连接、授权的区别。
- [完整教学安排](<../../index.html#day-09>)：模型基础 → 资料与上下文获取 → 产品形态与人机协作。

新增内容在课堂中用 15 分钟认识，不要求搭建采集或接入系统；仍交同一组 3–5 张课堂学习卡，其中一张比较取数方式，一张比较产品形态。产品比较与工作台选择保留在课堂笔记；[Day 10 学习 PWA](<../10. ai-learning/Day10-AI知识学习PWA.md>)只收录有 OpenAI／Anthropic 官方文档依据的 AI 概念，必要时复用「知 AI」已有概念卡，不增加写卡任务。

## 亚马逊精品运营工作台 MVP

项目代码在 [amazon-ops-workbench](./amazon-ops-workbench/README.md)。

当前交互：**数据导入 → 数据报告 → AI 分析 → 日报导出**。重点体验真实数据导入、可编辑图表、自定义 Prompt、人工修改分析与报告、下载结果。

Day 05 的原始 HTML 保留在 `../5. demo/index.html`，未被本项目覆盖。后续可在共享数据与服务层上尝试其他 AI 交互方式，第一版先把工作台流程做好。

本机启动：

```sh
cd "/Users/kkx/Desktop/benchmark/xborder_ecom_ai_pm/attachments/9. llm & ai_product/amazon-ops-workbench"
npm run dev
```

默认预览地址：http://localhost:5173/ 。首次配置、支持格式及限制见项目 README。
