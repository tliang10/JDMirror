# 职镜 JDMirror Chrome 浏览器插件 Spec

## Why
应届生、转行人群和在校大学生往往看不懂招聘 JD 中的"套话"，不清楚岗位到底做什么、需要什么能力，也无法快速判断自己与岗位的匹配度。职镜 JDMirror 通过大模型将 JD "翻译"成人话，并结合用户简历给出匹配度分析和面试突击指南，帮助用户精准定位目标岗位。

## What Changes
- 新建一个完整的 Chrome 浏览器插件（Manifest V3）
- 实现"照JD"功能：提取网页 JD → 大模型翻译 → 结构化展示
- 实现"照自己"功能：简历上传/解析 + JD 匹配分析 + 雷达图 + 突击指南
- 插件图标根据"镜子+JD"概念创作
- 大模型 API Key 加密存储在 Chrome Storage 中
- 系统提示词分别保存在 `system_prompt_jd.md` 和 `system_prompt_resume.md`

## Impact
- Affected specs: 无（全新项目）
- Affected code: 全新项目，包含 popup.html、popup.js、background.js、content.js、manifest.json 等

## ADDED Requirements

### Requirement: 插件基础框架
系统 SHALL 基于 Chrome Manifest V3 构建浏览器插件，包含 popup 页面、content script 和 background service worker。

#### Scenario: 点击插件图标弹出操作页
- **WHEN** 用户点击浏览器工具栏中的插件图标
- **THEN** 弹出 popup 页面，页面宽度 400px，高度自适应（最大 600px）
- **AND** 页面顶部显示插件名称"职镜 JDMirror"及副标题"看清JD，照见自己"

#### Scenario: 插件图标
- **WHEN** 插件安装完成
- **THEN** 浏览器工具栏显示插件图标（16x16、48x48、128x128 三尺寸）
- **AND** 图标设计体现"镜子+JD"概念，风格简洁专业

### Requirement: 照JD — JD翻译与结构化分析
系统 SHALL 提取当前网页中的 JD 文本，调用大模型 API 将 JD 翻译为结构化信息并展示。

#### Scenario: 用户点击"照JD"按钮
- **WHEN** 用户在 popup 页面点击"照JD"按钮
- **THEN** 插件通过 content script 提取当前网页中的文本内容
- **AND** 将提取的文本与 `system_prompt_jd.md` 中的系统提示词拼接
- **AND** 调用大模型 API 进行分析
- **AND** 展示加载动画（骨架屏或旋转图标）
- **AND** API 返回后，将结果渲染在 popup 页面中

#### Scenario: JD 分析结果展示
- **WHEN** 大模型 API 返回 JD 分析结果
- **THEN** 结果包含以下结构化信息：
  - **岗位职责**：这个岗位日常做什么
  - **显性要求**：JD 中明确写出的硬性要求
  - **隐性要求**：JD 中暗示但未明说的要求
  - **常见日常工作**：该岗位典型的一天
  - **典型 KPI**：该岗位通常如何考核
  - **一句话总结**：用大白话概括这个岗位
- **AND** 每项信息以折叠面板（accordion）形式展示，默认展开第一项

#### Scenario: 当前页面无 JD 内容
- **WHEN** 提取的网页文本中无法识别出 JD 相关内容
- **THEN** 显示提示："当前页面未检测到 JD 内容，请打开一个招聘页面后重试"

#### Scenario: API 调用失败
- **WHEN** 大模型 API 调用失败（网络错误、Key 无效、配额不足等）
- **THEN** 显示友好的错误提示，区分不同错误类型
- **AND** 提供"重试"按钮

### Requirement: 照自己 — 简历上传与匹配分析
系统 SHALL 支持用户上传简历文件，结合 JD 内容分析匹配度并生成雷达图和突击指南。

#### Scenario: 用户首次点击"照自己"（未上传简历）
- **WHEN** 用户点击"照自己"按钮且尚未上传简历
- **THEN** 展示简历上传区域，支持拖拽或点击上传
- **AND** 支持的文件格式：PDF、DOCX、TXT
- **AND** 文件大小限制：不超过 5MB
- **AND** 上传后在前端解析简历文本并存储在 Chrome Storage 中

#### Scenario: 用户已上传简历后点击"照自己"
- **WHEN** 用户点击"照自己"按钮且已有简历
- **THEN** 提取当前网页 JD 文本
- **AND** 将 JD 文本、简历文本、`system_prompt_resume.md` 中的系统提示词拼接
- **AND** 调用大模型 API 进行匹配分析
- **AND** 展示加载动画
- **AND** API 返回后渲染结果

