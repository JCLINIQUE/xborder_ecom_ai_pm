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
| 临时修改版本 | Branch / 分支 | 在不影响正式版本的情况下试改内容 |
| 网站预览 | GitHub Pages | 把 `index.html` 发布成网页链接 |

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

## 4. Branch 是什么

Branch 可以理解成“从正式版本复制出来的一份草稿”。正式版本通常放在 `main` 分支上；如果要做较大的调整，可以先在新分支里改，确认没问题后再合并回 `main`。

常见用法：

| 场景 | 建议做法 |
| --- | --- |
| 改错字、更新日期、小改附件 | 直接在 `main` 上改 |
| 大幅调整课程结构 | 新建一个分支，确认后再合并 |
| 想尝试两个不同版本 | 分别建两个分支，比较后保留一个 |
| 多个人同时维护 | 每个人在自己的分支改，最后统一合并 |

### 在分支上修改的完整流程

第一步，确认自己在项目文件夹里：

```bash
cd 本地项目文件夹路径
```

第二步，先把本地内容更新到最新：

```bash
git pull
```

第三步，确认自己要在哪个分支上修改。

如果分支已经存在，切换过去：

```bash
git switch 你的分支名
```

如果这是一个新任务，还没有对应分支，就新建并切换过去：

```bash
git switch -c 你的分支名
```

`-c` 表示创建新分支。分支名要换成实际名称。对新手来说，可以先用自己的名字做分支名；如果团队要求按任务命名，也可以用任务名。

例如，第一次开始维护材料，可以新建自己的分支：

```bash
git switch -c 你的名字
```

下次继续改这个分支时，不再加 `-c`：

```bash
git switch 你的名字
```

第四步，确认已经在正确分支上：

```bash
git branch --show-current
```

第五步，修改文件。比如更新 `index.html`，或者新增 `attachments/` 里的材料。

第六步，查看改了哪些文件：

```bash
git status
```

第七步，把这次要提交的文件加入版本记录。常用写法是：

```bash
git add index.html attachments
```

如果确定当前所有改动都要提交，也可以用：

```bash
git add -A
```

第八步，提交这次改动。引号里简短描述这次改了什么：

```bash
git commit -m "简短描述这次改了什么"
```

例如：

- `git commit -m "Update user research template"`
- `git commit -m "Add GitHub beginner guide"`
- `git commit -m "Revise week one plan"`

第九步，把这个分支上传到 GitHub。这里也要使用同一个分支名：

```bash
git push -u origin 你的分支名
```

例如：

```bash
git push -u origin 你的名字
```

上传后，GitHub 页面通常会提示创建 Pull Request。Pull Request 可以理解成“申请把这份草稿合并到正式版本”。确认内容没问题后，再把它合并到 `main`。

如果只是自己维护的小项目，也可以先不强制使用分支；但只要是大改动、多人协作、或者不确定是否采用的内容，用分支会更清楚。

### 遇到 conflict 怎么办

Conflict 是“同一个地方被两边都改了，Git 不知道该保留哪一版”。常见情况是：你本地改了文件，GitHub 上同一个文件也被别人改了；或者你把分支合并回 `main` 时，两边改到了同一段内容。

如果 `git pull` 或 `git push` 提示 conflict，先不要反复 push。先看状态：

```bash
git status
```

如果看到类似 `both modified`、`unmerged paths`，说明有文件需要手动处理。打开这些文件，会看到类似这样的标记：

```text
<<<<<<< HEAD
本地这一版内容
=======
另一边的内容
>>>>>>> 分支名
```

处理方法是：读两边内容，决定保留哪一版，或者合并成新的一版。处理完后，把 `<<<<<<<`、`=======`、`>>>>>>>` 这些标记全部删掉。

然后执行：

```bash
git add 冲突文件名
git commit -m "Resolve merge conflict"
```

如果冲突发生在 `pull` 之后，处理完再继续：

```bash
git push
```

如果冲突发生在 Pull Request 页面上，优先在 GitHub 页面看冲突文件；如果不确定该保留哪一版，不要硬合并，找维护者一起确认。

## 5. 更新注意事项与常见问题

每次更新首页，建议检查三件事：

1. 顶部“最后更新”日期是否改了。
2. 新增附件的链接是否能点开。
3. 文件名和路径是否保持稳定。

如果你已经把某个附件链接发给别人，尽量不要改文件名。要改内容，就直接更新原文件。

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

## 6. 给维护者的最小命令清单

进入项目：

```bash
cd 本地项目文件夹路径
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
