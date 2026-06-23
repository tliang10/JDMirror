const JD_SELECTORS = [
  '[class*="job-detail"]',
  '[class*="jobDetail"]',
  '[class*="job_description"]',
  '[class*="job-description"]',
  '[class*="jd-content"]',
  '[class*="jdContent"]',
  '[class*="position-detail"]',
  '[class*="positionDetail"]',
  '[class*="job-info"]',
  '[class*="jobInfo"]',
  '[class*="detail-content"]',
  '[class*="detailContent"]',
  '[class*="job-box"]',
  '[class*="jobBox"]',
  '[class*="job-main"]',
  '[class*="jobMain"]',
  '[class*="job-wrap"]',
  '[class*="jobWrap"]',
  '[class*="job-article"]',
  '[class*="jobArticle"]',
  '[class*="job-body"]',
  '[class*="jobBody"]',
  '[class*="job-container"]',
  '[class*="jobContainer"]',
  '[class*="job-section"]',
  '[class*="jobSection"]',
  '[class*="job-card"]',
  '[class*="jobCard"]',
  '[class*="job-panel"]',
  '[class*="jobPanel"]'
];

const SITE_SELECTORS = {
  zhipin: [
    '.job-detail .job-sec-text',
    '.job-sec-text',
    '.job-detail .text',
    '.job-sec .text',
    '.detail-text'
  ],
  liepin: [
    '.content-word',
    '.job-intro-content',
    '.job-intro',
    '.about-position',
    '.job-summary',
    '.main-body .content',
    '.job-detail-content'
  ],
  zhilian: [
    '.describtion',
    '.describtion__main',
    '.job-detail__content',
    '.responsibility',
    '.requirement'
  ],
  lagou: [
    '.job-detail .job_bt',
    '.job_bt',
    '.job-detail-container'
  ],
  wuyou: [
    '.bmsg.job_msg.inbox',
    '.job_msg',
    '.tCompany_main .tBorderTop_box'
  ]
};

const JOB_SECTION_TITLES = [
  '职位描述', '岗位职责', '工作内容', '任职要求', '任职资格',
  '岗位要求', '职位要求', '工作要求', '能力要求', '技能要求',
  '岗位描述', '招聘要求', '我们希望你', '你需要具备',
  'Responsibilities', 'Requirements', 'Qualifications',
  'About the Role', 'What You\'ll Do', 'What We\'re Looking For'
];

const JOB_KEYWORDS = [
  '岗位职责', '职位描述', '工作内容', '任职要求', '任职资格',
  '岗位要求', '职位要求', '工作要求', '能力要求', '技能要求',
  '岗位描述', '职位信息', '工作职责', '招聘要求',
  'responsibility', 'requirement', 'qualification',
  '岗位', '职位', '薪资', '学历', '经验',
  'JD', 'job description'
];

const BLOCK_ELEMENTS = [
  'script', 'style', 'nav', 'header', 'footer',
  'iframe', 'noscript', 'svg', 'img', 'video', 'audio',
  'canvas', 'input', 'button', 'select', 'textarea'
];

const NOISE_CLASS_PATTERNS = [
  'recommend', 'related', 'sidebar', 'aside', 'banner',
  'advertisement', 'comment', 'footer', 'header', 'nav',
  'menu', 'pagination', 'share', 'social', 'login', 'register',
  'popup', 'modal', 'overlay', 'tooltip', 'dropdown',
  'carousel', 'slider', 'breadcrumb', 'copyright'
];

const MAX_TEXT_LENGTH = 8000;

function detectSite() {
  const url = window.location.href.toLowerCase();
  if (url.includes('zhipin.com')) return 'zhipin';
  if (url.includes('liepin.com')) return 'liepin';
  if (url.includes('zhaopin.com') || url.includes('zhaopin')) return 'zhilian';
  if (url.includes('lagou.com')) return 'lagou';
  if (url.includes('51job.com')) return 'wuyou';
  return 'generic';
}

function narrowToJdSection(el) {
  if (!el) return el;

  for (const title of JOB_SECTION_TITLES) {
    const allElements = el.querySelectorAll('*');
    for (const child of allElements) {
      if (child.children.length === 0) continue;
      const text = (child.innerText || '').substring(0, 100);
      if (text.includes(title)) {
        const parent = child.closest('[class]') || child;
        const parentText = parent.innerText || '';
        if (parentText.length > 80 && parentText.length < el.innerText.length * 0.9) {
          return parent;
        }
      }
    }

    const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, [class*="title"], [class*="heading"], [class*="section-title"]');
    for (const h of headings) {
      if ((h.innerText || '').trim().includes(title)) {
        let container = h.parentElement;
        let depth = 0;
        while (container && container !== el && depth < 5) {
          const text = container.innerText || '';
          if (text.length > 80 && text.length < el.innerText.length * 0.85) {
            return container;
          }
          container = container.parentElement;
          depth++;
        }
        let sibling = h.nextElementSibling || h.parentElement;
        if (sibling && sibling !== el) {
          const sibText = sibling.innerText || '';
          if (sibText.length > 50) return sibling;
        }
      }
    }
  }

  return el;
}

