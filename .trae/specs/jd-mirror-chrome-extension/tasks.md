# Tasks

- [x] Task 1: 项目基础结构搭建
  - [x] 创建 Manifest V3 的 `manifest.json`，声明 popup、content script、background service worker、storage 权限
  - [x] 创建项目目录结构（icons/、src/、lib/ 等）
  - [x] 创建 popup.html 基础骨架
  - [x] 创建 popup.js 入口文件
  - [x] 创建 content.js（网页文本提取）
  - [x] 创建 background.js（API 调用代理）

- [x] Task 2: 插件图标设计
  - [x] 设计并生成 16x16、48x48、128x128 三种尺寸的图标
  - [x] 图标主题：镜子 + JD 概念，简洁专业风格

- [x] Task 3: 大模型 API 集成模块
  - [x] 实现 API Key 加密存储（Web Crypto API AES-GCM + PBKDF2）
  - [x] 实现 API 调用模块（OpenAI 兼容格式，支持流式 SSE）
  - [x] 实现配置文件（API 地址、模型名称等默认值）
  - [x] API Key 预置在代码中，首次安装自动加密存储，用户无需手动配置
  - [x] 设置页显示脱敏 Key，用户可点击输入框修改

- [x] Task 4: 系统提示词编写
  - [x] 编写 `system_prompt_jd.md`：JD 翻译与分析的系统提示词
  - [x] 编写 `system_prompt_resume.md`：简历匹配分析的系统提示词

- [x] Task 5: "照JD"功能实现
  - [x] 实现 content script 网页 JD 文本提取逻辑（优先定位 JD 区域，兜底提取 body 文本）
  - [x] 实现 popup 页面"照JD"按钮交互与页面切换
  - [x] 实现加载动画（骨架屏）
  - [x] 实现 JD 分析结果的折叠面板（accordion）展示
  - [x] 实现错误处理（无 JD 内容、API 失败等）

- [x] Task 6: "照自己"功能实现
  - [x] 实现简历上传区域（拖拽 + 点击上传，支持 PDF/DOCX/TXT）
  - [x] 实现前端简历文本解析（TXT 直接读取，PDF 使用 pdf.js，DOCX 使用 mammoth.js）
  - [x] 实现简历存储与更换逻辑（Chrome Storage）
  - [x] 实现简历匹配分析结果展示（综合匹配度、维度分析、优势/不足）
  - [x] 实现 Canvas 雷达图绘制组件（六维度，动态标签，含动画）
  - [x] 实现面试前突击指南展示

- [x] Task 7: UI/UX 完善
  - [x] 主页布局：标题、副标题、两个主按钮、简历状态指示
  - [x] 结果页导航：返回按钮、JD分析/匹配分析 Tab 切换
  - [x] 设置页面：API 配置、清除简历、版本信息
  - [x] 整体视觉风格优化（配色、字体、间距、动画）
  - [x] 手动粘贴 JD 的文本框功能

- [ ] Task 8: 集成测试与打包
  - [ ] 端到端测试：完整流程验证（安装 → 照JD → 上传简历 → 照自己）
  - [ ] 错误场景测试（无 JD、API 失败、简历解析失败等）
  - [ ] 生成 Chrome 插件打包文件

# Task Dependencies
- Task 3 依赖 Task 1（项目结构）
- Task 5 依赖 Task 1、Task 3、Task 4
- Task 6 依赖 Task 1、Task 3、Task 4
- Task 7 依赖 Task 5、Task 6
- Task 8 依赖 Task 7
- Task 2 可与 Task 1-4 并行
- Task 3 与 Task 4 可并行
- Task 5 与 Task 6 可并行
