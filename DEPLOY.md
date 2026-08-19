# 🚀 投喂站 · Railway 免费层部署指南

> 适用对象：让朋友在互联网上能访问你的投喂站
> 部署平台：Railway（免费层，$0/月，不绑卡）
> 总耗时：约 10-15 分钟

---

## 🎁 Railway 免费层是什么？

Railway 是一个支持 Node.js、数据库、持久卷的云平台，开箱即用。

**2026 年的免费政策**（重要）：
- 注册就送 **$5 试用信用**（30 天有效）
- 试用结束后，进 **Free 计划**：**每月 $0**，但给你 **$1/月** 信用额度（小项目刚好够）
- 完全 **不绑卡**
- **支持持久卷**（数据不会丢！）

对投喂站来说：30 天试用期间完全免费；之后也能基本免费撑住（一个轻量 Node 服务每月约 $0.80，$1 信用刚好覆盖）。

**注意**：试用结束后如果访问量突增导致用量超过 $1，会被暂停服务（不会扣钱），第二个月重新计费。所以非常安全。

---

## 📋 部署前自检清单

- [ ] 你有 GitHub 账号（之前你做过 Narya 项目应该有）
- [ ] 项目代码在 `feed-station/` 目录，已 git 初始化
- [ ] 网页可访问，浏览器能开 localhost:3789 测试

---

## 🪜 详细步骤

### 第 1 步：把代码推到 GitHub（5 分钟）

**方式 A（推荐，不熟 git 命令）**：用 GitHub 网页上传

1. 打开 https://github.com/new 建新仓库
   - 仓库名：`feed-station`
   - 选 **Public**（这样 Railway 能免费导入）
   - **不要勾选** "Add a README file" / "Add .gitignore"
   - 点 **Create repository**

2. 创建完会跳到一个提示页面，找「uploading an existing file」链接
   - 用 Finder 打开 `/Users/huangxin/WorkBuddy/2026-08-18-15-18-22/feed-station`
   - **全选这个文件夹里的所有文件和文件夹**（包括隐藏的 `.gitignore`）
   - 拖到 GitHub 上传区
   - 页面底部点 **Commit changes**

3. 验证：刷新仓库页面，应该能看到 6 个文件 + 1 个 `public/` 文件夹

**方式 B（会用 git 命令）**：

```bash
cd /Users/huangxin/WorkBuddy/2026-08-18-15-18-22/feed-station
# GitHub 上建好空仓库后：
git remote add origin https://github.com/你的用户名/feed-station.git
git branch -M main
git push -u origin main
```

✅ **第 1 步完成标志**：GitHub 仓库页能看到代码

---

### 第 2 步：Railway 注册 + 导入项目（3 分钟）

1. 打开 https://railway.com
2. 点 **Login** → **Login with GitHub**（用你刚推代码的 GitHub 账号）
3. 第一次登录会问要不要同步所有仓库权限——选 **All repositories** 或至少授权刚建的 `feed-station` 仓库
4. 进入 Dashboard 后点 **New Project** → **Deploy from GitHub repo**
5. 在仓库列表里找到 `feed-station`，点它
6. Railway 会自动识别为 Node.js 项目（有 package.json），自动开始构建
7. 构建过程你会看到 **"Building" → "Deploying"** 两步

⚠️ **构建出来会发现服务启动失败！** 因为我们还没配环境变量和数据卷。正常，往下走。

✅ **第 2 步完成标志**：项目卡在了部署中（红点或黄点），不要紧，继续下一步

---

### 第 3 步：挂持久卷 + 配环境变量（3 分钟）

这一步是**关键中的关键**，不挂卷数据会丢。

#### 3.1 添加持久卷

1. 在项目画布上点你的服务卡片（中间那个）
2. 切到 **「Variables」** 标签页，**保持打开**（后面用）
3. 切到 **「Settings」** 标签页
4. 往下滚找到 **「Volumes」** 区域
5. 点 **+ Add Volume** 添加 2 个卷：
   - 第 1 个：
     - Mount Path 填：`/data`
   - 第 2 个：
     - Mount Path 填：`/uploads`

#### 3.2 添加环境变量（防数据丢的第二步！）

回到 **Variables** 标签页，点 **+ New Variable**，添加 4 个：