#### Scenario: 匹配分析结果展示
- **WHEN** 大模型 API 返回匹配分析结果
- **THEN** 结果包含以下内容：
  - **综合匹配度**：一个百分比数值（如 75%）
  - **能力匹配雷达图**：使用 Canvas/SVG 绘制六维度雷达图，维度根据 JD 要求动态拆分（如：Python 编程、数据分析、项目管理、沟通表达、SQL、行业知识等，由模型根据具体 JD 决定 5-6 个具体维度）
  - **各维度详细分析**：每个维度的得分（0-100）及评语
  - **优势分析**：你的简历在哪些方面突出
  - **不足分析**：与 JD 相比的差距
  - **面试前突击指南**：按优先级排列的突击准备建议（含具体学习资源或准备方向）

#### Scenario: 用户更换简历
- **WHEN** 用户点击"更换简历"按钮
- **THEN** 清除已存储的简历数据
- **AND** 重新展示上传区域

#### Scenario: 简历解析失败
- **WHEN** 上传的文件无法解析（损坏、格式不支持、内容为空）
- **THEN** 显示错误提示："简历解析失败，请检查文件格式后重试"
- **AND** 支持的文件格式提示

### Requirement: 大模型 API 集成
系统 SHALL 集成国内大模型 API，支持流式输出，API Key 加密存储。

#### Scenario: API 调用配置
- **WHEN** 系统调用大模型 API
- **THEN** 使用 OpenAI 兼容的 API 格式（支持 DeepSeek、通义千问、智谱等国内模型）
- **AND** API 地址和 Key 在配置文件中预设，用户无需自行配置
- **AND** 支持流式输出（SSE），结果逐步展示

#### Scenario: API Key 加密存储
- **WHEN** 插件首次安装或更新配置
- **THEN** API Key 使用 Web Crypto API（AES-GCM）加密后存储在 Chrome Storage Sync 中
- **AND** 加密密钥使用 PBKDF2 从固定种子派生
- **AND** 每次调用 API 时从 Storage 中解密后使用

#### Scenario: 模型选择
- **WHEN** 系统调用大模型
- **THEN** 默认使用 DeepSeek V3 或同等水平模型
- **AND** 支持在配置中切换模型

### Requirement: 系统提示词管理
系统 SHALL 维护两套系统提示词文件，分别用于 JD 分析和简历匹配分析。

#### Scenario: JD 分析提示词
- **WHEN** 执行"照JD"功能
- **THEN** 读取 `system_prompt_jd.md` 中的提示词作为系统消息
- **AND** 提示词指导模型输出结构化的 JD 分析结果
- **AND** 提示词要求模型使用中文回复

#### Scenario: 简历匹配提示词
- **WHEN** 执行"照自己"功能
- **THEN** 读取 `system_prompt_resume.md` 中的提示词作为系统消息
- **AND** 提示词指导模型输出包含评分、雷达图数据、分析的 JSON 结构
- **AND** 雷达图维度由模型根据 JD 和简历动态确定（5-6 个具体维度，如"Python 编程""项目管理"等）

### Requirement: 用户界面与交互
系统 SHALL 提供美观、易用的 popup 页面界面。

#### Scenario: 主页布局
- **WHEN** popup 页面打开
- **THEN** 页面包含：
  - 顶部：插件名称、副标题、设置图标
  - 中部：两个主按钮"照JD"和"照自己"（大按钮，带图标和简短说明）
  - 底部：简历状态指示（已上传/未上传）

#### Scenario: 结果页导航
- **WHEN** 用户在结果页面
- **THEN** 顶部显示"返回"按钮，可回到主页
- **AND** 对于"照自己"结果页，提供"JD分析"和"匹配分析"两个 Tab 切换

#### Scenario: 加载状态
- **WHEN** API 调用进行中
- **THEN** 显示骨架屏加载动画
- **AND** 显示"AI 正在分析中..."的提示文字
- **AND** 流式输出时，内容逐步显示

#### Scenario: 设置页面
- **WHEN** 用户点击设置图标
- **THEN** 进入设置页面，可查看/修改 API 地址和模型名称（高级选项）
- **AND** 可清除已上传的简历
- **AND** 可查看插件版本信息

### Requirement: JD 文本提取
系统 SHALL 从当前网页中智能提取 JD 文本内容。

#### Scenario: 自动提取网页内容
- **WHEN** 用户触发"照JD"或"照自己"
- **THEN** content script 提取当前页面的主要文本内容
- **AND** 优先提取职位描述相关区域（通过常见选择器如 `.job-detail`、`.jd-content`、`#jobDescription` 等）
- **AND** 如果无法定位 JD 区域，提取 body 内可见文本
- **AND** 对提取的文本做截断处理（最大 8000 字符），避免超出模型上下文

#### Scenario: 手动粘贴 JD
- **WHEN** 自动提取的 JD 内容不准确
- **THEN** 用户可在 popup 页面手动粘贴或编辑 JD 文本
- **AND** 提供一个文本框供用户修改
