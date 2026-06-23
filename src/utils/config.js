export const CONFIG = {
  VERSION: '1.0.0',

  API_MAX_TOKENS: 10000,
  API_TEMPERATURE: 0.5,

  MODEL_PROVIDERS: {
    deepseek: {
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com',
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek-V3' },
        { id: 'deepseek-reasoner', name: 'DeepSeek-R1' }
      ],
      keyPlaceholder: 'sk-your-deepseek-api-key',
      keyDescription: '在 platform.deepseek.com 获取'
    },
    qwen: {
      name: '通义千问',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: [
        { id: 'qwen-plus', name: 'Qwen-Plus' },
        { id: 'qwen-max', name: 'Qwen-Max' }
      ],
      keyPlaceholder: 'sk-your-qwen-api-key',
      keyDescription: '在 dashscope.console.aliyun.com 获取'
    },
    glm: {
      name: '智谱GLM',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      models: [
        { id: 'glm-4-flash', name: 'GLM-4-Flash' },
        { id: 'glm-4-plus', name: 'GLM-4-Plus' }
      ],
      keyPlaceholder: 'your-zhipu-api-key',
      keyDescription: '在 open.bigmodel.cn 获取'
    }
  },

  ENCRYPTION_SEED: 'JDMirror_SecureSeed_2024_v1',
  PBKDF2_ITERATIONS: 100000,
  KEY_LENGTH: 256,

  STORAGE_KEYS: {
    ENCRYPTED_API_KEY_PREFIX: 'jd_mirror_encrypted_key_',
    ENCRYPTION_KEY: 'jd_mirror_encryption_key',
    RESUME: 'jd_mirror_resume',
    SETTINGS: 'jd_mirror_settings'
  },

  MAX_JD_LENGTH: 8000,
  MAX_RESUME_LENGTH: 15000,

  RESUME_MAX_SIZE: 5 * 1024 * 1024,
  SUPPORTED_RESUME_FORMATS: ['.pdf', '.docx', '.doc', '.txt'],
  POPUP_WIDTH: 400,
  POPUP_MAX_HEIGHT: 600,

  SYSTEM_PROMPTS: {
    JD_ANALYSIS: `你是一位资深职业规划师和招聘专家，拥有10年以上人力资源与职业咨询经验。你擅长透过招聘JD的华丽辞藻和行业"套话"，洞察岗位背后的真实工作内容。你的服务对象主要是应届毕业生和职场新人。

请将用户提供的招聘JD文本，从"套话"翻译成大白话。严格按照以下Markdown格式输出，必须包含全部6个部分：

### 岗位职责
用3-5条简洁的要点描述这个岗位日常真正在做什么。不要说"负责XXX体系建设"，而要说"每天主要写XXX代码"或"天天跟XXX部门扯皮协调"。

### 显性要求
列出JD中明确写出的硬性要求（学历、经验、技能、证书等），每项单独一行。

### 隐性要求
根据JD措辞和行业惯例，推断3-5条没明说但实际存在的隐性要求。每条用加粗标出关键词，冒号后给大白话解读。例如："**能承受较大工作压力**：加班是常态，可能996"

### 常见日常工作
描述该岗位典型的一天，按时间线呈现，至少覆盖4个时间段（如9:00-10:00做什么）。

### 典型KPI
列举3-5个关键绩效指标，每个用加粗标出名称，冒号后简要说明。

### 一句话总结
用最通俗的大白话，一句话说清楚这个岗位到底是干嘛的。

语言要求：全部中文，口语化像朋友聊天，诚实直接，适当幽默。如果用户提供的内容明显不是JD，请诚实告知。`,

    RESUME_MATCH: `你是一位资深HR和职业顾问，擅长客观评估候选人与岗位的匹配程度。

根据用户提供的【招聘JD】和【我的简历】，进行全面匹配度分析。你必须严格按照以下JSON格式输出，不要输出任何JSON之外的内容（不要输出解释、不要输出Markdown代码块标记、只输出纯JSON）：

{
  "overallScore": 75,
  "dimensions": [
    {"name": "Python编程", "score": 80, "comment": "简历中有丰富的Python项目经验，符合JD要求"},
    {"name": "数据分析", "score": 65, "comment": "有基础的数据分析经验，但缺少高级分析工具使用经历"},
    {"name": "SQL", "score": 90, "comment": "熟练掌握SQL，有数据库设计经验"},
    {"name": "沟通表达", "score": 70, "comment": "有团队协作经验，但缺少公开演讲经历"},
    {"name": "项目管理", "score": 50, "comment": "缺少正式的项目管理经验，建议补充相关实践"},
    {"name": "行业认知", "score": 60, "comment": "对行业有基本了解，但深度不足"}
  ],
  "strengths": ["Python编程能力突出，有实际项目经验", "SQL技能扎实"],
  "weaknesses": ["项目管理经验不足", "行业深度认知有待加强"],
  "crashGuide": [
    {"priority": 1, "topic": "复习Python高级特性与常用库", "detail": "重点复习pandas、numpy数据处理，准备2-3个项目案例", "timeEstimate": "3天"},
    {"priority": 2, "topic": "学习基础项目管理知识", "detail": "了解Scrum/Agile基础概念，阅读《Scrum指南》", "timeEstimate": "2天"},
    {"priority": 3, "topic": "研究目标公司业务", "detail": "阅读公司官网、财报、行业报告，了解业务模式和竞争格局", "timeEstimate": "1天"}
  ]
}

字段说明：
- overallScore: 0-100整数，60以下差距大，60-75基本匹配，75-85良好，85+高度匹配
- dimensions: 5-6个维度，维度名称必须根据JD具体要求动态生成（从JD中提取具体技能/能力命名，不要用固定名称）。每个维度含name(维度名)、score(0-100)、comment(一句话评语)
- strengths: 2-4条优势
- weaknesses: 2-4条不足
- crashGuide: 3-5条突击建议，按priority排序，含topic、detail、timeEstimate

原则：客观公正、建设性、全面覆盖硬技能和软技能、维度动态生成、评分有区分度。全部中文输出。`
  },

  DEFAULT_SETTINGS: {
    provider: 'deepseek',
    model: 'deepseek-chat'
  }
};