function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  if (parseFloat(style.fontSize) === 0) return false;

  if (style.position === 'absolute' || style.position === 'fixed') {
    if (rect.left < -3000 || rect.top < -3000) return false;
  }

  if (style.clip === 'rect(0px, 0px, 0px, 0px)' ||
      style.clip === 'rect(0, 0, 0, 0)' ||
      style.clip === 'rect(1px, 1px, 1px, 1px)') {
    return false;
  }

  if (style.overflow === 'hidden') {
    if (rect.width <= 1 && rect.height <= 1) return false;
  }

  let parent = el;
  while (parent && parent !== document.body) {
    if (parent.getAttribute('aria-hidden') === 'true') return false;
    parent = parent.parentElement;
  }

  return true;
}

function removeInvisibleDescendants(root) {
  const all = root.querySelectorAll('*');
  const toRemove = [];
  for (const el of all) {
    if (!isElementVisible(el)) {
      toRemove.push(el);
    }
  }
  for (const el of toRemove) {
    el.parentElement && el.parentElement.removeChild(el);
  }
}

function isJobDetailPage() {
  const url = window.location.href.toLowerCase();
  const urlPatterns = [
    '/job/', '/job_detail', '/jobdetail', '/jd/', '/position/',
    '/detail/', '/jobinfo', '/job-info', '/recruit/',
    'zhipin.com/job_detail', 'liepin.com/job', 'lagou.com/jobs',
    '51job.com', 'zhaopin.com', 'jobui.com', 'maimai.cn',
    'linkedin.com/jobs', 'indeed.com', 'glassdoor.com'
  ];
  const urlMatch = urlPatterns.some(p => url.includes(p));

  const title = document.title.toLowerCase();
  const titleKeywords = ['招聘', '岗位', '职位', 'job', '招聘详情', '职位详情'];
  const titleMatch = titleKeywords.some(k => title.includes(k));

  const bodyText = document.body.innerText.substring(0, 2000).toLowerCase();
  const keywordCount = JOB_KEYWORDS.filter(k => bodyText.includes(k.toLowerCase())).length;

  return urlMatch || titleMatch || keywordCount >= 2;
}

function isNoiseElement(el) {
  if (!el || !el.className) return false;
  const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
  const id = (el.id || '').toLowerCase();
  const combined = cls + ' ' + id;
  return NOISE_CLASS_PATTERNS.some(p => combined.includes(p));
}

function scoreElement(el) {
  if (!el) return 0;
  const text = el.innerText ? el.innerText.trim() : '';
  if (text.length < 30) return 0;

  let score = 0;
  const lower = text.toLowerCase();

  const strongKeywords = ['岗位职责', '任职要求', '职位描述', '工作内容', '任职资格'];
  strongKeywords.forEach(k => {
    if (lower.includes(k)) score += 15;
  });

  const mediumKeywords = ['岗位要求', '职位要求', '工作要求', '能力要求', '技能要求', '岗位描述', '工作职责'];
  mediumKeywords.forEach(k => {
    if (lower.includes(k)) score += 8;
  });

  const lightKeywords = ['薪资', '学历', '经验', '福利', '五险一金', '年终奖', '绩效', '晋升'];
  lightKeywords.forEach(k => {
    if (lower.includes(k)) score += 3;
  });

  const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
  const id = (el.id || '').toLowerCase();
  const combined = cls + ' ' + id;

  const positivePatterns = ['job', 'jd', 'position', 'detail', 'description', 'requirement', 'content', 'main', 'body', 'article', 'section', 'panel', 'card', 'box', 'wrap', 'container'];
  positivePatterns.forEach(p => {
    if (combined.includes(p)) score += 2;
  });

  const noisePatterns = ['recommend', 'related', 'sidebar', 'aside', 'banner', 'ad', 'comment', 'footer', 'header', 'nav', 'menu', 'pagination', 'share', 'social'];
  noisePatterns.forEach(p => {
    if (combined.includes(p)) score -= 20;
  });

  const parent = el.parentElement;
  if (parent && isNoiseElement(parent)) score -= 30;

  const tagName = el.tagName.toLowerCase();
  if (tagName === 'article' || tagName === 'main' || tagName === 'section') score += 3;

  const depth = getDepth(el);
  if (depth > 15) score -= 5;

  return score;
}

