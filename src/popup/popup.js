import { CONFIG } from '../utils/config.js';
import { callLLM } from '../utils/api.js';
import { parseResumeFile } from '../utils/resumeParser.js';
import { drawRadarChart } from '../utils/radarChart.js';

const state = {
  currentView: 'home',
  resumeUploaded: false,
  resumeText: '',
  resumeFileName: '',
  jdText: '',
  jdResultHtml: '',
  matchResult: null,
  isLoading: false,
  activeTab: 'match',
  retryCallback: null
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function initElements() {
  els.app = $('app');
  els.loadingOverlay = $('loading-overlay');
  els.loadingText = document.querySelector('.loading-text');
  els.mainContent = $('main-content');
  els.footer = $('footer');
  els.resumeStatusDot = document.querySelector('.status-dot');
  els.resumeStatusText = document.querySelector('.status-text');

  els.viewHome = $('view-home');
  els.viewJdResult = $('view-jd-result');
  els.viewResumeUpload = $('view-resume-upload');
  els.viewResumeResult = $('view-resume-result');
  els.viewSettings = $('view-settings');

  els.btnJd = $('btn-jd');
  els.btnResume = $('btn-resume');
  els.btnSettings = $('btn-settings');
  els.btnClose = $('btn-close');
  els.btnBackFromJd = $('btn-back-from-jd');
  els.btnBackFromResume = $('btn-back-from-resume');
  els.btnBackFromUpload = $('btn-back-from-upload');
  els.btnBackFromSettings = $('btn-back-from-settings');
  els.btnSaveJd = $('btn-save-jd');
  els.btnSaveMatch = $('btn-save-match');
  els.exportDialog = $('export-dialog');

  els.homeKeyWarning = $('home-key-warning');
  els.btnGotoSettings = $('btn-goto-settings');

  els.settingsProvider = $('settings-provider');
  els.settingsModel = $('settings-model');
  els.settingsKeyInput = $('settings-key-input');
  els.settingsKeyLabel = $('settings-key-label');
  els.settingsKeyHint = $('settings-key-hint');
  els.settingsKeySection = $('settings-key-section');
  els.btnSaveSettings = $('btn-save-settings');
  els.btnDeleteKey = $('btn-delete-key');
  els.btnToggleKeyVisibility = $('btn-toggle-key-visibility');
  els.settingsStatus = $('settings-status');

  els.jdTextarea = $('jd-textarea');
  els.jdAccordion = $('jd-accordion');
  els.jdError = $('jd-error');
  els.btnReanalyzeJd = $('btn-reanalyze-jd');

  els.uploadZone = $('upload-zone');
  els.uploadProgress = $('upload-progress');
  els.uploadFileName = $('upload-file-name');
  els.uploadError = $('upload-error');
  els.btnSelectFile = $('btn-select-file');
  els.fileInput = $('file-input');

  els.tabMatch = $('tab-match');
  els.scoreCircle = $('score-circle');
  els.scoreValue = $('score-value');
  els.radarCanvas = $('radar-canvas');
  els.dimensionsList = $('dimensions-list');
  els.strengthsList = $('strengths-list');
  els.weaknessesList = $('weaknesses-list');
  els.interviewList = $('interview-list');
  els.resumeError = $('resume-error');
  els.resumeThinkingOverlay = $('resume-thinking-overlay');
  els.btnChangeResume = $('btn-change-resume');
  els.btnReanalyzeResume = $('btn-reanalyze-resume');
}

function switchView(viewName) {
  const allViews = [
    els.viewHome,
    els.viewJdResult,
    els.viewResumeUpload,
    els.viewResumeResult,
    els.viewSettings
  ];

  allViews.forEach(v => {
    if (v) v.style.display = 'none';
  });

  const viewMap = {
    home: els.viewHome,
    jdResult: els.viewJdResult,
    resumeUpload: els.viewResumeUpload,
    resumeResult: els.viewResumeResult,
    settings: els.viewSettings
  };

  const target = viewMap[viewName];
  if (target) {
    target.style.display = 'block';
    target.style.animation = 'none';
    target.offsetHeight;
    target.style.animation = '';
    state.currentView = viewName;
  }

  els.footer.style.display = (viewName === 'home') ? 'flex' : 'none';

  if (viewName === 'settings') {
    loadSettingsView();
  }
}

function showLoading(show, text) {
  state.isLoading = show;
  if (show) {
    els.loadingOverlay.style.display = 'flex';
    if (text) els.loadingText.textContent = text;
  } else {
    els.loadingOverlay.style.display = 'none';
    els.loadingText.textContent = 'AI正在分析中...';
  }
}

function showThinking(container) {
  container.innerHTML = `
    <div class="thinking-block">
      <div class="thinking-header">
        <span class="thinking-pulse"></span>
        <span class="thinking-title">AI 正在分析 JD 中...</span>
      </div>
      <div class="thinking-body">
        <div class="thinking-line"></div>
        <div class="thinking-line short"></div>
        <div class="thinking-line medium"></div>
        <div class="thinking-line short"></div>
      </div>
    </div>
  `;
}

function updateResumeStatus(uploaded) {
  state.resumeUploaded = uploaded;
  if (uploaded) {
    els.resumeStatusDot.className = 'status-dot status-dot-ready';
    els.resumeStatusText.textContent = '简历已上传';
  } else {
    els.resumeStatusDot.className = 'status-dot status-dot-none';
    els.resumeStatusText.textContent = '未上传简历';
  }
}

function showError(container, message, retryFn) {
  container.innerHTML = `<p>${escapeHtml(message)}</p>`;
  if (retryFn) {
    state.retryCallback = retryFn;
    const btn = document.createElement('button');
    btn.className = 'btn-retry';
    btn.textContent = '重试';
    btn.addEventListener('click', () => {
      container.style.display = 'none';
      retryFn();
    });
    container.appendChild(btn);
  }
  container.style.display = 'block';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function extractJDText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentUrl = tab.url || '';

  fetchJobTitle(tab.id);

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractJD' });
    if (response && response.isJobPage !== undefined) {
      return { text: response.text || '', isJobPage: response.isJobPage };
    }
    if (response && response.text) {
      return { text: response.text, isJobPage: true };
    }
  } catch (e) {
    console.warn('[Popup] sendMessage失败，尝试注入content script:', e.message);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content/content.js']
    });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractJD' });
    if (response && response.isJobPage !== undefined) {
      return { text: response.text || '', isJobPage: response.isJobPage };
    }
    if (response && response.text) {
      return { text: response.text, isJobPage: true };
    }
  } catch (e) {
    console.error('[Popup] 注入content script失败:', e.message);
  }

  throw new Error('未检测到JD内容，请打开招聘页面后重试');
}

