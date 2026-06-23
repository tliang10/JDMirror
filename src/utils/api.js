import { CONFIG } from './config.js';

async function getActiveProviderKey() {
  const settingsResult = await chrome.runtime.sendMessage({ action: 'getSettings' });
  const settings = settingsResult.data || CONFIG.DEFAULT_SETTINGS;
  const provider = settings.provider || 'deepseek';

  const keyResult = await chrome.runtime.sendMessage({
    action: 'getProviderKey',
    payload: { provider }
  });

  if (keyResult.success && keyResult.data) {
    return { apiKey: keyResult.data, provider };
  }

  return { apiKey: null, provider };
}

async function getApiConfig() {
  const settingsResult = await chrome.runtime.sendMessage({ action: 'getSettings' });
  const settings = settingsResult.data || CONFIG.DEFAULT_SETTINGS;
  const provider = settings.provider || 'deepseek';
  const model = settings.model || CONFIG.MODEL_PROVIDERS[provider].models[0].id;

  return {
    baseUrl: CONFIG.MODEL_PROVIDERS[provider].baseUrl,
    model: model,
    provider: provider
  };
}

async function callLLM(systemPrompt, userMessage, onChunk) {
  const { apiKey, provider } = await getActiveProviderKey();

  if (!apiKey) {
    const providerName = CONFIG.MODEL_PROVIDERS[provider].name;
    throw new Error(`请先在设置中配置${providerName}的API Key`);
  }

  const { baseUrl, model } = await getApiConfig();

  const requestBody = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: CONFIG.API_MAX_TOKENS,
    temperature: CONFIG.API_TEMPERATURE,
    stream: true
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('API请求超时（120秒），请检查网络或稍后重试');
    }
    throw new Error('网络请求失败: ' + e.message);
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败 (${response.status}): ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            if (onChunk && typeof onChunk === 'function') {
              onChunk(content, fullContent);
            }
          }
        } catch (e) {
          console.warn('[API] SSE解析警告:', e.message);
        }
      }
    }
  } catch (e) {
    console.warn('[API] 流读取异常:', e.message);
    if (fullContent) {
      return fullContent;
    }
  }

  if (fullContent) {
    return fullContent;
  }

  console.log('[API] 流式返回为空，尝试非流式请求');
  return await callLLMNonStream(baseUrl, apiKey, model, systemPrompt, userMessage);
}

async function callLLMNonStream(baseUrl, apiKey, model, systemPrompt, userMessage) {
  const requestBody = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: CONFIG.API_MAX_TOKENS,
    temperature: CONFIG.API_TEMPERATURE,
    stream: false
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('API返回内容为空');
  }
  return content;
}

export { callLLM, getApiConfig, getActiveProviderKey };