function getDepth(el) {
  let depth = 0;
  let current = el;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

function collectCandidates() {
  const candidates = [];
  const seen = new Set();
  const site = detectSite();

  function trySelectors(selectors, bonusScore) {
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (seen.has(el)) return;
          seen.add(el);
          if (!isElementVisible(el)) return;
          const text = el.innerText ? el.innerText.trim() : '';
          if (text.length >= 30) {
            candidates.push({ el, bonusScore });
          }
        });
      } catch (e) {}
    }
  }

  if (SITE_SELECTORS[site]) {
    trySelectors(SITE_SELECTORS[site], 30);
  }

  trySelectors(JD_SELECTORS, 0);

  return candidates;
}

function extractJDText() {
  const candidates = collectCandidates();
  const site = detectSite();

  let bestEl = null;
  let bestScore = -Infinity;

  for (const c of candidates) {
    const score = scoreElement(c.el) + (c.bonusScore || 0);
    if (score > bestScore) {
      bestScore = score;
      bestEl = c.el;
    }
  }

  const minScore = site !== 'generic' ? 5 : 10;

  if (bestEl && bestScore > minScore) {
    if (site === 'zhipin') {
      bestEl = narrowToJdSection(bestEl);
    }
    return cleanText(bestEl.innerText);
  }

  const bodyClone = document.body.cloneNode(true);
  BLOCK_ELEMENTS.forEach(sel => {
    bodyClone.querySelectorAll(sel).forEach(el => el.remove());
  });
  NOISE_CLASS_PATTERNS.forEach(pattern => {
    try {
      bodyClone.querySelectorAll(`[class*="${pattern}"]`).forEach(el => el.remove());
      bodyClone.querySelectorAll(`[id*="${pattern}"]`).forEach(el => el.remove());
    } catch (e) {}
  });
  removeInvisibleDescendants(bodyClone);

  return cleanText(bodyClone.innerText);
}

function cleanText(text) {
  let cleaned = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  cleaned = cleaned
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (trimmed.length > 300 && !/[。！？；，：、.!?;,:]/.test(trimmed)) return false;
      if (/^[\d\s,、，.。]+$/.test(trimmed)) return false;
      return true;
    })
    .join('\n');

  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{3,}/g, '  ')
    .trim();

  if (cleaned.length > MAX_TEXT_LENGTH) {
    cleaned = cleaned.substring(0, MAX_TEXT_LENGTH);
    const lastPeriod = Math.max(
      cleaned.lastIndexOf('。'),
      cleaned.lastIndexOf('.'),
      cleaned.lastIndexOf('\n')
    );
    if (lastPeriod > MAX_TEXT_LENGTH * 0.7) {
      cleaned = cleaned.substring(0, lastPeriod + 1);
    }
  }

  return cleaned;
}

function getJobTitle() {
  const site = detectSite();
  let title = document.title || '';

  if (site === 'zhipin') {
    const m = title.match(/^(.+?)招聘/);
    if (m) title = m[1].trim();
  } else if (site === 'liepin') {
    const m = title.match(/^【(.+?)】/);
    if (m) title = m[1].trim();
    else title = title.replace(/-猎聘.*$/, '').trim();
  } else if (site === 'zhilian') {
    title = title.replace(/-智联招聘$/, '').replace(/【.+?】/g, '').trim();
  } else {
    title = title
      .replace(/[-_|–—].*(招聘|求职|找工作|BOSS直聘|猎聘|智联|拉勾|51job).*$/i, '')
      .replace(/(招聘|职位|岗位).*$/, '')
      .trim();
  }

  if (!title || title.length < 2) {
    const h1 = document.querySelector('h1');
    if (h1 && h1.innerText && h1.innerText.trim().length > 1) {
      title = h1.innerText.trim();
    }
  }

  return title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 40) || '未知岗位';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractJD') {
    try {
      const isJobPage = isJobDetailPage();
      const text = isJobPage ? extractJDText() : '';
      sendResponse({ success: true, text, isJobPage });
    } catch (err) {
      sendResponse({ success: false, error: err.message, isJobPage: false });
    }
  }
  if (message.action === 'getJobTitle') {
    try {
      sendResponse({ success: true, title: getJobTitle() });
    } catch (err) {
      sendResponse({ success: false, title: '未知岗位' });
    }
  }
  return true;
});