async function fetchJobTitle(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'getJobTitle' });
    if (response && response.success && response.title) {
      state.jobTitle = response.title;
    }
  } catch (e) {
    state.jobTitle = '';
  }
}

function parseMarkdownToAccordion(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const h3Match = line.match(/^### (.+)/);
    const h2Match = line.match(/^## (.+)/);

    if (h3Match || h2Match) {
      if (currentSection) {
        finalizeSection(currentSection, currentContent, sections);
      }
      currentSection = {
        title: (h3Match || h2Match)[1].replace(/\*\*/g, '').trim(),
        content: '',
        expanded: sections.length === 0
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    finalizeSection(currentSection, currentContent, sections);
  }

  if (sections.length === 0) {
    sections.push({
      title: '分析结果',
      content: formatAccordionContent(markdown),
      expanded: true
    });
  }

  return sections;
}

function finalizeSection(section, contentLines, sections) {
  const rawText = contentLines.join('\n');
  const type = detectSectionType(section.title);
  section.type = type;

  if (type === 'kpi' || type === 'daily') {
    section.rawContent = rawText;
    section.content = '';
  } else {
    section.content = formatAccordionContent(rawText);
  }

  sections.push(section);
}

function detectSectionType(title) {
  const lower = title.toLowerCase();
  if (lower.includes('kpi') || lower.includes('绩效') || lower.includes('指标') || lower.includes('考核')) return 'kpi';
  if (lower.includes('日常工作') || lower.includes('典型一天') || lower.includes('时间线') || lower.includes('一日')) return 'daily';
  return 'normal';
}

function formatAccordionContent(text) {
  let html = text.trim();

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  html = html.replace(/^- (.+)$/gm, (match, content) => {
    return `<li>${content}</li>`;
  });
  html = html.replace(/^(\d+)\. (.+)$/gm, (match, num, content) => {
    return `<li>${content}</li>`;
  });

  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.includes('<li>')) {
      return `<ul>${trimmed}</ul>`;
    }
    return `<p>${trimmed}</p>`;
  }).join('\n');

  return html;
}

function getSectionColor(title) {
  const lower = title.toLowerCase();
  if (lower.includes('岗位职责') || lower.includes('工作内容') || lower.includes('工作职责')) return 'blue';
  if (lower.includes('显性要求') || lower.includes('硬性要求') || lower.includes('学历') || lower.includes('技能要求')) return 'cyan';
  if (lower.includes('隐性要求') || lower.includes('软性要求') || lower.includes('潜规则')) return 'amber';
  if (lower.includes('日常工作') || lower.includes('典型一天') || lower.includes('时间线')) return 'green';
  if (lower.includes('kpi') || lower.includes('绩效') || lower.includes('指标') || lower.includes('考核')) return 'purple';
  if (lower.includes('总结') || lower.includes('一句话') || lower.includes('概括')) return 'slate';
  return 'slate';
}

function renderKpiSection(rawText) {
  const items = [];
  const lines = rawText.split('\n');

  for (const line of lines) {
    const trimmed = line.replace(/^[-•*]\s*/, '').trim();
    if (!trimmed) continue;

    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*[:：]?\s*(.*)/);
    if (boldMatch) {
      const name = boldMatch[1];
      const desc = boldMatch[2];
      const numMatch = desc.match(/(\d+)%?/);
      items.push({ name, desc, value: numMatch ? parseInt(numMatch[1], 10) : null });
    } else {
      items.push({ name: trimmed, desc: '', value: null });
    }
  }

  if (items.length === 0) {
    return `<div class="accordion-content"><p>暂无KPI数据</p></div>`;
  }

  let html = '<div class="kpi-cards">';
  for (const item of items) {
    let barHtml = '';
    if (item.value !== null) {
      const pct = Math.min(100, Math.max(0, item.value));
      barHtml = `<div class="kpi-bar"><div class="kpi-bar-fill" style="width:${pct}%"></div><span class="kpi-bar-value">${pct}%</span></div>`;
    }
    html += `
      <div class="kpi-card">
        <div class="kpi-card-header">
          <span class="kpi-card-icon">📊</span>
          <span class="kpi-card-name">${escapeHtml(item.name)}</span>
        </div>
        ${item.desc ? `<p class="kpi-card-desc">${escapeHtml(item.desc)}</p>` : ''}
        ${barHtml}
      </div>
    `;
  }
  html += '</div>';
  return html;
}

