# 给非技术人员的 GitHub 使用手册

这份说明写给没有编程背景、但需要阅读和更新课程材料的人。

先把 GitHub 理解成一个“带版本记录的在线文件夹”。它可以放网页、文档、模板和示例。每次更新都会留下记录，方便以后查看谁改了什么、什么时候改的，也方便恢复旧版本。

## 1. GitHub 是什么

GitHub 可以做三件事：

| 你熟悉的说法 | 在 GitHub 里的说法 | 作用 |
| --- | --- | --- |
| 一个项目文件夹 | Repository / Repo / 仓库 | 存放这个项目的所有文件 |
| 一个文件 | File / 文件 | 比如 `index.html`、模板、说明文档 |
| 第一次把仓库下载到电脑 | Clone / 克隆 | 下载项目文件和 Git 版本记录，建立本地仓库 |
| 保存一次版本 | Commit / 提交 | 记录一次改动，附带一句说明 |
| 上传到网上 | Push / 推送 | 把本地改动同步到 GitHub |
| 更新已有的本地仓库 | Pull / 拉取 | 在本地仓库中，把远端对应分支的新提交同步下来 |
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

### 开始前：先把仓库放到本地

首次获取已有的 GitHub 项目，要先执行 `git clone 仓库网址`。`git pull` 用于更新已有的本地仓库，不能代替首次克隆。

下面两种情况选一种，不要从头到尾重复执行。

**情况 A：这台电脑还没有克隆过这个项目。**

打开 Terminal，先进入你想存放项目的文件夹，再执行：

```bash
git clone 仓库网址
cd 文件夹名
```

把“仓库网址”换成 GitHub 仓库页面中 Code → HTTPS 下的克隆地址，把“文件夹名”换成 `git clone` 自动创建的文件夹名称，通常就是仓库名。

新文件夹里面包含项目文件和隐藏的 `.git` 目录；克隆完成后要用 `cd` 进入它。不需要提前创建同名文件夹。`cd 文件夹名` 要在该文件夹的上一层执行；如果名称含空格，用英文双引号包住，例如 `cd "文件夹名"`。

**情况 B：这台电脑已经克隆过这个项目。**

不用再次 `clone`，在本地仓库的上一层文件夹执行：

```bash
cd 文件夹名
```

如果你先建了一个同名文件夹，再在里面执行 `clone`，就会有两层同名目录。如果当前已在外层，再执行一次下面的命令进入内层：

```bash
cd 文件夹名
```

“文件夹名”要换成实际名称。如果当前不在目标文件夹的上一层，可以把它换成完整路径。Terminal 提示符通常只显示最后一级文件夹名，两层同名目录看起来可能一样，要用下面的命令确认。

### 在分支上修改的完整流程

以下命令逐行执行，每行成功后再继续；如果报错，先处理当前错误。

第一步，按上一节进入本地仓库，检查完整路径：

```bash
pwd
git rev-parse --show-toplevel
```

`pwd` 显示当前目录，第二行显示 Git 仓库根目录。如果出现 `fatal: not a git repository`，说明还没进入有效的仓库；先按第 5 节的说明检查目录，再继续。

第二步，检查当前分支和本地改动：

```bash
git status
```

如果有上次未提交的改动，先在所属分支完成提交，再切换分支或拉取更新。

第三步，按本次任务选择一种分支操作。

**新建分支：先切到 `main` 并更新，再创建新分支。** 以 `update-docs` 为例：

```bash
git switch main
git pull --ff-only
git switch -c update-docs
```

这样新分支从更新后的 `main` 开始。`-c` 表示创建新分支，只在该本地分支还不存在时使用。`update-docs` 是示例，可以换成自己的名字或任务名，后面的命令也要使用同一个分支名。

**继续已有分支：先切到自己的分支。** 不再加 `-c`：

```bash
git switch update-docs
```

如果这个分支之前已经用 `git push -u origin update-docs` 上传并设置了远端对应分支，再执行：

```bash
git pull --ff-only
```

如果它只是本地新建、还没上传的分支，先跳过 `pull`，修改并提交后按第九步首次上传。`git pull` 更新的是当前分支，所以要先切换到目标分支；它不会自动把 `main` 的更新同步到你的个人分支。