| Name | Value | 作用 |
|---|---|---|
| `DATA_DIR` | `/data` | 让 server.js 把数据写到挂载好的卷里 |
| `UPLOAD_DIR` | `/uploads` | 让图片上传写到挂载好的卷里 |
| `TOKEN_SECRET` | 随便一段长字符串（如 `myfeedstation123abc`） | 可选，留给将来扩展 |
| ~~`PORT`~~ | ~~Railway 会自动注入，不用填~~ | Railway 自带 PORT 环境变量 |

#### 3.3 重新部署

回到项目画布 → 点你的服务 → 顶部点 **「Deploy」** 按钮（或自动触发）

你会看到：
- 「Building」→「Deploying」→「Success」绿点
- 服务日志里出现 `🍳 投喂站服务已启动 → http://0.0.0.0:3789`

✅ **第 3 步完成标志**：服务变绿色 + 日志里看到启动成功

---

### 第 4 步：拿到网址，部署完成！（1 分钟）

1. 在你的服务卡片上点 **「Settings」** → **「Networking」**
2. 点 **「Generate Domain」** 按钮
3. Railway 会给你一个网址，类似 `https://feed-station-production.up.railway.app`
4. 在浏览器里打开这个链接——**就是你的投喂站上线版本！**

✅ **第 4 步完成标志**：浏览器里看到熟悉的奶油色投喂站界面

---

### 第 5 步：第一次注册，验证数据持久

1. 在线上的网址里注册一个新账号（比如 `派派`）
2. 立刻刷新页面、登出、再登录——账号还在
3. 给自己投喂一口 🥰

如果两个数据卷都正常挂载且环境变量设置正确，你的账号和数据会**永远在那里**。

---

## 🎯 完成后的玩法

- **邀请朋友**：
  - 你登录后，「我的投喂站」里能看到你的 6 位邀请码
  - 复制邀请码发给朋友（微信、QQ 都行）
  - 朋友打开网址 → 注册 → 输入你的邀请码加入
  - 你就能喂 ta 了 🫶

- **朋友互相投喂**：
  - 朋友之间也可以互加邀请码，形成"互喂圈"

- **分享网址**：把这个 Railway 链接发给任何朋友都行，永久有效

---

## ⚙️ 后续维护

### 修改代码后重新部署

```bash
cd feed-station
# 在网页上 git 修改
git add -A
git commit -m "你的修改说明"
git push   # Railway 会自动检测到并重新部署
```

或者直接在 GitHub 网页上编辑文件，Railway 也会自动重新部署。

### 查看日志

Railway 服务页 → **「Deployments」** → 选一个版本 → **「View Logs」**

### 数据备份（可选）

Railway 的卷是持久的，但官方不保证 100% 不丢数据。建议偶尔：
```bash
# 在项目画布上点服务 → 顶部点 ⋯ → "Open Shell"
# 在 Shell 里：
cat /data/db.json
# 把内容复制下来保存到本地
```

### 费用监控

Railway Dashboard → 左侧 **「Usage」** → 看当月用量，确保没超过 $1。

---

## 🆘 常见问题排查

| 问题 | 怎么排查 |
|---|---|
| 构建失败 "node: not found" | package.json 里 engines 写错，应该是 `>=18` 不是 `^18` |
| 服务起来了但页面打不开 | Settings → Networking 看有没有 Generate Domain |
| 数据看不见/丢数据 | 确认 Volumes 的 Mount Path 是 `/data` 和 `/uploads`，且环境变量 DATA_DIR/UPLOAD_DIR 也填了同样值 |
| 国内朋友打开很慢 | Railway 没有香港节点，新加坡节点已是最优。如要真香港，得换 Cloudflare Workers（要重写代码） |
| 截图在哪里 | Logs 标签页，部署失败的错误会详细列出来 |

---

## 📌 与之前 Zeabur 文档的差异

旧文档是 Zeabur 的（保留为历史参考）。**关键差异**：
- Railway 免费层**真免费到撑住**，Zeabur 改成付费了
- Railway 部署更简单（不用选供应商、不用绑卡）
- Railway 没有香港/新加坡专属节点，国内访问比 Zeabur 的 Aliyun 香港稍慢
- Railway 数据卷配置在 Settings → Volumes（与 Zeabur 路径不同）

---

🍳 **投喂站 happy deploying！** 部署过程中任何步骤卡住，把截图发我陪你点。
