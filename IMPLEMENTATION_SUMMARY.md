# EasyPaper M1 实现总结

## 已完成的工作 ✅

### 1. 代码清理（保留框架，逐步迁移）
- ✅ 删除所有论文管理相关页面（PapersPage, AuthorsPage, PaperDetailPage, DataImportPage）
- ✅ 删除 algorithms/ 目录（Excel 相关）
- ✅ 删除旧的 store 文件（paper-store.ts, brand-store.ts）
- ✅ 简化 App.tsx 路由和 i18n.tsx 翻译文本
- ✅ 更新 breadcrumb 组件以适配新的数据结构

### 2. 新目录结构
```
app/src/
  modules/
    editor/
      MonacoEditor.tsx          ✅ Monaco 编辑器封装
      latex-config.ts           ✅ LaTeX 语言配置
    preview/
      KaTeXPreview.tsx          ✅ 即时预览组件
      PDFViewer.tsx             ✅ PDF 查看器
    project/
      FileTree.tsx              ✅ 文件树组件
    build/
      BuildPanel.tsx            ✅ 编译控制面板
  stores/
    project-store.ts            ✅ 项目状态管理
    editor-store.ts             ✅ 编辑器状态管理
  ipc/
    types.ts                    ✅ IPC 类型定义
    file-commands.ts            ✅ 文件操作封装
    build-commands.ts           ✅ 编译命令封装
    template-commands.ts        ✅ 模板命令封装
  pages/
    EditorPage.tsx              ✅ 主编辑器页面
    WelcomePage.tsx             ✅ 欢迎页面（含设置入口）
    SettingsPage.tsx            ✅ 设置页面
  lib/
    paths.ts                    ✅ 路径工具（默认位置检测）
```

### 3. Rust 后端服务
```
app/src-tauri/src/
  project.rs                    ✅ 项目配置解析（YAML）
  svc_file.rs                   ✅ 文件操作服务
  svc_build.rs                  ✅ 编译服务（Tectonic/latexmk）
  svc_template.rs               ✅ 模板服务（3个内置模板）
  lib.rs                        ✅ 命令注册
```

**实现的 IPC 命令：**
- `file_read`, `file_write`, `file_list`, `file_delete`, `file_rename`, `file_exists`, `create_dir`
- `build_compile`, `build_clean`
- `template_list`, `template_apply`, `template_get_content`

### 4. 内置模板
- ✅ **Article**: 基础 LaTeX article 模板
- ✅ **IEEE Conference**: IEEE 会议论文模板
- ✅ **ACM Article**: ACM 文章/会议模板

### 5. 核心功能
- ✅ **Monaco 编辑器**: LaTeX 语法高亮、自动保存（Cmd/Ctrl+S）
- ✅ **KaTeX 即时预览**: 实时渲染数学公式和简单排版（节流150ms）
- ✅ **PDF 查看器**: PDF.js 集成，页面导航、缩放
- ✅ **文件树**: 显示项目文件，支持点击打开
- ✅ **编译面板**: Tectonic/latexmk 编译、状态显示、Live/PDF 切换
- ✅ **项目创建**: 模板选择、目录创建、自动生成 .easypaper/project.yml
- ✅ **最近项目**: 持久化保存，快速访问
- ✅ **默认项目位置**: 智能检测 ~/Documents/EasyPaper，可在设置中自定义
- ✅ **设置页面**: 修改默认路径、重置为系统默认、实时预览

### 6. 构建状态
- ✅ **前端构建成功**: `npm run build` 通过，生成 dist/
- ⚠️ **Rust 后端**: 代码已完成，需要安装 Rust 工具链（见下文）

---

## 技术栈确认

### 前端
- React 19 + TypeScript
- Monaco Editor (@monaco-editor/react)
- KaTeX (数学公式渲染)
- PDF.js (PDF 查看)
- Zustand (状态管理)
- Tailwind CSS + Radix UI
- React Router v7

### 后端
- Tauri 2 (Rust 桌面框架)
- serde_yaml (项目配置解析)
- regex, walkdir (文件处理)

---

## ✨ 新增功能（基于用户反馈）

### 默认项目位置管理
- **智能检测**: 自动识别 `~/Documents/EasyPaper`（macOS/Linux）或 `C:\Users\[User]\Documents\EasyPaper`（Windows）
- **持久化存储**: 用户设置的默认位置保存到 localStorage
- **设置页面**:
  - 修改默认项目位置
  - 重置为系统默认
  - 实时预览完整路径
- **新建项目优化**:
  - 自动填充默认位置
  - 显示最终创建路径预览
  - 提示用户可在设置中修改

### UI 改进
- 欢迎页右上角添加设置按钮（⚙️ 图标）
- 新建项目对话框显示完整路径预览
- 添加友好的提示文本

---

## 下一步操作

### 1. 安装 Rust 工具链（必需）

如果尚未安装 Rust，请运行：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

验证安装：
```bash
cargo --version
rustc --version
```

### 2. 安装 Tectonic（推荐）

Tectonic 是默认的 LaTeX 编译引擎，无需完整 TeX 发行版：
```bash
# macOS
brew install tectonic

# 或通过 cargo
cargo install tectonic
```

验证安装：
```bash
tectonic --version
```

**备选方案**：如果不安装 Tectonic，可以使用系统 TeX（需要安装 MacTeX/TeX Live）：
```bash
# macOS
brew install --cask mactex-no-gui
```

### 3. 构建和运行应用

**开发模式**（推荐，支持热重载）：
```bash
cd app
npm run tauri dev
```

