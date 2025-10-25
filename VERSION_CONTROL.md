# 版本控制系统实现说明

## 概述

EasyPaper 需要实现一个类似 Git 的版本控制系统，用于跟踪用户的编辑历史和构建记录。

## 存储位置

所有版本控制数据存储在项目目录下的 `.easypaper` 目录中：

```
project/
├── .easypaper/
│   ├── config.json          # 版本控制配置
│   ├── commits/             # 提交记录
│   │   ├── {commit-id}.json # 每个提交的元数据
│   │   └── ...
│   └── snapshots/           # 文件快照
│       ├── {hash}/          # 按内容哈希存储
│       └── ...
├── main.tex
└── ...
```

## 后端需要实现的 IPC 命令

### 1. `version_init`

初始化项目的版本控制系统。

**参数：**
```rust
{
    "projectDir": string  // 项目目录路径
}
```

**功能：**
- 创建 `.easypaper` 目录（如果不存在）
- 创建 `commits/` 和 `snapshots/` 子目录
- 创建 `config.json` 配置文件

**返回：** `ApiResponse<void>`

---

### 2. `version_save`

用户保存文件时创建快照。

**参数：**
```rust
{
    "projectDir": string,  // 项目目录
    "filePath": string,    // 文件路径（相对于项目目录）
    "content": string      // 文件内容
}
```

**功能：**
1. 计算内容的 SHA-256 哈希
2. 如果快照不存在，保存到 `snapshots/{hash}/`
3. 创建一个 "save" 类型的提交记录
4. 记录时间戳、文件路径、内容哈希

**返回：** `ApiResponse<string>` - 提交 ID

**提交记录格式：**
```json
{
  "id": "uuid-v4",
  "type": "save",
  "timestamp": 1234567890,
  "files": [
    {
      "path": "main.tex",
      "hash": "sha256-hash"
    }
  ]
}
```

---

### 3. `version_commit`

编译时创建提交。

**参数：**
```rust
{
    "projectDir": string,
    "message": string,      // 提交信息（如 "Build successful (479ms)"）
    "buildSuccess": bool    // 构建是否成功
}
```

**功能：**
1. 扫描项目中所有相关文件（`.tex`, `.bib`, `.cls`, `.sty` 等）
2. 为每个文件创建快照（如果内容变化）
3. 创建一个 "compile" 类型的提交记录
4. 记录构建结果

**返回：** `ApiResponse<string>` - 提交 ID

**提交记录格式：**
```json
{
  "id": "uuid-v4",
  "type": "compile",
  "timestamp": 1234567890,
  "message": "Build successful (479ms)",
  "buildSuccess": true,
  "files": [
    {
      "path": "main.tex",
      "hash": "sha256-hash"
    },
    {
      "path": "sections/intro.tex",
      "hash": "sha256-hash"
    }
  ]
}
```

---

### 4. `version_history`

获取版本历史。

**参数：**
```rust
{
    "projectDir": string
}
```

**返回：** `ApiResponse<VersionHistory>`

```typescript
interface VersionHistory {
  commits: Array<{
    id: string
    timestamp: number
    message: string
    type: "save" | "compile"
    files: string[]
    buildSuccess?: boolean  // 仅 compile 类型有此字段
  }>
  currentCommit: string | null
}
```

---

### 5. `version_restore`

恢复到指定提交。

**参数：**
```rust
{
    "projectDir": string,
    "commitId": string
}
```

**功能：**
1. 读取指定提交的文件列表
2. 从快照恢复每个文件
3. 覆盖当前工作目录中的文件

**返回：** `ApiResponse<void>`

---

### 6. `version_diff`

获取当前状态与指定提交的差异。

**参数：**
```rust
{
    "projectDir": string,
    "commitId": string
}
```

**返回：** `ApiResponse<string>` - 差异文本（类似 git diff 格式）

---

## 实现细节

### 文件快照存储

使用内容寻址存储（Content-Addressable Storage）：

1. 计算文件内容的 SHA-256 哈希
2. 使用哈希值作为文件名存储：`.easypaper/snapshots/{hash[:2]}/{hash[2:]}`
3. 相同内容的文件只存储一次（去重）

### 提交记录

每个提交存储为 JSON 文件：`.easypaper/commits/{commit-id}.json`

### 配置文件

`.easypaper/config.json`:
```json
{
  "version": 1,
  "created": 1234567890,
  "lastCommit": "commit-id"
}
```

### 性能优化

1. 使用哈希值快速判断文件是否变化
2. 只保存变化的文件
3. 定期清理未引用的快照（垃圾回收）

## 前端集成状态

✅ 已完成：
- IPC 接口定义（`app/src/ipc/version-commands.ts`）
- 保存时自动创建快照
- 编译时自动创建提交
- 错误处理（后端未实现时优雅降级）

⏳ 待实现：
- 版本历史查看界面
- 版本恢复功能
- 差异对比界面

## 使用流程

1. **项目打开时**：自动调用 `version_init` 初始化版本控制
2. **用户保存文件（Ctrl+S）**：调用 `version_save` 创建快照
3. **用户编译项目**：
   - 先保存所有修改的文件
   - 调用 `buildCompile` 执行编译
   - 根据编译结果调用 `version_commit` 创建提交
4. **查看历史**：调用 `version_history` 获取提交列表
5. **恢复版本**：调用 `version_restore` 恢复到指定提交

## 注意事项

1. `.easypaper` 目录应该被 `.gitignore` 忽略（如果用户使用 Git）
2. 版本控制是可选功能，后端未实现时前端会优雅降级
3. 需要定期清理旧快照以节省磁盘空间
4. 提交历史建议保留最近 100 个提交，更早的可以压缩或删除
