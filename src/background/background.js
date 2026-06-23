import { CONFIG } from '../utils/config.js';
import { encryptKey, decryptKey } from '../utils/crypto.js';

const MESSAGE_ACTIONS = {
  STORE_RESUME: 'storeResume',
  GET_RESUME: 'getResume',
  DELETE_RESUME: 'deleteResume',
  STORE_PROVIDER_KEY: 'storeProviderKey',
  GET_PROVIDER_KEY: 'getProviderKey',
  GET_ALL_PROVIDER_KEYS: 'getAllProviderKeys',
  DELETE_PROVIDER_KEY: 'deleteProviderKey',
  STORE_SETTINGS: 'storeSettings',
  GET_SETTINGS: 'getSettings'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('[Background] 消息处理错误:', err);
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(message, sender) {
  const { action, payload } = message;

  switch (action) {
    case MESSAGE_ACTIONS.STORE_RESUME:
      return await storeResume(payload);
    case MESSAGE_ACTIONS.GET_RESUME:
      return await getResume();
    case MESSAGE_ACTIONS.DELETE_RESUME:
      return await deleteResume();
    case MESSAGE_ACTIONS.STORE_PROVIDER_KEY:
      return await storeProviderKey(payload);
    case MESSAGE_ACTIONS.GET_PROVIDER_KEY:
      return await getProviderKey(payload);
    case MESSAGE_ACTIONS.GET_ALL_PROVIDER_KEYS:
      return await getAllProviderKeys();
    case MESSAGE_ACTIONS.DELETE_PROVIDER_KEY:
      return await deleteProviderKey(payload);
    case MESSAGE_ACTIONS.STORE_SETTINGS:
      return await storeSettings(payload);
    case MESSAGE_ACTIONS.GET_SETTINGS:
      return await getSettings();
    default:
      return { error: `未知操作: ${action}` };
  }
}

async function storeResume({ resumeData }) {
  try {
    await chrome.storage.local.set({
      [CONFIG.STORAGE_KEYS.RESUME]: resumeData
    });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function getResume() {
  try {
    const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.RESUME]);
    return {
      success: true,
      data: result[CONFIG.STORAGE_KEYS.RESUME] || null
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function deleteResume() {
  try {
    await chrome.storage.local.remove([CONFIG.STORAGE_KEYS.RESUME]);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

function getProviderKeyStorageKey(provider) {
  return CONFIG.STORAGE_KEYS.ENCRYPTED_API_KEY_PREFIX + provider;
}

async function storeProviderKey({ provider, apiKey }) {
  try {
    const encrypted = await encryptKey(apiKey);
    await chrome.storage.local.set({
      [getProviderKeyStorageKey(provider)]: encrypted
    });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function getProviderKey({ provider }) {
  try {
    const result = await chrome.storage.local.get([getProviderKeyStorageKey(provider)]);
    const encrypted = result[getProviderKeyStorageKey(provider)];
    if (!encrypted) {
      return { success: true, data: null };
    }
    const decrypted = await decryptKey(encrypted);
    return { success: true, data: decrypted };
  } catch (err) {
    return { error: err.message };
  }
}

async function getAllProviderKeys() {
  try {
    const keys = {};
    for (const provider of Object.keys(CONFIG.MODEL_PROVIDERS)) {
      const result = await chrome.storage.local.get([getProviderKeyStorageKey(provider)]);
      if (result[getProviderKeyStorageKey(provider)]) {
        keys[provider] = true;
      }
    }
    return { success: true, data: keys };
  } catch (err) {
    return { error: err.message };
  }
}

async function deleteProviderKey({ provider }) {
  try {
    await chrome.storage.local.remove([getProviderKeyStorageKey(provider)]);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function storeSettings({ settings }) {
  try {
    await chrome.storage.local.set({
      [CONFIG.STORAGE_KEYS.SETTINGS]: settings
    });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function getSettings() {
  try {
    const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS]);
    return {
      success: true,
      data: result[CONFIG.STORAGE_KEYS.SETTINGS] || CONFIG.DEFAULT_SETTINGS
    };
  } catch (err) {
    return { error: err.message };
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] 职镜JDMirror v' + CONFIG.VERSION + ' 已安装, reason:', details.reason);
});
