import { CONFIG } from './config.js';

function getFileExtension(filename) {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return filename.slice(dotIndex).toLowerCase();
}

let pdfJsReady = false;
function ensurePdfJs() {
  if (pdfJsReady) return;
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF解析库加载失败，请重新安装插件');
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.js';
  pdfJsReady = true;
}

async function parseResumeFile(file) {
  if (!file) {
    throw new Error('未提供文件');
  }

  if (file.size > CONFIG.RESUME_MAX_SIZE) {
    throw new Error(`文件大小超过限制（最大 ${CONFIG.RESUME_MAX_SIZE / 1024 / 1024}MB）`);
  }

  const extension = getFileExtension(file.name);

  if (!CONFIG.SUPPORTED_RESUME_FORMATS.includes(extension)) {
    throw new Error(`不支持的文件格式: ${extension}。支持的格式: ${CONFIG.SUPPORTED_RESUME_FORMATS.join(', ')}`);
  }

  switch (extension) {
    case '.txt':
      return await parseTxt(file);
    case '.pdf':
      return await parsePdf(file);
    case '.docx':
      return await parseDocx(file);
    case '.doc':
      return await parseDoc(file);
    default:
      throw new Error(`未处理的文件格式: ${extension}`);
  }
}

async function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (!text || text.trim().length === 0) {
        reject(new Error('TXT文件内容为空，请检查文件是否损坏'));
        return;
      }
      resolve(text);
    };
    reader.onerror = () => reject(new Error('读取TXT文件失败，请检查文件是否损坏'));
    reader.readAsText(file, 'UTF-8');
  });
}

async function parsePdf(file) {
  ensurePdfJs();

  const arrayBuffer = await file.arrayBuffer();
  let pdf;

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await loadingTask.promise;
  } catch (e) {
    throw new Error(`PDF文件解析失败: ${e.message || '文件可能已损坏或加密'}`);
  }

  if (!pdf || pdf.numPages === 0) {
    throw new Error('PDF文件内容为空');
  }

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .filter(s => s && s.trim())
        .join(' ');
      if (pageText.trim()) {
        pages.push(pageText);
      }
    } catch (e) {
      console.warn(`[resumeParser] PDF第${i}页解析失败:`, e.message);
    }
  }

  const fullText = pages.join('\n\n');
  if (!fullText || fullText.trim().length === 0) {
    throw new Error('PDF文件中未提取到文本内容，该PDF可能是扫描件（图片格式），建议使用可编辑PDF或TXT格式');
  }

  return fullText.trim();
}

async function parseDocx(file) {
  if (typeof mammoth === 'undefined') {
    throw new Error('Word解析库加载失败，请重新安装插件');
  }

  const arrayBuffer = await file.arrayBuffer();
  let result;

  try {
    result = await mammoth.extractRawText({ arrayBuffer });
  } catch (e) {
    throw new Error(`DOCX文件解析失败: ${e.message || '文件可能已损坏'}`);
  }

  if (!result || !result.value || result.value.trim().length === 0) {
    if (result && result.messages && result.messages.length > 0) {
      const errorMsgs = result.messages.filter(m => m.type === 'error').map(m => m.message).join('; ');
      if (errorMsgs) {
        throw new Error(`DOCX解析出错: ${errorMsgs}`);
      }
    }
    throw new Error('DOCX文件中未提取到文本内容，文件可能为空或格式异常');
  }

  return result.value.trim();
}

async function parseDoc(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const text = extractBinaryText(bytes);

  if (!text || text.trim().length < 30) {
    const extended = extractBinaryTextExtended(bytes);
    if (!extended || extended.trim().length < 20) {
      throw new Error('无法从DOC文件中提取文本。.doc为旧版格式，请用Word另存为.docx或TXT格式后重试');
    }
    return extended;
  }

  return text;
}

function extractBinaryText(bytes) {
  const result = [];
  let currentChunk = '';

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];

    if (byte >= 0x20 && byte <= 0x7E) {
      currentChunk += String.fromCharCode(byte);
    } else if (byte === 0x0A || byte === 0x0D || byte === 0x09) {
      if (currentChunk.length > 1) {
        result.push(currentChunk);
      }
      currentChunk = '';
    } else {
      if (currentChunk.length > 2) {
        result.push(currentChunk);
      }
      currentChunk = '';
    }
  }

  if (currentChunk.length > 1) {
    result.push(currentChunk);
  }

  return result.join('\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractBinaryTextExtended(bytes) {
  const chunks = [];
  let current = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 0x20 && b <= 0x7E) || (b >= 0x80 && b <= 0xFF)) {
      current += String.fromCharCode(b);
    } else {
      if (current.length > 2) chunks.push(current);
      current = '';
    }
  }
  if (current.length > 2) chunks.push(current);
  return chunks.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

export { parseResumeFile, getFileExtension };
