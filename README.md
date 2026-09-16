# xborder_ecom_ai_pm

跨境电商运营转向跨境电商 AI 产品经理的教学计划与配套材料。

课程共 **30 天、约 60 小时**，包含 20 次交流和 10 天独立练习。围绕学员的真实运营场景，逐步完成调研、需求提炼、产品功能设计、PRD、原型、Demo、评测与迭代，并整理成可讲解的项目材料。

## 从哪里开始

1. **看课程安排**：[index.html](index.html) 包含岗位对照、学习重点和 Day 01–Day 30 的教学安排。下载到本地后，用浏览器打开这个文件即可查看，无需启动服务。
2. **找当天材料**：按下方的材料目录阅读方法、案例和模板；在 GitHub 上点击 Markdown 文件即可阅读。
3. **第一次使用 Git**：先看 [给非技术人员的 GitHub 使用手册](<attachments/0. github-basics/给非技术人员的GitHub使用手册.md>)，其中包含 Windows / Mac 打开命令窗口、首次克隆、分支操作、上传和常见报错说明。

## 课程怎么推进

| 阶段 | 主要内容 |
| --- | --- |
| 第一周 · Day 01–07 | Day 01–03：调研 → 候选需求提炼 → 产品功能设计；Day 04–07 保留旧安排，待衔接 |
| 第二周 · Day 08–14 | 用户试用、AI 基础、交互与技术架构，补充同一份 PRD，并制作学习 PWA |
| 第三周 · Day 15–21 | 离线评测、评分校准、对照迭代、发布准备与小范围试用 |
| 第四周 · Day 22–28 | 业务价值与实验分析、技术答辩、项目交付与终验 |
| 结课 · Day 29–30 | 材料定稿、独立讲解与完整模拟 |

Day 01–03 聚焦**日常竞品跟踪如何辅助运营决策**。Day 01 先区分产品开发／选品的市场调研与运营的日常跟踪，再示范访谈和报告；Day 02 从核验、比较与判断中提出 2–3 条候选需求，标明证据缺口并推荐一项；Day 03 围绕价格／促销变化，设计“核验记录 → 识别变化 → 辅助排查 → 运营决定”，交付需求—功能对应表、首版范围与输入输出样例，再进入 PRD。

现有材料提供了跟踪流程和判断思路，完整的连续记录与真实处理案例仍待补充。课堂模拟样例单独标注，不作为已验证的需求或收益；桌麦市场报告归入市场调研参考，不与跟踪证据混用。

**Day 04–30 及后续阶段目标目前保留旧安排，待按新功能设计衔接。** 旧安排中对“Day 03 的 PRD”的依赖不代表当前 Day 03 已完成 PRD；原 SSD PRD 和原型材料仅保留作写法参考。后续在需求与功能明确后编写 PRD，再衔接原型与 Demo，并随学习补充 AI 交互、架构和评测要求。

学员还将亲手制作一个学习 PWA，用手机复习 AI 术语、业务案例和练习题。主项目 Demo、学习 PWA 和最终项目材料会在课程中逐步完成；当前仓库提供教学安排及下列配套教材。

## 材料目录

| 目录 | 内容与入口 |
| --- | --- |
| `attachments/0. github-basics/` | [GitHub 使用手册](<attachments/0. github-basics/给非技术人员的GitHub使用手册.md>)：命令窗口、clone / pull、分支、提交与推送、常见问题 |
| `attachments/1. user-research/` | [怎么做用户调研](<attachments/1. user-research/怎么做用户调研.md>)、[用户调研报告模板](<attachments/1. user-research/用户调研报告模板.md>)、[亚马逊运营调研示例：日常竞品跟踪](<attachments/1. user-research/用户调研报告-亚马逊精品运营-20260914.md>) |
| `attachments/2. product-sense/` | ① [主课件：学方法](<attachments/2. product-sense/Day02产品需求提炼.md>) → ② [课堂案例：练习与答案](<attachments/2. product-sense/Day02课堂练习与参考答案.md>) → ③ [提交模板：填需求清单](<attachments/2. product-sense/产品需求清单模板.md>)。课堂边讨论边填模板，课后修订，只交一份需求清单。 |
| `attachments/3. prd/` | [Day 03 产品功能设计](<attachments/3. prd/Day03产品功能设计.md>)、[课堂练习与功能清单模板](<attachments/3. prd/Day03课堂练习与功能清单模板.md>)；后续参考 [完整 PRD 模板](<attachments/3. prd/PRD写作模板.md>)及[旧版 SSD PRD 写法示例](<attachments/3. prd/业务版PRD-竞品对比助手.md>) |
| `attachments/4. prototype/` | [Day 04 原型设计指南](<attachments/4. prototype/Day04原型设计指南.md>)、[页面交互与三张线框](<attachments/4. prototype/页面与交互说明-竞品对比助手.md>)、[XMind 导入大纲](<attachments/4. prototype/竞品对比助手-XMind导入大纲.md>)：旧版 SSD 原型材料，待与新功能设计衔接 |
| `attachments/5. demo/` | [桌麦市场调研.xlsx](<attachments/5. demo/桌麦市场调研.xlsx>)：市场调研／竞品分析的真实样本，保留供其他场景参考；不作为 Day 01–03 日常竞品跟踪的证据或练习输入 |

## 首次下载到电脑

先按 GitHub 手册打开命令窗口：Windows 使用 Git Bash，Mac 使用终端。进入想存放项目的文件夹后，逐行执行：

```bash
git clone 仓库网址
cd 文件夹名
git status
```

把“仓库网址”换成 GitHub 仓库页面 **Code → HTTPS** 下的克隆地址，把“文件夹名”换成克隆生成的目录名称。`git clone` 会自动创建文件夹，不需要提前再建一个同名文件夹。

如果已经克隆过，直接进入已有仓库；后续更新使用 `git pull`，具体分支选择和操作顺序见手册。只有下载 ZIP 解压出的文件时，可以阅读材料，但需要通过 `clone` 获取 Git 仓库才能按手册提交和推送。

## 怎么更新

教案统一维护根目录的 `index.html`，附件按 `attachments/` 下的课程编号目录归档。

1. 修改前先按 GitHub 手册检查仓库状态、更新相应分支；新任务可使用 `update-docs` 这样的分支名。
2. 改教案时，更新 `index.html`，并同步页面顶部的“最后更新”日期。
3. 修改已有附件时，尽量保留文件名和路径。确需重命名或移动目录时，同步修正首页、README 和其他文档里的引用。
4. 新增附件时，放入对应编号目录，并在首页对应课程和 README 中补上入口。
5. 用浏览器检查首页，确认课程安排、附件链接和模板说明一致，再提交并推送自己的分支。
6. 通过 Pull Request 评审并合并到 `main`。把分支推送到 GitHub 不等于已经合并到 `main`。

## 发布到 GitHub Pages

如需把课程首页发布成网页，可由仓库维护者在 GitHub 上配置：

1. 打开仓库的 **Settings → Pages**。
2. 在 **Build and deployment → Source** 中选择 **Deploy from a branch**。
3. 选择 **main** 分支和 **/(root)** 文件夹，点击 **Save**。

配置方法见 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。部署完成后，以 Pages 页面显示的实际访问地址为准。

按上述配置，后续改动合并并推送到远端 `main` 后，会触发网页更新；仅推送个人分支不会更新正式网页。