**生产构建**：
```bash
cd app
npm run tauri build
```

构建产物位于 `app/src-tauri/target/release/bundle/`。

### 4. 测试完整工作流

1. 启动应用
2. 点击"New Project"
3. 选择模板（Article/IEEE/ACM）
4. 指定项目名称和位置
5. 创建项目后进入编辑器
6. 编辑 main.tex
7. 查看 KaTeX 实时预览
8. 点击"Compile"按钮
9. 切换到 PDF 视图查看真实排版

---

## 已知限制与后续计划

### M1 范围内
- ✅ 基础编辑器 + 语法高亮
- ✅ KaTeX 即时预览
- ✅ Tectonic 编译 + PDF 预览
- ✅ 项目模板系统

### M2 计划（未实现）
- 增量编译优化
- Synctex 前后向定位
- BibTeX/Biber 支持与自动补全
- Git 基础集成

### M3+ 计划
- latexmk 回退引擎
- CJK/字体配置
- `\cite{}`/`\ref{}` 自动补全
- 错误日志高级解析

### M4-M5（AI 功能，延后）
- AI 审稿人
- 文献检索
- 文件归纳与批注

---

## 项目结构概览

```
EasyPaper/
├── app/                          # 主应用
│   ├── src/                      # React 前端
│   │   ├── modules/              # 功能模块
│   │   │   ├── editor/           # Monaco 编辑器
│   │   │   ├── preview/          # KaTeX + PDF.js
│   │   │   ├── project/          # 文件树
│   │   │   └── build/            # 编译面板
│   │   ├── stores/               # Zustand 状态管理
│   │   ├── ipc/                  # Tauri 命令封装
│   │   ├── pages/                # 页面组件
│   │   └── components/           # UI 组件库
│   ├── src-tauri/                # Tauri 后端（Rust）
│   │   ├── src/
│   │   │   ├── project.rs        # 项目配置
│   │   │   ├── svc_file.rs       # 文件服务
│   │   │   ├── svc_build.rs      # 编译服务
│   │   │   ├── svc_template.rs   # 模板服务
│   │   │   ├── lib.rs            # 主入口
│   │   │   └── main.rs           # 桌面主进程
│   │   └── Cargo.toml            # Rust 依赖
│   ├── dist/                     # 前端构建产物
│   └── package.json              # npm 依赖
├── templates/                    # 官方模板（待扩展）
└── docs/                         # 文档
```

---

## 关键配置文件

### project.yml（项目配置示例）
```yaml
version: 1
name: "My Paper"
main: "main.tex"
engine:
  type: "tectonic"        # 或 "latexmk"
  args: []
compile:
  synctex: true
  shell_escape: false
  outdir: "out"
  min_interval_ms: 600
```

### .easypaper/（项目元数据）
```
.easypaper/
  project.yml               # 项目配置
  state.json                # UI 状态（未实现）
  cache/                    # 编译缓存（未实现）
```

---

## 常见问题

### Q: 编译失败，提示 "tectonic: command not found"
**A**: 请安装 Tectonic：`brew install tectonic` 或 `cargo install tectonic`

### Q: PDF 无法显示
**A**:
1. 检查 `out/main.pdf` 是否生成
2. 查看编译错误日志
3. 确认 PDF.js worker 路径正确

### Q: Monaco 编辑器无法显示
**A**:
1. 检查浏览器控制台错误
2. 确认 `@monaco-editor/react` 安装成功
3. 尝试清除缓存：`npm run clean && npm install`

### Q: 文件树为空
**A**:
1. 检查项目路径权限
2. 确认 `.easypaper/project.yml` 存在
3. 查看控制台日志中的文件读取错误

---

## 开发者提示

### 调试模式
```bash
# 启用 Rust 日志
RUST_LOG=debug npm run tauri dev

# 前端开发服务器
npm run dev
```

### 热重载
- 前端代码修改会自动热重载
- Rust 代码修改需要重启 `tauri dev`

### 添加新的 IPC 命令
1. 在 `src-tauri/src/` 中添加命令函数（带 `#[tauri::command]`）
2. 在 `lib.rs` 的 `invoke_handler` 中注册
3. 在 `src/ipc/` 中添加 TypeScript 封装
4. 在组件中通过 `import { xxx } from "@/ipc"` 使用

---

## 贡献与扩展

### 添加新模板
1. 在 `svc_template.rs` 中添加常量字符串
2. 在 `template_list()` 中注册
3. 在 `template_apply()` 中处理

### 自定义编译引擎
1. 在 `svc_build.rs` 中添加 `compile_with_xxx()` 函数
2. 在 `build_compile()` 的 match 中添加分支
3. 更新 `project.yml` 的 `engine.type`

---

## 致谢

- **Tauri**: 跨平台桌面框架
- **Monaco Editor**: VS Code 编辑器核心
- **KaTeX**: 快速数学公式渲染
- **PDF.js**: Mozilla 的 PDF 渲染引擎
- **Tectonic**: 现代化 LaTeX 编译器

---

**构建时间**: 2025-10-25
**版本**: M1 (0.1.0)
**状态**: ✅ 前端就绪 | ⚠️ 需要安装 Rust 工具链

---

## 快速启动命令

```bash
# 1. 安装 Rust（如果尚未安装）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 安装 Tectonic
brew install tectonic

# 3. 安装前端依赖（已完成）
cd app
npm install

# 4. 启动开发服务器
npm run tauri dev

# 5. 开始使用！
```

祝编码愉快！🚀
