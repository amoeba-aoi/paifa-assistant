# 排发助手

按期管理谷子库存、收货方按序登记、发货方一键排发的本地 Web 应用。

## 功能

- **发货方**：创建模块（哪一期谷子）、维护谷子库存、按排发顺序查看可排发名单并执行发货（扣库存 → 已清货）
- **收货方**：输入昵称进入（新昵称自动注册），登记排发内容（期次 / 谷子名 / 数量 / 排发顺序）

数据默认落在本地 `data/store.json`（JSON 文件存储，开箱即用）。**无需密码**，仅用昵称进入。

## 快速开始

```bash
npm install
cp .env.example .env.local   # 可选，不复制则使用下方默认昵称
npm run dev
```

开发服务默认监听 **http://127.0.0.1:43127**。

生产模式：

```bash
npm run build
npm run start
```

## 演示登录

| 角色 | 昵称 |
|------|------|
| 发货方 | `shipper`（或「发货方」） |
| 收货方 | 任意新昵称即可进入（自动注册）；已有昵称直接登录 |

环境变量：

- `SHIPPER_NICKNAME`（默认 `shipper`）
- `SHIPPER_CN`（默认 `发货方`，也可作为登录昵称）
- `SESSION_SECRET`（会话签名密钥）

## 推荐体验路径

1. 昵称 `shipper` 进入 → 创建模块「第1期」→ 添加库存（如「立牌」× 10）
2. 另开窗口输入新收货方昵称进入 → 登记同一期谷子与数量、设置排发顺序
3. 回到发货方「待排发」→ 库存足够时显示「可排发」→ 点「发货」
4. 库存扣减，该用户本模块登记进入「已清货」

## 技术栈

Next.js · TypeScript · Tailwind CSS · shadcn/ui · 本地 JSON 或 GitHub Gist 远程存储

## 部署（GitHub + Vercel）

正式仓库：https://github.com/amoeba-aoi/paifa-assistant

本地默认写 `data/store.json`。在 Vercel 等无持久磁盘环境需配置 Gist 存储：

1. 仓库已推送到 GitHub `main`  
2. Gist 文件名须为 `store.json`（生产已创建 id 见部署手记）  
3. 在 Vercel 设置环境变量：`SHIPPER_NICKNAME`、`SHIPPER_CN`、`SESSION_SECRET`、`STORE_GIST_ID`、`STORE_GITHUB_TOKEN`（需 gist 权限）  
4. Import 仓库部署，或 claim 临时部署以保留公网地址  

详见 Context `internal/deploy-handoff.md`。
