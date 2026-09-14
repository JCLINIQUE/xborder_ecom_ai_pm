# 给非技术人员的 GitHub 使用手册

这份说明写给没有编程背景、但需要阅读和更新课程材料的人。

先把 GitHub 理解成一个“带版本记录的在线文件夹”。它可以放网页、文档、模板和示例。每次更新都会留下记录，方便以后查看谁改了什么、什么时候改的，也方便恢复旧版本。

## 1. GitHub 是什么

GitHub 可以做三件事：

| 你熟悉的说法 | 在 GitHub 里的说法 | 作用 |
| --- | --- | --- |
| 一个项目文件夹 | Repository / Repo / 仓库 | 存放这个项目的所有文件 |
| 一个文件 | File / 文件 | 比如 `index.html`、模板、说明文档 |
| 保存一次版本 | Commit / 提交 | 记录一次改动，附带一句说明 |
| 上传到网上 | Push / 推送 | 把本地改动同步到 GitHub |
| 从网上更新到本地 | Pull / 拉取 | 把 GitHub 上的新内容同步到电脑 |
| 网站预览 | GitHub Pages | 把 `index.html` 发布成一个网页链接 |

你不需要先学会写代码。对这个项目来说，重点是会看文件、改文件、提交和发布。

## 2. 这个项目怎么组织

本项目主要有两类内容：

- `index.html`：课程首页和教学安排。以后教案变化时，主要改这个文件。
- `attachments/`：配套材料。比如用户调研方法、模板、真实样例。

建议按主题放附件，例如：

```text
attachments/
  user-research/
    怎么做用户调研.md
    用户调研报告模板.md
    竞品分析用户调研报告示例.md
  github-basics/
    给非技术人员的GitHub使用手册.md
```

这样课程顺序调整时，附件地址不容易乱。

## 3. 页面上最常见的文件

| 文件类型 | 常见用途 | 小白怎么看 |
| --- | --- | --- |
| `.md` | 文档、说明、模板 | GitHub 会自动排版，适合直接阅读 |
| `.html` | 网页 | 可以用浏览器打开，也可以通过 GitHub Pages 发布 |
| `.pdf` | 定稿材料 | 适合发给学员，不方便继续编辑 |
| `.docx` | 可填写模板 | 适合学员下载后填写 |

建议保留一个可编辑版本，例如 `.md` 或 `.docx`。需要发给别人时，再导出 PDF。

## 4. 日常更新流程

每次更新可以按这四步走：

1. 在电脑上修改文件。
2. 用浏览器或 GitHub 页面检查内容是否正确。
3. `commit` 保存这次改动。
4. `push` 上传到 GitHub。

如果只改课程首页：

```bash
git add index.html
git commit -m "Update teaching plan"
git push
```

如果同时改了附件：

```bash
git add index.html attachments
git commit -m "Update teaching plan and attachments"
git push
```

提交说明不用写很长，但要让以后的人看得懂。例如：

- `Update teaching plan`
- `Add GitHub beginner guide`
- `Update user research template`
- `Add user research sample`

## 5. 怎么知道自己改了什么

提交前先看状态：

```bash
git status
```

常见提示：

| 看到什么 | 意思 | 下一步 |
| --- | --- | --- |
| `modified: index.html` | 首页被改过 | 确认后 `git add index.html` |
| `untracked files` | 新文件还没被 Git 管理 | 用 `git add 文件名` 加进去 |
| `nothing to commit` | 没有新的改动 | 不需要 commit |

## 6. 如果只想在 GitHub 网页上改

适合小改，比如改错字、更新日期、补一个链接。

1. 打开 GitHub 仓库。
2. 点要修改的文件。
3. 点右上角铅笔图标。
4. 修改内容。
5. 页面底部填写提交说明。
6. 点 `Commit changes`。

网页上改完后，如果你电脑本地也要保持最新，回到终端执行：

```bash
git pull
```

## 7. GitHub Pages 是什么

GitHub Pages 可以把仓库里的 `index.html` 变成一个可访问的网址。

发布后，使用者只需要打开网页，不需要懂 GitHub，也不需要下载文件。

本项目适合这样用：

- GitHub 仓库：给维护者看，管理文件和历史版本。
- GitHub Pages 网页：给学习者看，打开就是课程首页。
- `attachments/` 附件：从课程首页点进去读或下载。

## 8. 更新 `index.html` 时注意什么

每次更新首页，建议检查三件事：

1. 顶部“最后更新”日期是否改了。
2. 新增附件的链接是否能点开。
3. 文件名和路径是否保持稳定。

如果你已经把某个附件链接发给别人，尽量不要改文件名。要改内容，就直接更新原文件。

## 9. 常见问题

**我是不是每次都要重新建仓库？**

不用。仓库只建一次。以后都在同一个仓库里更新文件。

**我是不是每次都要重新生成网页链接？**

不用。GitHub Pages 的网址保持不变。你更新 `index.html` 后，同一个网址会显示新版内容。

**我改错了怎么办？**

GitHub 有历史版本。每次 commit 都是一份记录，可以查看旧版本，也可以恢复。

**为什么不能直接用 GitHub 密码 push？**

GitHub 已经不支持用账号密码做 Git 推送。现在一般用 SSH key 或 Personal Access Token。

**附件应该放 PDF 还是 Markdown？**

正在频繁修改的内容，优先用 Markdown 或 docx。定稿后再导出 PDF。

## 10. 给维护者的最小命令清单

进入项目：

```bash
cd /Users/kkx/Desktop/benchmark/xborder_ecom_ai_pm
```

查看状态：

```bash
git status
```

提交首页更新：

```bash
git add index.html
git commit -m "Update teaching plan"
git push
```

提交首页和附件更新：

```bash
git add index.html attachments
git commit -m "Update teaching plan and attachments"
git push
```

从 GitHub 拉取最新版本：

```bash
git pull
```

这几个命令够覆盖大多数日常维护场景。