`--ff-only` 表示只在可以直接接上远端新提交时更新。如果提示无法 fast-forward，先停下，请维护者检查双方的提交差异。

第四步，确认已经在正确分支上：

```bash
git branch --show-current
```

使用上面的示例时，应显示 `update-docs`。

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
git push -u origin update-docs
```

`-u` 会记住本地分支对应的远端分支。设置成功后，以后在这个分支上可直接用 `git push` 上传、用 `git pull --ff-only` 更新。

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

不用。首次获取已有项目时用 `git clone`；以后进入同一个本地仓库，在目标分支上用 `git pull --ff-only` 更新。

**为什么 `git switch`、`git branch` 或 `git pull` 都提示 `fatal: not a git repository`？**

这表示 Git 在当前目录及其父目录中找不到有效的仓库。常见原因是没有克隆项目，或者进入了仓库外面的文件夹。

例如，先手动建文件夹再克隆，可能形成这样的结构：

```text
文件夹名/                            ← 外层普通文件夹
└── 文件夹名/                        ← 内层 Git 仓库
    ├── .git/
    ├── index.html
    └── attachments/
```

Git 会向父目录查找仓库，不会自动进入子目录。以上情况如果当前已在外层，进入内层再检查；“文件夹名”换成内层的实际名称：

```bash
cd 文件夹名
git rev-parse --show-toplevel
git status
```

如果只有手动创建的文件夹或 GitHub 下载的 ZIP 解压文件，没有 Git 版本记录，应按第 4 节重新克隆到一个未占用的位置。不要为了消除这条报错在外层执行 `git init`；那会另建一个仓库，并不会让你进入原来的项目仓库。

**为什么提示 `a branch named 'update-docs' already exists`？**

说明这个本地分支已经建好了。继续使用时执行 `git switch update-docs`，不要再加 `-c`。

**为什么 `git pull` 提示 `There is no tracking information for the current branch`？**

说明当前分支还没有设置远端对应分支。如果是自己新建、尚未上传的分支，先修改并提交，再用 `git push -u origin update-docs` 首次上传；把 `update-docs` 换成实际分支名。如果 GitHub 上已有该分支，请维护者确认对应关系后再设置。

**我是不是每次都要重新生成网页链接？**

不用。GitHub Pages 的网址保持不变。你更新 `index.html` 后，同一个网址会显示新版内容。

**我改错了怎么办？**

GitHub 有历史版本。每次 commit 都是一份记录，可以查看旧版本，也可以恢复。

**为什么不能直接用 GitHub 密码 push？**

GitHub 已经不支持用账号密码做 Git 推送。现在一般用 SSH key 或 Personal Access Token。

**附件应该放 PDF 还是 Markdown？**

正在频繁修改的内容，优先用 Markdown 或 docx。定稿后再导出 PDF。

## 6. 给维护者的最小命令清单

以下按场景选用；每行成功后再继续。示例使用 `update-docs` 分支，换名时要保持前后一致。

首次获取项目：先进入想存放项目的文件夹，确认还没有同名目标文件夹，再执行。把“仓库网址”和“文件夹名”换成实际克隆地址和克隆生成的文件夹名称：

```bash
git clone 仓库网址
cd 文件夹名
```

已有本地仓库：从仓库的上一层进入包含 `.git` 的文件夹并检查。把“文件夹名”换成实际名称；有两层同名文件夹时，要进入内层：

```bash
cd 文件夹名
git rev-parse --show-toplevel
git status
```

从最新的 `main` 新建分支（工作区没有未提交改动、该本地分支尚不存在时）：

```bash
git switch main
git pull --ff-only
git switch -c update-docs
git branch --show-current
```

继续已有分支，先切换：

```bash
git switch update-docs
```

只有该分支已设置远端对应分支时，再更新：

```bash
git pull --ff-only
```

修改完成后，提交首页和附件更新（只改首页时，`git add` 后只写 `index.html`）：

```bash
git status
git add index.html attachments
git commit -m "Update teaching plan and attachments"
```

首次上传当前分支并设置远端对应分支：

```bash
git push -u origin update-docs
```

以后在同一分支上提交新改动后，直接上传：

```bash
git push
```
