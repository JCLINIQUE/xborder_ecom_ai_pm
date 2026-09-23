# 亚马逊精品运营工作台 · MVP

Day 09 的独立实现。Day 05 的原始 `index.html` 保持不动。第一版只做四步：

**数据导入 → 数据报告 → AI 分析 → 日报导出**

不包含店铺管理、运营待办或复杂的工作空间设置。打开页面不自动填充模拟数据，可以导入新资料或恢复上次保存的资料。

## 本机启动

当前电脑已安装依赖、初始化数据库。进入本目录运行：

```sh
npm run dev
```

打开终端显示的地址，默认是 http://localhost:5173/ 。已有预览运行时不要重复启动。

在一台新电脑上需要 Node.js 22.13 或更新版本，先运行 `npm ci`，再运行 `npm run build`。仅在全新本地数据库上执行一次：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wet_talisman.sql
```

然后运行 `npm run dev`。本地预览使用脚手架的回环地址模拟身份，无需另外注册账号。资料、修改和原始文件保存在本项目的 `.wrangler/state`，不提交 Git；不要删除它，否则会丢失本地记录。

## 怎么用

1. **数据导入**：选择文件或粘贴内容；核对原文、表格和指标映射后确认。也可点击“恢复上次数据”。
2. **数据报告**：切换表格、筛选数据；添加或修改图表的类型、坐标、指标叠加、目标线及备注。文字资料可直接修正。
3. **AI 分析**：在当前页修改分析 Prompt，生成后直接编辑分析结果；可下载 Markdown，也可带入日报。
4. **日报导出**：修改日报 Prompt、生成草稿并编辑正文；下载 Markdown / HTML，或通过打印对话框另存 PDF。不接 AI 也能先整理数据摘要。

右上角“模型连接”只配置服务商、模型名称和 API Key，不属于某一份资料。当前支持 DeepSeek API、阿里云百炼北京地域。连接信息仅在本次页面会话中共用，刷新需重填，不写入日报或导出文件。

## 格式与边界

- Excel：XLSX / XLS，另支持 CSV / TSV、多工作表。
- 截图：PNG / JPG / JPEG / WEBP / BMP，通过英文和简体中文 OCR 识别。
- 文字：TXT / Markdown / 粘贴文字或表格。
- Word：DOCX；旧版 DOC 需要先另存为 DOCX。
- PDF：提取文字；扫描页走 OCR。OCR 需要联网加载引擎与语言包，结果需要人工核对。
- 文档和图片不保证恢复成准确的结构化表格；可作为文字材料参与分析，绘图需提供或整理成 Excel / CSV 等表格。
- 单文件最多 10 MB、PDF 最多 40 页；每份日报最多 20 份资料，每张表最多 5,000 行、60 列。
- AI 只在用户确认后调用，可能产生服务商 API 费用。尚未使用真实 Key 验证付费模型效果。
- 目前下载的日报以正文为主；PDF 使用浏览器打印，不是后台生成附件。

产品与代码分层见 [PRODUCT.md](./PRODUCT.md)。本轮界面收敛只进行编译检查，交由使用者自测，不执行复杂验收。
