# 职镜 JDMirror — 产品需求文档 (PRD)

> **版本**: v1.0.0  
> **更新日期**: 2026-06-12  
> **产品类型**: Chrome 浏览器扩展 (Manifest V3)  
> **目标用户**: 应届毕业生、职场新人（0-3年经验）、转行求职者  

---

## 目录

1. [产品概述](#1-产品概述)
2. [用户画像与使用场景](#2-用户画像与使用场景)
3. [功能清单](#3-功能清单)
4. [技术架构](#4-技术架构)
5. [模块详细设计](#5-模块详细设计)
6. [数据流与状态管理](#6-数据流与状态管理)
7. [UI/UX 设计规范](#7-uiux-设计规范)
8. [安全设计](#8-安全设计)
9. [已知限制与待优化项](#9-已知限制与待优化项)
10. [迭代路线图](#10-迭代路线图)
11. [附录](#11-附录)

---

## 1. 产品概述

### 1.1 产品定位

**职镜 JDMirror** 是一款面向求职者的 Chrome 浏览器智能助手插件。它利用大语言模型（LLM）将招聘网站上晦涩的 JD（Job Description）"翻译"成通俗易懂的大白话，并结合用户简历进行匹配度分析，生成面试突击指南，帮助求职者精准评估岗位适配度、高效准备面试。

**Slogan**: 看清JD，照见自己

### 1.2 核心价值

| 痛点 | 解决方案 |
|------|----------|
| JD 充满行业"套话"，新人看不懂 | AI 将 JD 翻译成大白话，拆解为岗位职责、显性/隐性要求、日常工作、KPI |
| 不知道自己和岗位的差距在哪 | 多维度匹配分析，雷达图可视化，优势/不足一目了然 |
| 面试不知道从何准备 | 按优先级排列的突击指南，含具体学习内容和时间估算 |
| 简历格式多样，手动粘贴麻烦 | 支持 PDF/Word/TXT 直接上传解析，拖拽即用 |
| 分析结果无法保存复用 | 支持 HTML/Markdown 两种格式导出，文件名含岗位+日期+时间戳 |

### 1.3 产品边界

- **做**: JD 解读、简历匹配分析、面试突击建议、结果导出
- **不做**: 简历撰写/优化、职位推荐/搜索、投递管理、HR 沟通

---

## 2. 用户画像与使用场景

### 2.1 目标用户

| 画像 | 特征 | 核心需求 |
|------|------|----------|
| 应届毕业生 | 无工作经验，看不懂 JD 要求 | 理解岗位真实工作内容，判断自己是否适合 |
| 职场新人（1-3年） | 有基础经验，想跳槽/转行 | 评估匹配度，找到能力差距，针对性准备 |
| 转行求职者 | 有工作经验但跨行业 | 了解新行业的隐性要求和考核标准 |

### 2.2 典型使用场景

**场景一：海投前快速筛选**
> 用户在 BOSS 直聘浏览岗位 → 点击插件"照JD" → 看到 AI 解读的隐性要求（如"能承受较大工作压力=996"）→ 判断是否值得投递

**场景二：面试前深度准备**
> 用户已上传简历 → 打开目标岗位页面 → 点击"照自己" → 看到匹配度 68%、雷达图显示"数据分析"维度薄弱 → 查看突击指南"3天复习 pandas/numpy"→ 导出报告反复查看

**场景三：多岗位对比**
> 用户浏览多个岗位 → 逐个保存分析报告 → 对比不同岗位的 KPI、日常工作、隐性要求 → 做出投递决策

---

## 3. 功能清单

### 3.1 功能总览

```
职镜 JDMirror
├── 照JD（JD 解读）
│   ├── 自动提取网页 JD 文本
│   ├── 手动编辑 JD 文本
│   ├── AI 流式解读（6 大模块）
│   ├── 折叠面板展示（accordion）
│   ├── 可视化增强（KPI 卡片、时间线、语义色标）
│   └── 保存导出（HTML / Markdown）
│
├── 照自己（匹配分析）
│   ├── 简历上传（拖拽/点击，PDF/Word/TXT）
│   ├── 简历持久化存储
│   ├── AI 匹配分析（动态维度）
│   ├── 综合匹配度环形图（含动画）
│   ├── Canvas 雷达图（含动画）
│   ├── 维度进度条（色标分级）
│   ├── 优势/不足分析
│   ├── 面试突击指南（优先级色标）
│   └── 保存导出（HTML / Markdown，含 JD 解读）
│
├── 系统能力
│   ├── API Key 加密存储（AES-GCM + PBKDF2）
│   ├── 多模型支持（DeepSeek / 通义千问 / 智谱 GLM）
│   ├── 流式输出（SSE）
│   └── 错误处理与重试
│
└── 通用交互
    ├── 首页双入口（照JD / 照自己）
    ├── 底部简历状态指示
    └── 视图切换动画
```

### 3.2 功能详细矩阵

| 功能模块 | 功能点 | 状态 | 说明 |
|----------|--------|------|------|
| **JD 提取** | 通用选择器提取 | ✅ 已完成 | 30+ 种 class 模式匹配 |
| | 站点专用选择器 | ✅ 已完成 | BOSS直聘/猎聘/智联/拉勾/51job |
| | 不可见元素过滤 | ✅ 已完成 | display/visibility/opacity/clip/aria-hidden |
| | 文本后处理 | ✅ 已完成 | 超长行过滤、纯数字行过滤 |
| | 岗位名称提取 | ✅ 已完成 | document.title + 站点规则清洗 |
| | 短 JD 兼容 | ✅ 已完成 | 最低 30 字符阈值 |
| **JD 解读** | 流式渲染 | ✅ 已完成 | 80ms 节流刷新 |
| | 6 模块结构化输出 | ✅ 已完成 | 职责/显性要求/隐性要求/日常工作/KPI/总结 |
| | KPI 卡片可视化 | ✅ 已完成 | 百分比进度条 + 指标卡片 |
| | 时间线可视化 | ✅ 已完成 | 垂直时间线 + 时间点标记 |
| | 语义色标 | ✅ 已完成 | 6 种颜色对应不同模块类型 |
| | 折叠面板 | ✅ 已完成 | 默认展开首项，点击切换 |
| **简历管理** | PDF 解析 | ✅ 已完成 | pdf.js 逐页提取 |
| | DOCX 解析 | ✅ 已完成 | mammoth.js |
| | DOC 解析 | ✅ 已完成 | 二进制文本提取（含扩展模式） |
| | TXT 解析 | ✅ 已完成 | FileReader UTF-8 |
| | 拖拽上传 | ✅ 已完成 | dragover/drop 事件 |
| | 存储持久化 | ✅ 已完成 | Chrome Storage Local |
| **匹配分析** | 动态维度生成 | ✅ 已完成 | LLM 根据 JD 动态确定 5-6 个维度 |
| | 综合匹配度 | ✅ 已完成 | 0-100 环形图 + 评级标签 |
| | 雷达图 | ✅ 已完成 | Canvas 绘制 + easeOutCubic 动画 |
| | 维度进度条 | ✅ 已完成 | 红/黄/绿 三色分级 |
| | 优势/不足 | ✅ 已完成 | 列表展示 |
| | 突击指南 | ✅ 已完成 | 优先级色标 + 时间估算 |
| **导出** | HTML 报告 | ✅ 已完成 | 内联 CSS，含原始 JD + 解读 + 匹配 |
| | Markdown 报告 | ✅ 已完成 | 兼容 Notion/Obsidian |
| | 格式选择弹窗 | ✅ 已完成 | 双选项 + 取消 |
| | 智能文件名 | ✅ 已完成 | 岗位名_类型_日期_时间戳 |
| | 自动补全 JD 解读 | ✅ 已完成 | 匹配导出时若无 JD 解读则自动生成 |
| **安全** | API Key 加密 | ✅ 已完成 | AES-GCM + PBKDF2(100000轮) |
| | 默认 Key 预置 | ✅ 已完成 | 首次安装自动加密存储 |

---

## 4. 技术架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Extension                   │
│                                                     │
│  ┌──────────────┐   ┌──────────────────────────┐   │
│  │   popup/      │   │   content/                │   │
│  │   popup.html  │   │   content.js              │   │
│  │   popup.js    │◄──│   (JD 提取 + 岗位名)      │   │
│  │   popup.css   │   │                            │   │
│  │               │   └──────────────────────────┘   │
│  │  ┌─────────┐  │                                  │
│  │  │ utils/   │  │   ┌──────────────────────────┐   │
│  │  │ api.js   │──┼──►│  LLM API                  │   │
│  │  │ config.js│  │   │  (DeepSeek/通义千问/智谱) │   │
│  │  │ crypto.js│  │   └──────────────────────────┘   │
│  │  │ resume   │  │                                  │
│  │  │ Parser.js│  │   ┌──────────────────────────┐   │
│  │  │ radar    │  │   │  background/              │   │
│  │  │ Chart.js │  │   │  background.js            │   │
│  │  └─────────┘  │   │  (消息路由 + 存储操作)     │   │
│  └──────────────┘   └──────────┬─────────────────┘   │
│                                 │                      │
│                        ┌────────▼─────────┐           │
│                        │  Chrome Storage   │           │
│                        │  (简历/Key/设置)  │           │
│                        └──────────────────┘           │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  lib/                                         │    │
│  │  pdf.min.js / pdf.worker.min.js / mammoth.js │    │
│  │  jszip.min.js                                 │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 4.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 运行环境 | Chrome Extension Manifest V3 | 最新扩展规范 |
| UI 框架 | 原生 HTML/CSS/JS | 无框架依赖，轻量化 |
| 模块化 | ES Modules | `type="module"` |
| 加密 | Web Crypto API (AES-GCM + PBKDF2) | 浏览器原生，无需第三方 |
| PDF 解析 | pdf.js v3 | Mozilla 开源库 |
| Word 解析 | mammoth.js | DOCX → 纯文本 |
| 压缩解压 | JSZip | DOC 文件解析依赖 |
| 图表 | Canvas 2D API | 雷达图自绘，无图表库依赖 |
| LLM API | OpenAI 兼容格式 (SSE 流式) | DeepSeek / 通义千问 / 智谱 GLM |
| 存储 | Chrome Storage Local | 插件专用持久化存储 |

### 4.3 目录结构

```
jd_mirror/
├── manifest.json                  # 扩展清单 (Manifest V3)
├── PRD.md                         # 本文档
├── system_prompt_jd.md            # JD 分析系统提示词
├── system_prompt_resume.md        # 匹配分析系统提示词
├── icons/                         # 扩展图标 (16/48/128)
│   ├── icon16.png / icon16.svg
│   ├── icon48.png / icon48.svg
│   └── icon128.png / icon128.svg
├── src/
│   ├── background/
│   │   └── background.js          # Service Worker (消息路由/存储)
│   ├── content/
│   │   └── content.js             # Content Script (JD 提取)
│   ├── popup/
│   │   ├── popup.html             # Popup 页面结构
│   │   ├── popup.js               # Popup 核心逻辑 (~1314行)
│   │   └── popup.css              # 全部样式 (~800行)
│   ├── utils/
│   │   ├── config.js              # 全局配置 (API/提示词/常量)
│   │   ├── api.js                 # LLM API 调用 (SSE 流式)
│   │   ├── crypto.js              # 加密工具 (AES-GCM)
│   │   ├── resumeParser.js        # 简历解析 (PDF/DOCX/DOC/TXT)
│   │   └── radarChart.js          # Canvas 雷达图绘制
│   └── lib/                       # 第三方库
│       ├── pdf.min.js
│       ├── pdf.worker.min.js
│       ├── mammoth.browser.min.js
│       └── jszip.min.js
└── .trae/specs/                   # 开发规格文档
    └── jd-mirror-chrome-extension/
        ├── spec.md
        ├── checklist.md
        └── tasks.md
```

### 4.4 模块依赖关系

```
popup.js
  ├── config.js        (CONFIG 常量、SYSTEM_PROMPTS)
  ├── api.js           (callLLM)
  │     └── crypto.js  (decryptKey)
  ├── resumeParser.js  (parseResumeFile)
  ├── radarChart.js    (drawRadarChart)
  └── [Chrome APIs]    (tabs, storage, scripting)

content.js
  └── [独立运行，无内部依赖]

background.js
  ├── config.js        (CONFIG 常量)
  └── crypto.js        (encryptKey, decryptKey)
```

---

## 5. 模块详细设计

### 5.1 Content Script — JD 提取 (`src/content/content.js`)

**职责**: 从当前网页智能提取 JD 文本和岗位名称。

#### 5.1.1 站点检测

```javascript
detectSite() → 'zhipin' | 'liepin' | 'zhilian' | 'lagou' | 'wuyou' | 'generic'
```

通过 `window.location.href` 匹配域名关键字识别招聘平台。

#### 5.1.2 JD 提取策略（三级降级）

| 优先级 | 策略 | 说明 |
|--------|------|------|
| 1 | 站点专用选择器 | `SITE_SELECTORS[site]`，如 BOSS直聘的 `.job-sec-text` |
| 2 | 通用选择器 | 30+ 种 class 模式（`job-detail`, `jd-content` 等） |
| 3 | Body 兜底 | 克隆 body，移除 script/style/nav 等噪音元素后提取 |

#### 5.1.3 候选元素评分

```javascript
scoreElement(el) → number
```

- 强关键词（岗位职责、任职要求等）: +15
- 中关键词（岗位要求、职位要求等）: +8
- 弱关键词（薪资、学历、福利等）: +3
- class/id 正向匹配（job, detail, description 等）: +2
- class/id 噪音匹配（recommend, sidebar, comment 等）: -20
- 父元素噪音: -30
- 站点专用选择器命中: +30 bonus

#### 5.1.4 不可见元素过滤

```javascript
isElementVisible(el) → boolean
```

检查维度：
- `display: none`
- `visibility: hidden`
- `opacity: 0`
- `font-size: 0`
- 绝对定位且 left/top < -3000
- `clip: rect(0,0,0,0)` 或 `rect(1,1,1,1)`
- `overflow: hidden` 且宽高 ≤ 1
- 祖先元素 `aria-hidden="true"`

#### 5.1.5 BOSS直聘专项处理

```javascript
narrowToJdSection(el) → element
```

BOSS直聘的 JD 容器通常包含大量非 JD 内容。该函数在候选元素内查找包含"职位描述""岗位职责"等标题的子区域，缩小提取范围。

#### 5.1.6 文本后处理

```javascript
cleanText(text) → string
```

- 移除零宽字符 (`\u200B-\u200D\uFEFF`)
- 过滤超长无标点行（>300 字符且无中英文标点）
- 过滤纯数字/符号行
- 合并多余空行
- 截断至 8000 字符（优先在句号处截断）

#### 5.1.7 岗位名称提取

```javascript
getJobTitle() → string
```

从 `document.title` 提取，按站点规则清洗：
- BOSS直聘: 匹配 `(.+?)招聘` 模式
- 猎聘: 匹配 `【(.+?)】` 模式
- 智联: 移除 `-智联招聘` 后缀
- 通用: 移除招聘平台相关后缀
- 兜底: 查找页面 `<h1>` 标签

#### 5.1.8 消息接口

| Action | 请求 | 响应 |
|--------|------|------|
| `extractJD` | `{}` | `{ success, text, isJobPage }` |
| `getJobTitle` | `{}` | `{ success, title }` |

---

### 5.2 Popup 核心逻辑 (`src/popup/popup.js`)

**职责**: 所有 UI 交互、状态管理、LLM 调用编排、导出功能。

#### 5.2.1 状态管理

```javascript
const state = {
  currentView: 'home',        // 当前视图
  resumeUploaded: false,      // 简历是否已上传
  resumeText: '',             // 简历文本内容
  resumeFileName: '',         // 简历文件名
  jdText: '',                 // 原始 JD 文本
  jdResultHtml: '',           // JD 解读 Markdown 原文
  jobTitle: '',               // 岗位名称（从页面标题提取）
  currentUrl: '',             // 当前页面 URL
  matchResult: null,          // 匹配分析结果对象
  isLoading: false,           // 加载状态
  activeTab: 'match',         // 当前 Tab
  retryCallback: null         // 重试回调
};
```

#### 5.2.2 视图管理

```
home → jdResult (照JD)
home → resumeUpload (照自己-未上传)
home → resumeResult (照自己-已上传)
```

`switchView(viewName)` 控制四个视图的显示/隐藏，带 fadeIn 动画。

#### 5.2.3 JD 分析流程

```
用户点击"照JD"
  → extractJDText()                     # 通过 content script 提取 JD
    → fetchJobTitle()                   # 并行提取岗位名称
  → 切换到 jdResult 视图
  → 填充 textarea
  → showThinking()                      # 骨架屏
  → callLLM(SYSTEM_PROMPTS.JD_ANALYSIS) # 流式调用 LLM
    → throttleRenderJdStream()          # 80ms 节流渲染
      → parseMarkdownToAccordion()      # 解析 Markdown 为 section
      → renderAccordion()               # 渲染折叠面板
```

#### 5.2.4 匹配分析流程

```
用户点击"照自己"
  → 检查简历状态
  → extractJDText()                     # 提取 JD
  → 构建 userMessage = 【招聘JD】+【我的简历】
  → 切换到 resumeResult 视图
  → 显示思考动画
  → callLLM(SYSTEM_PROMPTS.RESUME_MATCH)# 流式调用 LLM
    → throttleRenderResumeStream()      # 150ms 节流
      → parseMatchResult()              # 解析 JSON
      → renderMatchResult()             # 渲染全部结果
```

#### 5.2.5 Markdown 解析

```javascript
parseMarkdownToAccordion(markdown) → sections[]
```

按 `###` / `##` 标题分割，每个 section 包含：
- `title`: 标题文本
- `type`: 'kpi' | 'daily' | 'normal'（自动检测）
- `content`: 格式化后的 HTML（normal 类型）
- `rawContent`: 原始文本（kpi/daily 类型，用于自定义渲染）
- `expanded`: 是否默认展开

#### 5.2.6 可视化渲染

**KPI 卡片** (`renderKpiSection`):
- 解析 `**指标名**: 说明` 格式
- 从说明中提取百分比数值
- 渲染为卡片 + 进度条

**时间线** (`renderTimelineSection`):
- 正则匹配 `HH:MM - HH:MM` 时间格式
- 渲染为垂直时间线（圆点 + 连线 + 时间段 + 描述）

**语义色标** (`getSectionColor`):
| 模块 | 颜色 | CSS Class |
|------|------|-----------|
| 岗位职责/工作内容 | 蓝色 | `accordion-item--blue` |
| 显性要求/硬性要求 | 青色 | `accordion-item--cyan` |
| 隐性要求/潜规则 | 琥珀色 | `accordion-item--amber` |
| 日常工作/时间线 | 绿色 | `accordion-item--green` |
| KPI/绩效考核 | 紫色 | `accordion-item--purple` |
| 一句话总结 | 石板色 | `accordion-item--slate` |

#### 5.2.7 匹配结果渲染

**综合匹配度环形图** (`renderScoreRing`):
- 使用 CSS `conic-gradient` 实现
- 动态颜色: `<40 红色 / 40-70 橙色 / ≥70 绿色`
- 评级标签: "差距较大" / "基本匹配" / "高度匹配"
- 数字滚动动画 (`animateScoreCountup`)

**雷达图** (`drawRadarChart`):
- Canvas 2D 绘制
- 支持 HiDPI (`devicePixelRatio`)
- easeOutCubic 入场动画 (800ms)
- 自动换行标签（超过 70px 宽度时折行）

**维度进度条** (`renderDimensions`):
- 三色分级: `≥70 绿色(high) / 50-69 黄色(medium) / <50 红色(low)`

**突击指南** (`renderInterviewPrep`):
- 优先级色标: 高(红) / 中(黄) / 低(绿)
- 列表项左边框颜色对应优先级

#### 5.2.8 导出功能

**触发流程**:
```
点击"保存"按钮 → showExportDialog(type)
  → 用户选择 HTML / Markdown
  → handleExport(format)
    → 若匹配导出且无 JD 解读 → 自动调用 LLM 生成
    → extractJobName() + getPageUrl()
    → generateFilename(岗位名, 类型, 日期, 时间戳)
    → buildHtmlReport() / buildMdReport()
    → Blob → URL.createObjectURL → <a download>
```

**HTML 报告结构**:
```
标题: {岗位名} - 分析报告
元信息: 生成时间 + 原始链接
📎 原始JD: (完整 JD 文本)
💡 JD解读: (6 个模块的折叠内容)
🎯 匹配分析: (综合匹配度 + 维度表格 + 优势/不足 + 突击指南)
页脚: 由 职镜JDMirror 生成
```

**Markdown 报告结构**: 同上，纯 Markdown 格式，兼容 Notion/Obsidian。

**文件命名规则**: `{岗位名}_{JD解读|匹配分析}_{YYYY-MM-DD}_{HHmm}.{html|md}`

---

### 5.3 LLM API 模块 (`src/utils/api.js`)

#### 5.3.1 API 调用

```javascript
callLLM(systemPrompt, userMessage, onChunk) → Promise<string>
```

- **格式**: OpenAI 兼容 `/v1/chat/completions`
- **模式**: 流式优先（SSE），失败回退非流式
- **超时**: 120 秒 AbortController
- **回调**: `onChunk(content, accumulated)` 每次收到新 token 时触发

#### 5.3.2 API Key 获取

```javascript
getApiKey() → Promise<string>
```

优先级: 加密存储 → 明文存储 → 默认 Key

#### 5.3.3 模型配置

```javascript
getApiConfig() → { baseUrl, model }
```

从 Chrome Storage 读取用户设置，回退到 `CONFIG` 默认值。

#### 5.3.4 支持的模型

| 模型 | baseUrl | model |
|------|---------|-------|
| DeepSeek (默认) | `https://api.deepseek.com` | `deepseek-v4-flash` |
| 通义千问 | `https://dashscope.aliyuncs.com` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn` | `glm-4-flash` |

---

### 5.4 加密模块 (`src/utils/crypto.js`)

#### 5.4.1 加密方案

```
AES-GCM (256-bit) + PBKDF2 (100,000 轮, SHA-256)
```

#### 5.4.2 数据结构

```
[ salt (16 bytes) | iv (12 bytes) | ciphertext (variable) ]
       ↓                ↓                ↓
  随机生成         随机生成        AES-GCM 加密结果
```

#### 5.4.3 接口

```javascript
encryptKey(plainKey) → Promise<base64>
decryptKey(encryptedData) → Promise<string>
```

---

### 5.5 简历解析模块 (`src/utils/resumeParser.js`)

#### 5.5.1 支持的格式

| 格式 | 解析方式 | 依赖库 |
|------|----------|--------|
| `.txt` | FileReader UTF-8 | 无 |
| `.pdf` | pdf.js 逐页提取文本 | pdf.min.js |
| `.docx` | mammoth.js 提取原始文本 | mammoth.browser.min.js |
| `.doc` | 二进制文本提取（ASCII + 扩展 Latin-1） | jszip.min.js |

#### 5.5.2 限制

- 文件大小: ≤ 5MB
- PDF 扫描件（纯图片）无法提取文本
- `.doc` 旧格式为尽力解析，建议用户转换为 `.docx`

#### 5.5.3 接口

```javascript
parseResumeFile(file) → Promise<string>
```

---

### 5.6 雷达图模块 (`src/utils/radarChart.js`)

#### 5.6.1 接口

```javascript
drawRadarChart(canvas, dimensions, options)
```

#### 5.6.2 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dimensions` | `[{label, score}]` | 必填 | 维度数据 |
| `options.width` | number | 340 | 显示宽度 |
| `options.height` | number | 300 | 显示高度 |
| `options.maxValue` | number | 100 | 最大值 |
| `options.levels` | number | 5 | 网格层数 |
| `options.animation` | boolean | true | 是否启用动画 |
| `options.animationDuration` | number | 800 | 动画时长(ms) |

#### 5.6.3 渲染特性

- HiDPI 支持（`devicePixelRatio` 缩放）
- 多层同心网格线
- 数据区域半透明填充
- 数据点白色描边圆点
- 标签自适应换行（>70px 宽度折行）
- 标签位置自适应（根据角度调整 textAlign）

---

### 5.7 Background Service Worker (`src/background/background.js`)

#### 5.7.1 职责

- 消息路由（popup ↔ background）
- 简历存储/读取/删除
- API Key 加密存储/解密读取
- 首次安装自动加密默认 API Key

#### 5.7.2 消息接口

| Action | Payload | Response |
|--------|---------|----------|
| `forwardApi` | `{url, options}` | API 响应 |
| `storeResume` | `{resumeData}` | `{success}` |
| `getResume` | — | `{success, data}` |
| `deleteResume` | — | `{success}` |
| `storeApiKey` | `{apiKey}` | `{success}` |
| `getApiKey` | — | `{success, data}` |
| `storeEncryptedKey` | `{keyData}` | `{success}` |
| `getDecryptedKey` | — | `{success, data}` |

---

### 5.8 配置模块 (`src/utils/config.js`)

#### 5.8.1 配置项总览

```javascript
CONFIG = {
  VERSION: '1.0.0',
  API_BASE_URL: 'https://api.deepseek.com',
  API_MODEL: 'deepseek-v4-flash',
  API_MAX_TOKENS: 10000,
  API_TEMPERATURE: 0.5,
  DEFAULT_API_KEY: 'sk-...',              // 预置默认 Key
  ALTERNATIVE_MODELS: { qwen, glm },      // 备选模型
  ENCRYPTION_SEED: '...',                 // PBKDF2 种子
  PBKDF2_ITERATIONS: 100000,
  KEY_LENGTH: 256,
  STORAGE_KEYS: { API_KEY, ENCRYPTED_API_KEY, ... },
  MAX_JD_LENGTH: 8000,
  MAX_RESUME_LENGTH: 15000,
  RESUME_MAX_SIZE: 5 * 1024 * 1024,       // 5MB
  SUPPORTED_RESUME_FORMATS: ['.pdf', '.docx', '.doc', '.txt'],
  POPUP_WIDTH: 400,
  POPUP_MAX_HEIGHT: 600,
  SYSTEM_PROMPTS: { JD_ANALYSIS, RESUME_MATCH },
  DEFAULT_SETTINGS: { model, autoExtract, language }
};
```

---

## 6. 数据流与状态管理

### 6.1 数据流图

```
┌──────────────────────────────────────────────────────────┐
│                      用户操作                              │
└────┬──────────────┬──────────────┬──────────────┬─────────┘
     │ 点击"照JD"   │ 上传简历      │ 点击"照自己"  │ 点击"保存"
     ▼              ▼              ▼              ▼
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ content  │   │ resume   │   │ content   │   │ build    │
│ script   │   │ Parser   │   │ script    │   │ Html/Md  │
│ 提取JD   │   │ 解析文件  │   │ 提取JD    │   │ Report   │
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ callLLM │   │ Chrome   │   │ callLLM  │   │ Blob     │
│ JD分析  │   │ Storage  │   │ 匹配分析  │   │ Download │
└────┬─────┘   └──────────┘   └────┬─────┘   └──────────┘
     │                              │
     ▼                              ▼
┌─────────┐                   ┌──────────┐
│ render  │                   │ render   │
│ Accord- │                   │ Match    │
│ ion     │                   │ Result   │
└─────────┘                   └──────────┘
```

### 6.2 存储键值

| Key | 类型 | 内容 |
|-----|------|------|
| `jd_mirror_encrypted_api_key` | base64 string | AES-GCM 加密的 API Key |
| `jd_mirror_api_key` | string | 明文 API Key（兼容旧版） |
| `jd_mirror_encryption_key` | any | 加密密钥数据 |
| `jd_mirror_resume` | object | `{ text, fileName, uploadedAt }` |
| `jd_mirror_model` | string | 用户选择的模型 |
| `jd_mirror_settings` | object | 用户设置 |

### 6.3 状态生命周期

```
简历状态:
  null → 上传成功 → 存储到 Chrome Storage → state.resumeUploaded = true
  更换简历 → 清除旧数据 → 重新上传 → 更新 Storage

JD 状态:
  每次打开 popup 重新提取 → state.jdText 更新
  JD 解读结果 → state.jdResultHtml 缓存（用于导出）

匹配结果:
  每次分析重新生成 → state.matchResult 更新
```

---

## 7. UI/UX 设计规范

### 7.1 设计系统

#### 色彩

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-primary` | `#1a73e8` | 主色调、链接、JD 按钮 |
| `--color-success` | `#1e8e3e` | 成功、高分、简历按钮 |
| `--color-warning` | `#f9ab00` | 警告、中等分数 |
| `--color-danger` | `#ea4335` | 错误、低分 |
| `--color-bg` | `#f8f9fa` | 页面背景 |
| `--color-card` | `#ffffff` | 卡片背景 |
| `--color-text` | `#202124` | 主文字 |
| `--color-text-secondary` | `#5f6368` | 次要文字 |
| `--color-text-muted` | `#9aa0a6` | 辅助文字 |
| `--color-border` | `#e0e0e0` | 边框 |

#### 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-xs` | 4px | 小元素 |
| `--radius-sm` | 6px | 按钮 |
| `--radius-md` | 10px | 卡片 |
| `--radius-lg` | 14px | 大卡片 |
| `--radius-xl` | 20px | 弹窗 |
| `--radius-full` | 50% | 圆形元素 |

#### 阴影

| Token | 值 |
|-------|-----|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` |

#### 动画

| Token | 值 | 用途 |
|-------|-----|------|
| `--transition-fast` | 0.15s ease | 微交互 |
| `--transition-normal` | 0.25s ease | 常规过渡 |
| `--transition-slow` | 0.35s ease | 大区域过渡 |

### 7.2 页面尺寸

- Popup 宽度: **400px**（固定）
- Popup 最大高度: **600px**
- 最小高度: **480px**
- 字体: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`

### 7.3 视图结构

```
┌──────────────────────────────┐
│  Header (渐变蓝背景)          │
│  [图标] 职镜JDMirror    [X]   │
│         看清JD，照见自己       │
├──────────────────────────────┤
│                              │
│  Main Content (可滚动)        │
│  ┌────────────────────────┐  │
│  │ 视图区域                │  │
│  │ (home/jdResult/        │  │
│  │  resumeUpload/         │  │
│  │  resumeResult)         │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  Footer (仅首页显示)          │
│  ● 未上传简历 / ● 简历已上传  │
└──────────────────────────────┘
```

### 7.4 交互细节

- **视图切换**: fadeIn 动画（opacity + translateY）
- **加载状态**: 全屏遮罩 + 旋转 spinner + "AI正在分析中..."
- **流式渲染**: JD 解读 80ms 节流刷新，匹配分析 150ms 节流
- **折叠面板**: 点击标题展开/收起，maxHeight 动画过渡
- **导出弹窗**: 居中弹出 + 背景遮罩 + dialogIn 动画
- **拖拽上传**: dragover 时上传区域高亮
- **错误提示**: 红色背景框 + 错误信息 + 重试按钮

---

## 8. 安全设计

### 8.1 API Key 保护

| 层级 | 措施 |
|------|------|
| 存储 | AES-GCM 256-bit 加密，salt + IV 随机生成 |
| 密钥派生 | PBKDF2 100,000 轮迭代，SHA-256 |
| 传输 | HTTPS 仅限（`host_permissions` 白名单） |
| 内存 | 解密后仅在调用期间存在于内存，不持久化明文 |

### 8.2 权限最小化

```json
{
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": [
    "https://api.deepseek.com/*",
    "https://dashscope.aliyuncs.com/*",
    "https://open.bigmodel.cn/*"
  ]
}
```

- `activeTab`: 仅在用户点击插件时获得当前标签页访问权
- `storage`: 用于持久化简历和设置
- `scripting`: 用于动态注入 content script
- `host_permissions`: 仅限三个 LLM API 域名

### 8.3 CSP 策略

```json
{
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

- 禁止内联脚本
- 禁止外部脚本加载
- `wasm-unsafe-eval` 为 pdf.js 的 WebAssembly 需求

---

## 9. 已知限制与待优化项

### 9.1 已知限制

| 限制 | 影响 | 可能方案 |
|------|------|----------|
| PDF 扫描件无法解析 | 图片型 PDF 简历无法提取文本 | 集成 OCR 服务（成本高）或提示用户使用可编辑 PDF |
| `.doc` 格式解析不完善 | 旧版 Word 可能提取不完整 | 引导用户转换为 `.docx` |
| 部分网站 JD 提取不完整 | 非主流招聘网站或动态加载页面 | 持续扩充站点选择器，支持 Shadow DOM |
| Popup 关闭后状态丢失 | 切换标签页后需重新分析 | 将分析结果缓存到 Chrome Storage |
| 单次只能分析一个 JD | 无法批量对比 | 后续支持多 Tab 分析历史 |
| 无离线能力 | 完全依赖 LLM API | 考虑本地小模型（长远） |

### 9.2 代码层面待优化

| 项目 | 说明 |
|------|------|
| popup.js 过长 | 1314 行单文件，建议拆分为视图模块、渲染模块、导出模块 |
| 缺少单元测试 | 核心逻辑（Markdown 解析、JSON 解析、文本清洗）无测试覆盖 |
| 错误处理可细化 | 当前部分 catch 块仅 console.error，用户提示不够精确 |
| CSS 组织 | 约 800 行单文件，可按组件拆分 |

---

## 10. 迭代路线图

### v1.1 — 体验优化

- [ ] Popup 状态持久化（关闭后恢复分析结果）
- [ ] 分析历史记录（最近 10 条）
- [ ] 多 JD 对比视图
- [ ] 暗色模式支持
- [ ] 快捷键支持

### v1.2 — 分析增强

- [ ] 薪资行情参考（集成公开数据）
- [ ] 公司评价/面试经验聚合
- [ ] 技能差距学习路径推荐
- [ ] 简历优化建议（基于 JD 匹配结果）

### v1.3 — 平台扩展

- [ ] Edge 浏览器支持
- [ ] Firefox 浏览器支持
- [ ] 多语言 JD 支持（英文 JD 解读）
- [ ] 团队协作（分享分析报告）

### v2.0 — 智能化

- [ ] 用户画像积累（多次分析学习用户背景）
- [ ] 智能岗位推荐
- [ ] 面试模拟对话
- [ ] 本地小模型支持（离线场景）

---

## 11. 附录

### 11.1 系统提示词概要

#### JD 分析提示词 (`system_prompt_jd.md`)

- **角色**: 资深职业规划师和招聘专家（10年+经验）
- **目标用户**: 应届毕业生和职场新人
- **输出**: 6 个 Markdown 模块（岗位职责、显性要求、隐性要求、常见日常工作、典型KPI、一句话总结）
- **风格**: 口语化、诚实直接、适当幽默、全部中文

#### 匹配分析提示词 (`system_prompt_resume.md`)

- **角色**: 资深 HR 和职业顾问
- **输入**: `【招聘JD】` + `【我的简历】`
- **输出**: 严格 JSON 格式
  - `overallScore`: 0-100 综合匹配度
  - `dimensions`: 5-6 个动态维度（名称从 JD 提取）
  - `strengths`: 2-4 条优势
  - `weaknesses`: 2-4 条不足
  - `crashGuide`: 3-5 条突击建议（含优先级、主题、详情、时间估算）
- **原则**: 客观公正、建设性、全面覆盖、动态维度、评分有区分度

### 11.2 支持的招聘网站

| 网站 | 站点标识 | 专用选择器数量 | JD 提取质量 |
|------|----------|---------------|-------------|
| BOSS直聘 | `zhipin` | 5 | ⭐⭐⭐⭐ (含专项窄化) |
| 猎聘 | `liepin` | 7 | ⭐⭐⭐ |
| 智联招聘 | `zhilian` | 5 | ⭐⭐⭐⭐ |
| 拉勾 | `lagou` | 3 | ⭐⭐⭐ |
| 51job | `wuyou` | 3 | ⭐⭐⭐ |
| 其他 | `generic` | 30+ 通用 | ⭐⭐ |

### 11.3 文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/popup/popup.js` | 1314 | 核心业务逻辑 |
| `src/popup/popup.css` | ~800 | 全部样式 |
| `src/popup/popup.html` | 259 | 页面结构 |
| `src/content/content.js` | 443 | JD 提取 |
| `src/utils/api.js` | 173 | LLM API |
| `src/utils/config.js` | 105 | 全局配置 |
| `src/utils/resumeParser.js` | 201 | 简历解析 |
| `src/utils/radarChart.js` | 169 | 雷达图 |
| `src/utils/crypto.js` | 98 | 加密工具 |
| `src/background/background.js` | 181 | Service Worker |
| `manifest.json` | 48 | 扩展清单 |

### 11.4 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-06-12 | v1.0.0 | 初始 PRD 文档，记录当前全部功能 |

---

> **文档维护**: 本文档随产品迭代持续更新。重大功能变更后请同步更新对应章节。