function renderTimelineSection(rawText) {
  const items = [];
  const lines = rawText.split('\n');
  const timeRegex = /(\d{1,2}:\d{2}\s*[-–—~]\s*\d{1,2}:\d{2})/;

  for (const line of lines) {
    const trimmed = line.replace(/^[-•*]\s*/, '').trim();
    if (!trimmed) continue;

    const timeMatch = trimmed.match(timeRegex);
    if (timeMatch) {
      const time = timeMatch[1];
      const desc = trimmed.replace(timeRegex, '').replace(/^[:：]\s*/, '').trim();
      items.push({ time, desc });
    } else {
      if (items.length > 0) {
        items[items.length - 1].desc += ' ' + trimmed;
      } else {
        items.push({ time: '', desc: trimmed });
      }
    }
  }

  if (items.length === 0) {
    return `<div class="accordion-content"><p>暂无时间线数据</p></div>`;
  }

  let html = '<div class="timeline">';
  for (let i = 0; i < items.length; i++) {
    const isLast = i === items.length - 1;
    html += `
      <div class="timeline-item">
        <div class="timeline-marker">
          <div class="timeline-dot"></div>
          ${!isLast ? '<div class="timeline-line"></div>' : ''}
        </div>
        <div class="timeline-body">
          ${items[i].time ? `<span class="timeline-time">${escapeHtml(items[i].time)}</span>` : ''}
          <p class="timeline-desc">${escapeHtml(items[i].desc)}</p>
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

function renderAccordion(container, sections) {
  container.innerHTML = '';

  sections.forEach((section, index) => {
    const colorClass = getSectionColor(section.title);
    const item = document.createElement('div');
    item.className = `accordion-item accordion-item--${colorClass}` + (section.expanded ? ' active' : '');

    let bodyHtml;
    if (section.type === 'kpi') {
      bodyHtml = renderKpiSection(section.rawContent);
    } else if (section.type === 'daily') {
      bodyHtml = renderTimelineSection(section.rawContent);
    } else {
      bodyHtml = `<div class="accordion-content">${section.content}</div>`;
    }

    item.innerHTML = `
      <div class="accordion-header">
        <span class="accordion-title">${escapeHtml(section.title)}</span>
        <span class="accordion-arrow">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
      <div class="accordion-body">
        ${bodyHtml}
      </div>
    `;

    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      item.classList.toggle('active');

      const body = item.querySelector('.accordion-body');
      if (!isActive) {
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        body.style.maxHeight = '0';
      }
    });

    if (section.expanded) {
      setTimeout(() => {
        const body = item.querySelector('.accordion-body');
        body.style.maxHeight = body.scrollHeight + 'px';
      }, 10);
    }

    container.appendChild(item);
  });
}

async function handleAnalyzeJD() {
  try {
    showLoading(true, '正在检测页面...');
    els.jdError.style.display = 'none';

    let result;
    try {
      result = await extractJDText();
    } catch (e) {
      showLoading(false);
      switchView('jdResult');
      els.jdTextarea.value = '';
      showError(els.jdError, e.message, handleAnalyzeJD);
      return;
    }

    showLoading(false);
    switchView('jdResult');

    if (!result.isJobPage) {
      els.jdTextarea.value = '';
      els.jdTextarea.placeholder = '打开岗位详情页面，我会自动提取JD信息。但是部分网站可能阻拦我读取，您也可手动复制JD到此处。';
      els.jdAccordion.innerHTML = '';
      return;
    }

    state.jdText = result.text;
    els.jdTextarea.value = result.text;
    els.jdTextarea.placeholder = 'JD文本将自动提取显示在此，你也可以手动编辑...';
    els.jdAccordion.innerHTML = '';

    showThinking(els.jdAccordion);

    let fullContent = '';
    const onChunk = (chunk, accumulated) => {
      fullContent = accumulated;
      throttleRenderJdStream(fullContent);
    };

    await callLLM(CONFIG.SYSTEM_PROMPTS.JD_ANALYSIS, result.text, onChunk);

    state.jdResultHtml = fullContent;
    const sections = parseMarkdownToAccordion(fullContent);
    renderAccordion(els.jdAccordion, sections);

  } catch (err) {
    console.error('[Popup] JD分析失败:', err);
    els.jdAccordion.innerHTML = '';
    const msg = err.message.includes('API') || err.message.includes('fetch')
      ? 'API请求失败，请检查API Key和网络连接后重试'
      : '分析失败: ' + err.message;
    showError(els.jdError, msg, handleAnalyzeJD);
  }
}

let jdStreamTimer = null;
function throttleRenderJdStream(content) {
  if (jdStreamTimer) clearTimeout(jdStreamTimer);
  jdStreamTimer = setTimeout(() => {
    jdStreamTimer = null;
    const sections = parseMarkdownToAccordion(content);
    renderAccordion(els.jdAccordion, sections);
  }, 80);
}

let resumeStreamTimer = null;
function throttleRenderResumeStream(content) {
  if (resumeStreamTimer) clearTimeout(resumeStreamTimer);
  resumeStreamTimer = setTimeout(() => {
    resumeStreamTimer = null;
    const matchResult = parseMatchResult(content);
    if (matchResult.overallScore > 0 || matchResult.dimensions.length > 0) {
      state.matchResult = matchResult;
      els.resumeThinkingOverlay.style.display = 'none';
      renderMatchResult(matchResult);
    }
  }, 150);
}

async function handleAnalyzeResume() {
  if (!state.resumeUploaded) {
    switchView('resumeUpload');
    return;
  }

  try {
    showLoading(true, '正在检测页面...');
    els.resumeError.style.display = 'none';

    let result;
    try {
      result = await extractJDText();
    } catch (e) {
      showLoading(false);
      switchView('resumeResult');
      showError(els.resumeError, e.message, handleAnalyzeResume);
      return;
    }

    showLoading(false);

    if (!result.isJobPage) {
      switchView('resumeResult');
      els.resumeThinkingOverlay.style.display = 'none';
      els.tabMatch.innerHTML = '<p style="text-align:center;color:var(--color-warning);padding:20px;">请先打开岗位详情页面</p>';
      return;
    }

    state.jdText = result.text;

    const truncatedResume = state.resumeText.length > CONFIG.MAX_RESUME_LENGTH
      ? state.resumeText.substring(0, CONFIG.MAX_RESUME_LENGTH) + '\n...(简历内容已截断)'
      : state.resumeText;

    const userMessage = `【招聘JD】\n${result.text}\n\n【我的简历】\n${truncatedResume}`;

    switchView('resumeResult');

    els.resumeThinkingOverlay.style.display = 'flex';

    let fullContent = '';
    let chunkCount = 0;
    const onChunk = (chunk, accumulated) => {
      chunkCount++;
      fullContent = accumulated;
      throttleRenderResumeStream(fullContent);
    };

    console.log('[Popup] 开始调用LLM，JD长度:', result.text.length, '简历长度:', truncatedResume.length);
    const apiResult = await callLLM(CONFIG.SYSTEM_PROMPTS.RESUME_MATCH, userMessage, onChunk);
    console.log('[Popup] LLM返回完成，总chunk数:', chunkCount, '总长度:', apiResult.length);

    const matchResult = parseMatchResult(fullContent);
    console.log('[Popup] 解析结果:', JSON.stringify({
      overallScore: matchResult.overallScore,
      dimensionsCount: matchResult.dimensions.length,
      strengthsCount: matchResult.strengths.length,
      weaknessesCount: matchResult.weaknesses.length,
      interviewPrepCount: matchResult.interviewPrep.length
    }));

    state.matchResult = matchResult;
    renderMatchResult(matchResult);
    els.resumeThinkingOverlay.style.display = 'none';

  } catch (err) {
    console.error('[Popup] 匹配分析失败:', err);
    els.resumeThinkingOverlay.style.display = 'none';
    switchView('resumeResult');
    const msg = err.message.includes('API') || err.message.includes('fetch')
      ? 'API请求失败，请检查API Key和网络连接后重试'
      : '分析失败: ' + err.message;
    showError(els.resumeError, msg, handleAnalyzeResume);
  }
}

function parseMatchResult(text) {
  const result = {
    overallScore: 0,
    dimensions: [],
    strengths: [],
    weaknesses: [],
    interviewPrep: []
  };

  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return normalizeMatchResult(parsed);
    }
  } catch (e) {
    console.warn('[Popup] JSON代码块解析失败:', e.message);
  }

  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      return normalizeMatchResult(parsed);
    }
  } catch (e) {
    console.warn('[Popup] 纯JSON解析失败，使用启发式解析:', e.message);
  }

  const scoreMatch = text.match(/匹配度[评分：:]\s*(\d+)/);
  if (scoreMatch) {
    result.overallScore = parseInt(scoreMatch[1], 10);
  }

  const dimSection = text.match(/维度|各项能力|分项|雷达/);
  if (dimSection) {
    const dimMatches = text.matchAll(/[•\-\*]*\s*(.+?)[：:]\s*(\d+)[分%]?\s*[-–—]?\s*(.+?)(?=\n[•\-\*]|\n\n|$)/g);
    for (const m of dimMatches) {
      result.dimensions.push({
        label: m[1].trim(),
        score: parseInt(m[2], 10),
        comment: m[3].trim()
      });
    }
  }

  if (result.dimensions.length === 0) {
    const defaultDims = ['专业技能', '工作经验', '学历背景', '综合素质', '发展潜力', '行业匹配'];
    result.dimensions = defaultDims.map(d => ({
      label: d,
      score: Math.max(0, result.overallScore - 10 + Math.floor(Math.random() * 20)),
      comment: '根据JD要求综合评估'
    }));
  }

  const strengthSection = text.match(/优势[匹配：:]*\s*([\s\S]*?)(?=不足|差距|劣势|改进|面试|$)/);
  if (strengthSection) {
    const items = strengthSection[1].match(/[•\-\*\d]+\.?\s*(.+?)(?=\n[•\-\*\d]|\n\n|$)/g);
    if (items) {
      result.strengths = items.map(i => i.replace(/^[•\-\*\d]+\.?\s*/, '').trim()).filter(Boolean);
    }
  }

  const weakSection = text.match(/(?:不足|差距|劣势|改进)[分析：:]*\s*([\s\S]*?)(?=面试|建议|总结|$)/);
  if (weakSection) {
    const items = weakSection[1].match(/[•\-\*\d]+\.?\s*(.+?)(?=\n[•\-\*\d]|\n\n|$)/g);
    if (items) {
      result.weaknesses = items.map(i => i.replace(/^[•\-\*\d]+\.?\s*/, '').trim()).filter(Boolean);
    }
  }

  const interviewSection = text.match(/面试[准备建议：:]*\s*([\s\S]*?)$/);
  if (interviewSection) {
    const items = interviewSection[1].match(/[•\-\*\d]+\.?\s*(.+?)(?=\n[•\-\*\d]|\n\n|$)/g);
    if (items) {
      result.interviewPrep = items.map(i => i.replace(/^[•\-\*\d]+\.?\s*/, '').trim()).filter(Boolean);
    }
  }

  return result;
}

function normalizeMatchResult(parsed) {
  return {
    overallScore: parsed.overallScore || parsed.matchScore || parsed.score || parsed.匹配度评分 || parsed.综合匹配度 || 0,
    dimensions: (parsed.dimensions || parsed.dimensionDetails || parsed.维度分析 || parsed.各项评分 || []).map(d => ({
      label: d.label || d.name || d.dimension || d.维度 || '',
      score: d.score || d.value || d.percentage || d.得分 || 0,
      comment: d.comment || d.analysis || d.remark || d.评语 || d.分析 || ''
    })),
    strengths: parsed.strengths || parsed.advantages || parsed.优势匹配 || parsed.优势 || [],
    weaknesses: parsed.weaknesses || parsed.gaps || parsed.disadvantages || parsed.差距分析 || parsed.不足 || [],
    interviewPrep: parsed.interviewPrep || parsed.interviewTips || parsed.crashGuide || parsed.面试准备建议 || parsed.面试突击指南 || []
  };
}

function renderMatchResult(result) {
  renderScoreRing(result.overallScore);

  if (result.dimensions && result.dimensions.length > 0) {
    setTimeout(() => {
      drawRadarChart(els.radarCanvas, result.dimensions, {
        width: 340,
        height: 300
      });
    }, 100);
  }

  renderDimensions(result.dimensions);
  renderStrengths(result.strengths);
  renderWeaknesses(result.weaknesses);
  renderInterviewPrep(result.interviewPrep);
}

function renderScoreRing(score) {
  let scoreColor, ratingClass, ratingText;
  if (score < 40) {
    scoreColor = '#ea4335';
    ratingClass = 'low';
    ratingText = '差距较大';
  } else if (score < 70) {
    scoreColor = '#e37400';
    ratingClass = 'medium';
    ratingText = '基本匹配';
  } else {
    scoreColor = '#1e8e3e';
    ratingClass = 'high';
    ratingText = '高度匹配';
  }

  els.scoreCircle.style.setProperty('--score-color', scoreColor);
  els.scoreCircle.style.setProperty('--score', score);

  animateScoreCountup(score);

  const labelEl = els.scoreCircle.nextElementSibling;
  if (labelEl && labelEl.classList.contains('score-label')) {
    let ratingEl = labelEl.nextElementSibling;
    if (!ratingEl || !ratingEl.classList.contains('score-rating')) {
      ratingEl = document.createElement('span');
      ratingEl.className = 'score-rating ' + ratingClass;
      labelEl.parentNode.insertBefore(ratingEl, labelEl.nextSibling);
    } else {
      ratingEl.className = 'score-rating ' + ratingClass;
    }
    ratingEl.textContent = ratingText;
  }
}

function animateScoreCountup(target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    els.scoreValue.textContent = current + '%';
  }, 20);
}

function renderDimensions(dimensions) {
  els.dimensionsList.innerHTML = '';

  if (!dimensions || dimensions.length === 0) {
    els.dimensionsList.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;">暂无维度数据</p>';
    return;
  }

  dimensions.forEach(dim => {
    let barClass = 'low';
    if (dim.score >= 70) barClass = 'high';
    else if (dim.score >= 50) barClass = 'medium';

    const item = document.createElement('div');
    item.className = 'dimension-item';
    item.innerHTML = `
      <div class="dimension-header">
        <span class="dimension-name">${escapeHtml(dim.label)}</span>
        <span class="dimension-score">${dim.score}%</span>
      </div>
      <div class="dimension-bar">
        <div class="dimension-bar-fill ${barClass}" style="width:${dim.score}%"></div>
      </div>
      <div class="dimension-comment">${escapeHtml(dim.comment || '')}</div>
    `;
    els.dimensionsList.appendChild(item);
  });
}

function renderStrengths(strengths) {
  els.strengthsList.innerHTML = '';
  if (!strengths || strengths.length === 0) {
    els.strengthsList.innerHTML = '<li>暂无优势数据</li>';
    return;
  }
  strengths.forEach(s => {
    const li = document.createElement('li');
    li.textContent = typeof s === 'string' ? s : (s.description || s.content || JSON.stringify(s));
    els.strengthsList.appendChild(li);
  });
}

function renderWeaknesses(weaknesses) {
  els.weaknessesList.innerHTML = '';
  if (!weaknesses || weaknesses.length === 0) {
    els.weaknessesList.innerHTML = '<li>暂无不足数据</li>';
    return;
  }
  weaknesses.forEach(w => {
    const li = document.createElement('li');
    li.textContent = typeof w === 'string' ? w : (w.description || w.content || JSON.stringify(w));
    els.weaknessesList.appendChild(li);
  });
}

function renderInterviewPrep(items) {
  els.interviewList.innerHTML = '';
  if (!items || items.length === 0) {
    els.interviewList.innerHTML = '<li>暂无面试建议</li>';
    return;
  }
  items.forEach((item, index) => {
    const li = document.createElement('li');

    if (typeof item === 'string') {
      const parts = item.split(/[-–—]/);
      if (parts.length >= 3) {
        const priority = parts[0].trim();
        const topic = parts[1].trim();
        const detail = parts.slice(2).join('-').trim();
        renderInterviewItem(li, priority, topic, detail, index);
      } else if (parts.length === 2) {
        renderInterviewItem(li, '', parts[0].trim(), parts[1].trim(), index);
      } else {
        li.innerHTML = `<span class="interview-topic">${escapeHtml(item)}</span>`;
      }
    } else if (typeof item === 'object') {
      const priority = item.priority || item.level || '';
      const topic = item.topic || item.title || item.主题 || '';
      const detail = item.detail || item.description || item.详情 || '';
      const time = item.timeEstimate || item.time || item.suggestedTime || item.建议时间 || '';
      renderInterviewItem(li, priority, topic, detail, index, time);
    }

    els.interviewList.appendChild(li);
  });
}

function renderInterviewItem(li, priority, topic, detail, index, time) {
  let html = '';
  const priorityStr = String(priority || '');
  const priorityLower = priorityStr.toLowerCase();
  const priorityNum = parseInt(priorityStr, 10);

  let priorityClass = 'medium';
  if (priorityLower.includes('高') || priorityLower.includes('high') || priorityLower.includes('紧急')) {
    priorityClass = 'high';
    html += `<span class="interview-priority priority-high">${escapeHtml(priorityStr)}</span>`;
  } else if (priorityLower.includes('中') || priorityLower.includes('medium')) {
    priorityClass = 'medium';
    html += `<span class="interview-priority priority-medium">${escapeHtml(priorityStr)}</span>`;
  } else if (priorityLower.includes('低') || priorityLower.includes('low')) {
    priorityClass = 'low';
    html += `<span class="interview-priority priority-low">${escapeHtml(priorityStr)}</span>`;
  } else if (!isNaN(priorityNum)) {
    priorityClass = priorityNum <= 1 ? 'high' : priorityNum <= 2 ? 'medium' : 'low';
    const label = priorityNum <= 1 ? '🔴 最优先' : priorityNum <= 2 ? '🟡 重要' : '🟢 建议';
    html += `<span class="interview-priority priority-${priorityClass}">${label}</span>`;
  } else if (priorityStr) {
    html += `<span class="interview-priority priority-medium">${escapeHtml(priorityStr)}</span>`;
  }

  li.className = 'priority-' + priorityClass;

  html += `<span class="interview-topic">${index + 1}. ${escapeHtml(topic)}</span>`;
  html += `<span class="interview-detail">${escapeHtml(detail)}</span>`;

  if (time) {
    html += `<span class="interview-time">建议时间: ${escapeHtml(time)}</span>`;
  }

  li.innerHTML = html;
}

async function handleResumeUpload(file) {
  try {
    els.uploadError.style.display = 'none';
    els.uploadZone.style.display = 'none';
    els.uploadProgress.style.display = 'flex';
    els.uploadFileName.textContent = file.name;

    const text = await parseResumeFile(file);

    state.resumeText = text;
    state.resumeFileName = file.name;

    await chrome.storage.local.set({
      [CONFIG.STORAGE_KEYS.RESUME]: {
        text: text,
        fileName: file.name,
        uploadedAt: Date.now()
      }
    });

    updateResumeStatus(true);
    els.uploadProgress.style.display = 'none';
    els.uploadZone.style.display = 'flex';

    try {
      const jdResult = await extractJDText();
      if (jdResult && jdResult.isJobPage && jdResult.text) {
        state.jdText = jdResult.text;
        handleAnalyzeResume();
        return;
      }
    } catch (e) {
      console.log('[Popup] 未检测到JD页面，返回首页');
    }

    switchView('home');

  } catch (err) {
    console.error('[Popup] 简历解析失败:', err);
    els.uploadProgress.style.display = 'none';
    els.uploadZone.style.display = 'flex';
    showError(els.uploadError, '简历解析失败，请检查文件格式: ' + err.message);
  }
}

function setupUploadEvents() {
  els.btnSelectFile.addEventListener('click', () => {
    els.fileInput.click();
  });

  els.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleResumeUpload(file);
    els.fileInput.value = '';
  });

  els.uploadZone.addEventListener('click', (e) => {
    if (e.target === els.btnSelectFile) return;
    els.fileInput.click();
  });

  els.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.uploadZone.classList.add('dragover');
  });

  els.uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.uploadZone.classList.remove('dragover');
  });

  els.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.uploadZone.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file) handleResumeUpload(file);
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

function extractJobName() {
  if (state.jobTitle) return state.jobTitle;
  if (!state.jdText) return '未知岗位';
  const lines = state.jdText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 40) continue;
    if (trimmed.includes('岗位') || trimmed.includes('职位') || trimmed.includes('工作') || trimmed.includes('招聘')) continue;
    if (/^[\u4e00-\u9fa5a-zA-Z0-9\s·\-+／/()（）]+$/.test(trimmed) && trimmed.length >= 3) {
      return trimmed.replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
    }
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length <= 40 && /[\u4e00-\u9fa5]/.test(trimmed)) {
      return trimmed.replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
    }
  }
  return '未知岗位';
}

function getPageUrl() {
  return state.currentUrl || '';
}

function generateFilename(jobName, type, format) {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const ext = format === 'html' ? '.html' : '.md';
  return `${jobName}_${type}_${date}_${time}${ext}`;
}

function getFormatTime() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatRawContentForExport(rawText, type) {
  if (!rawText) return '';
  if (type === 'kpi') {
    return rawText
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<span class="kpi-item">$1</span>')
      .replace(/\n/g, '<br>');
  }
  if (type === 'daily') {
    return rawText
      .replace(/^- (.+)$/gm, '<span class="timeline-item-export">$1</span>')
      .replace(/\n/g, '<br>');
  }
  return rawText.replace(/\n/g, '<br>');
}

function buildHtmlReport(jobName, pageUrl) {
  const jdText = (state.jdText || '').replace(/\n/g, '<br>');
  const jdHtml = state.jdResultHtml || '';
  const jdSections = jdHtml ? parseMarkdownToAccordion(jdHtml) : [];

  let matchHtml = '';
  if (state.matchResult) {
    const mr = state.matchResult;
    let scoreColor = '#ea4335';
    if (mr.overallScore >= 70) scoreColor = '#1e8e3e';
    else if (mr.overallScore >= 40) scoreColor = '#e37400';

    matchHtml += `
      <div class="match-section">
        <h2>🎯 匹配分析</h2>
        <div class="match-overall">
          <span class="score-badge" style="background:${scoreColor}">${mr.overallScore}%</span>
          <span class="score-label-export">综合匹配度</span>
        </div>
        <h3>维度分析</h3>
        <table class="dim-table"><thead><tr><th>维度</th><th>评分</th><th>评语</th></tr></thead><tbody>
        ${(mr.dimensions || []).map(d => `<tr><td>${d.label}</td><td>${d.score}%</td><td>${d.comment}</td></tr>`).join('')}
        </tbody></table>
        ${(mr.strengths || []).length ? `<h3>优势分析</h3><ul>${mr.strengths.map(s => `<li>${typeof s === 'string' ? s : JSON.stringify(s)}</li>`).join('')}</ul>` : ''}
        ${(mr.weaknesses || []).length ? `<h3>不足分析</h3><ul>${mr.weaknesses.map(w => `<li>${typeof w === 'string' ? w : JSON.stringify(w)}</li>`).join('')}</ul>` : ''}
        ${(mr.interviewPrep || []).length ? `<h3>面试突击指南</h3><ol>${mr.interviewPrep.map(i => {
          if (typeof i === 'object') return `<li><b>${i.topic || ''}</b>: ${i.detail || ''} ${i.timeEstimate ? '(建议时间: ' + i.timeEstimate + ')' : ''}</li>`;
          return `<li>${i}</li>`;
        }).join('')}</ol>` : ''}
      </div>`;
  }

  let jdSectionsHtml = '';
  for (const sec of jdSections) {
    const content = sec.content || formatRawContentForExport(sec.rawContent || '', sec.type);
    jdSectionsHtml += `<div class="jd-section"><h3>${sec.title}</h3><div>${content}</div></div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${jobName} - 职镜JDMirror分析报告</title>
<style>
  body { max-width:820px; margin:0 auto; padding:24px; font-family:-apple-system,PingFang SC,Microsoft YaHei,sans-serif; font-size:14px; color:#202124; line-height:1.8; background:#f8f9fa; }
  h1 { color:#1a73e8; border-bottom:2px solid #1a73e8; padding-bottom:8px; }
  h2 { color:#1e8e3e; margin-top:32px; }
  h3 { color:#5f6368; margin-top:16px; }
  .meta { color:#9aa0a6; font-size:12px; margin-bottom:24px; }
  .meta a { color:#1a73e8; }
  .jd-original { background:#fff; padding:16px; border-radius:8px; border:1px solid #e0e0e0; margin-bottom:24px; }
  .jd-section { background:#fff; padding:16px; border-radius:8px; border-left:4px solid #1a73e8; margin-bottom:12px; }
  .match-section { background:#fff; padding:16px; border-radius:8px; border:1px solid #e0e0e0; margin-top:24px; }
  .match-overall { font-size:20px; font-weight:700; color:#1e8e3e; margin-bottom:12px; display:flex; align-items:center; gap:12px; }
   .score-badge { display:inline-block; padding:6px 16px; border-radius:20px; color:#fff; font-size:22px; font-weight:800; }
   .score-label-export { font-size:14px; color:#5f6368; }
   .dim-table { width:100%; border-collapse:collapse; margin-bottom:16px; }
   .dim-table th { background:#f1f3f4; padding:8px; text-align:left; font-size:12px; }
   .dim-table td { padding:8px; border-bottom:1px solid #e0e0e0; font-size:13px; }
  ul, ol { padding-left:20px; }
  li { margin-bottom:4px; }
  strong { color:#202124; }
   .kpi-item { display:block; padding:6px 0; border-bottom:1px solid #f0f0f0; }
   .timeline-item-export { display:block; padding:6px 0 6px 16px; border-left:2px solid #1a73e8; margin-left:4px; color:#5f6368; }
   .footer { text-align:center; color:#9aa0a6; font-size:11px; margin-top:32px; padding-top:16px; border-top:1px solid #e0e0e0; }
</style>
</head>
<body>
<h1>📋 ${jobName} - 分析报告</h1>
<div class="meta">
  生成时间: ${getFormatTime()} &nbsp;|&nbsp;
  原始链接: <a href="${pageUrl}" target="_blank">${pageUrl}</a>
</div>
<div class="jd-original"><strong>📎 原始JD:</strong><br>${jdText}</div>
<h2>💡 JD解读</h2>
${jdSectionsHtml}
${matchHtml}
<div class="footer">由 职镜JDMirror 生成</div>
</body>
</html>`;
}

function buildMdReport(jobName, pageUrl) {
  const jdHtml = state.jdResultHtml || '';
  const jdSections = jdHtml ? parseMarkdownToAccordion(jdHtml) : [];

  let md = `# ${jobName} - 分析报告\n\n`;
  md += `**生成时间**: ${getFormatTime()}  \n`;
  md += `**原始链接**: ${pageUrl}\n\n`;
  md += `---\n\n`;
  md += `## 📎 原始JD\n\n${state.jdText || ''}\n\n`;
  md += `---\n\n## 💡 JD解读\n\n`;

  for (const sec of jdSections) {
    md += `### ${sec.title}\n\n`;
    const content = sec.content || formatRawContentForExport(sec.rawContent || '', sec.type);
    if (content) {
      md += content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') + '\n\n';
    }
  }

  if (state.matchResult) {
    const mr = state.matchResult;
    md += `---\n\n## 🎯 匹配分析\n\n`;
    md += `**综合匹配度**: ${mr.overallScore}%\n\n`;
    md += `### 维度分析\n\n`;
    md += `| 维度 | 评分 | 评语 |\n|------|------|------|\n`;
    (mr.dimensions || []).forEach(d => { md += `| ${d.label} | ${d.score}% | ${d.comment} |\n`; });
    md += '\n';
    if ((mr.strengths || []).length) {
      md += `### 优势分析\n\n${mr.strengths.map(s => `- ${typeof s === 'string' ? s : JSON.stringify(s)}`).join('\n')}\n\n`;
    }
    if ((mr.weaknesses || []).length) {
      md += `### 不足分析\n\n${mr.weaknesses.map(w => `- ${typeof w === 'string' ? w : JSON.stringify(w)}`).join('\n')}\n\n`;
    }
    if ((mr.interviewPrep || []).length) {
      md += `### 面试突击指南\n\n${mr.interviewPrep.map((i, idx) => {
        if (typeof i === 'object') return `${idx + 1}. **${i.topic || ''}**: ${i.detail || ''} ${i.timeEstimate ? '(建议时间: ' + i.timeEstimate + ')' : ''}`;
        return `${idx + 1}. ${i}`;
      }).join('\n')}\n\n`;
    }
  }

  md += `---\n\n*由 职镜JDMirror 生成*\n`;
  return md;
}

let pendingExportType = null;

function showExportDialog(type) {
  pendingExportType = type;
  els.exportDialog.style.display = 'flex';
}

function hideExportDialog() {
  els.exportDialog.style.display = 'none';
  pendingExportType = null;
}

async function handleExport(format) {
  const exportType = pendingExportType;
  hideExportDialog();

  if (exportType === 'match' && !state.jdResultHtml && state.jdText) {
    showLoading(true, '正在生成JD解读...');
    try {
      let fullContent = '';
      await callLLM(CONFIG.SYSTEM_PROMPTS.JD_ANALYSIS, state.jdText, (chunk, accumulated) => {
        fullContent = accumulated;
      });
      state.jdResultHtml = fullContent;
    } catch (e) {
      console.error('[Popup] 自动JD分析失败:', e);
    }
    showLoading(false);
  }

  const jobName = extractJobName();
  const pageUrl = getPageUrl();
  const typeLabel = exportType === 'jd' ? 'JD解读' : '匹配分析';
  const filename = generateFilename(jobName, typeLabel, format);

  let content;
  if (format === 'html') {
    content = buildHtmlReport(jobName, pageUrl);
  } else {
    content = buildMdReport(jobName, pageUrl);
  }

  const blob = new Blob([content], { type: format === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function checkResumeStatus() {
  try {
    const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.RESUME]);
    const resumeData = result[CONFIG.STORAGE_KEYS.RESUME];
    if (resumeData && resumeData.text) {
      state.resumeText = resumeData.text;
      state.resumeFileName = resumeData.fileName || '';
      updateResumeStatus(true);
    } else {
      updateResumeStatus(false);
    }
  } catch (err) {
    console.error('[Popup] 检查简历状态失败:', err);
  }
}

async function checkKeyStatus() {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getSettings' });
    const settings = result.data || CONFIG.DEFAULT_SETTINGS;
    const provider = settings.provider || 'deepseek';

    const keyResult = await chrome.runtime.sendMessage({
      action: 'getProviderKey',
      payload: { provider }
    });

    const hasKey = keyResult.success && keyResult.data;
    els.homeKeyWarning.style.display = hasKey ? 'none' : 'flex';
    return hasKey;
  } catch (err) {
    console.error('[Popup] 检查Key状态失败:', err);
    return false;
  }
}

function updateModelSelect(provider) {
  const providerConfig = CONFIG.MODEL_PROVIDERS[provider];
  els.settingsModel.innerHTML = '';
  providerConfig.models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    els.settingsModel.appendChild(opt);
  });
}

async function loadSettingsView() {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getSettings' });
    const settings = result.data || CONFIG.DEFAULT_SETTINGS;
    const provider = settings.provider || 'deepseek';

    els.settingsProvider.value = provider;
    updateModelSelect(provider);
    els.settingsModel.value = settings.model || CONFIG.MODEL_PROVIDERS[provider].models[0].id;

    const providerConfig = CONFIG.MODEL_PROVIDERS[provider];
    els.settingsKeyLabel.textContent = providerConfig.name + ' API Key';
    els.settingsKeyInput.placeholder = providerConfig.keyPlaceholder;
    els.settingsKeyHint.textContent = providerConfig.keyDescription;

    const keyResult = await chrome.runtime.sendMessage({
      action: 'getProviderKey',
      payload: { provider }
    });

    if (keyResult.success && keyResult.data) {
      els.settingsKeyInput.value = '••••••••••••••••';
      els.settingsKeyInput.dataset.hasSaved = 'true';
      els.btnDeleteKey.style.display = 'block';
    } else {
      els.settingsKeyInput.value = '';
      els.settingsKeyInput.dataset.hasSaved = 'false';
      els.btnDeleteKey.style.display = 'none';
    }

    els.settingsStatus.style.display = 'none';
  } catch (err) {
    console.error('[Popup] 加载设置失败:', err);
  }
}

function bindEvents() {
  els.btnJd.addEventListener('click', handleAnalyzeJD);
  els.btnResume.addEventListener('click', handleAnalyzeResume);
  els.btnSettings.addEventListener('click', () => switchView('settings'));
  els.btnClose.addEventListener('click', () => window.close());
  els.btnBackFromJd.addEventListener('click', () => switchView('home'));
  els.btnBackFromResume.addEventListener('click', () => switchView('home'));
  els.btnBackFromUpload.addEventListener('click', () => switchView('home'));
  els.btnBackFromSettings.addEventListener('click', () => switchView('home'));
  els.btnGotoSettings.addEventListener('click', () => switchView('settings'));

  els.settingsProvider.addEventListener('change', () => {
    const provider = els.settingsProvider.value;
    updateModelSelect(provider);
    const providerConfig = CONFIG.MODEL_PROVIDERS[provider];
    els.settingsKeyLabel.textContent = providerConfig.name + ' API Key';
    els.settingsKeyInput.placeholder = providerConfig.keyPlaceholder;
    els.settingsKeyHint.textContent = providerConfig.keyDescription;
    els.settingsKeyInput.value = '';
    els.settingsKeyInput.dataset.hasSaved = 'false';
    els.btnDeleteKey.style.display = 'none';
    els.settingsStatus.style.display = 'none';
  });

  els.btnToggleKeyVisibility.addEventListener('click', () => {
    const input = els.settingsKeyInput;
    if (input.dataset.hasSaved === 'true' && input.type === 'password') {
      input.type = 'text';
      loadActualKeyForDisplay();
    } else {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  });

  els.btnSaveSettings.addEventListener('click', async () => {
    try {
      els.settingsStatus.style.display = 'none';
      const provider = els.settingsProvider.value;
      const model = els.settingsModel.value;
      const keyInput = els.settingsKeyInput.value.trim();

      const settings = { provider, model };
      await chrome.runtime.sendMessage({
        action: 'storeSettings',
        payload: { settings }
      });

      if (keyInput && keyInput !== '••••••••••••••••') {
        await chrome.runtime.sendMessage({
          action: 'storeProviderKey',
          payload: { provider, apiKey: keyInput }
        });
      }

      els.settingsStatus.textContent = '设置已保存';
      els.settingsStatus.className = 'settings-status success';
      els.settingsStatus.style.display = 'block';

      els.settingsKeyInput.value = '••••••••••••••••';
      els.settingsKeyInput.dataset.hasSaved = 'true';
      els.settingsKeyInput.type = 'password';
      els.btnDeleteKey.style.display = 'block';

      await checkKeyStatus();

      setTimeout(() => {
        els.settingsStatus.style.display = 'none';
      }, 2000);
    } catch (err) {
      els.settingsStatus.textContent = '保存失败: ' + err.message;
      els.settingsStatus.className = 'settings-status error';
      els.settingsStatus.style.display = 'block';
    }
  });

  els.btnDeleteKey.addEventListener('click', async () => {
    try {
      const provider = els.settingsProvider.value;
      await chrome.runtime.sendMessage({
        action: 'deleteProviderKey',
        payload: { provider }
      });

      els.settingsKeyInput.value = '';
      els.settingsKeyInput.dataset.hasSaved = 'false';
      els.settingsKeyInput.type = 'password';
      els.btnDeleteKey.style.display = 'none';

      els.settingsStatus.textContent = 'API Key 已删除';
      els.settingsStatus.className = 'settings-status success';
      els.settingsStatus.style.display = 'block';

      await checkKeyStatus();

      setTimeout(() => {
        els.settingsStatus.style.display = 'none';
      }, 2000);
    } catch (err) {
      els.settingsStatus.textContent = '删除失败: ' + err.message;
      els.settingsStatus.className = 'settings-status error';
      els.settingsStatus.style.display = 'block';
    }
  });

  els.btnReanalyzeJd.addEventListener('click', () => {
    const editedJd = els.jdTextarea.value.trim();
    if (!editedJd) {
      showError(els.jdError, 'JD文本不能为空，请先提取或手动输入JD内容');
      return;
    }
    state.jdText = editedJd;
    els.jdError.style.display = 'none';
    reanalyzeJD(editedJd);
  });

  els.btnChangeResume.addEventListener('click', () => {
    switchView('resumeUpload');
  });

  els.btnReanalyzeResume.addEventListener('click', handleAnalyzeResume);

  els.btnSaveJd.addEventListener('click', () => showExportDialog('jd'));
  els.btnSaveMatch.addEventListener('click', () => showExportDialog('match'));

  els.exportDialog.querySelector('.export-dialog-mask').addEventListener('click', hideExportDialog);
  els.exportDialog.querySelector('.export-dialog-cancel').addEventListener('click', hideExportDialog);
  els.exportDialog.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', () => handleExport(btn.dataset.format));
  });

  setupUploadEvents();
}

async function reanalyzeJD(jdText) {
  try {
    els.jdError.style.display = 'none';
    els.jdAccordion.innerHTML = '';
    showThinking(els.jdAccordion);

    let fullContent = '';
    const onChunk = (chunk, accumulated) => {
      fullContent = accumulated;
      throttleRenderJdStream(fullContent);
    };

    await callLLM(CONFIG.SYSTEM_PROMPTS.JD_ANALYSIS, jdText, onChunk);

    state.jdResultHtml = fullContent;
    const sections = parseMarkdownToAccordion(fullContent);
    renderAccordion(els.jdAccordion, sections);

  } catch (err) {
    console.error('[Popup] 重新分析JD失败:', err);
    els.jdAccordion.innerHTML = '';
    showError(els.jdError, '分析失败: ' + err.message, () => reanalyzeJD(jdText));
  }
}

async function loadActualKeyForDisplay() {
  try {
    const provider = els.settingsProvider.value;
    const keyResult = await chrome.runtime.sendMessage({
      action: 'getProviderKey',
      payload: { provider }
    });
    if (keyResult.success && keyResult.data) {
      els.settingsKeyInput.value = keyResult.data;
    }
  } catch (err) {
    console.error('[Popup] 加载Key失败:', err);
  }
}

async function init() {
  initElements();
  bindEvents();
  await checkResumeStatus();
  await checkKeyStatus();
  switchView('home');
}

document.addEventListener('DOMContentLoaded', init);
