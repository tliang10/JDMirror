import { CONFIG } from './config.js';

function getKeyMaterial(password) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
}

async function deriveKey(keyMaterial, salt) {
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: CONFIG.PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: CONFIG.KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

function generateIV() {
  return crypto.getRandomValues(new Uint8Array(12));
}

async function encryptKey(plainKey) {
  const encoder = new TextEncoder();
  const salt = generateSalt();
  const iv = generateIV();

  const keyMaterial = await getKeyMaterial(CONFIG.ENCRYPTION_SEED);
  const cryptoKey = await deriveKey(keyMaterial, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    encoder.encode(plainKey)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return arrayBufferToBase64(combined.buffer);
}

async function decryptKey(encryptedData) {
  const decoder = new TextDecoder();
  const combined = base64ToArrayBuffer(encryptedData);
  const combinedArray = new Uint8Array(combined);

  const salt = combinedArray.slice(0, 16);
  const iv = combinedArray.slice(16, 28);
  const encrypted = combinedArray.slice(28);

  const keyMaterial = await getKeyMaterial(CONFIG.ENCRYPTION_SEED);
  const cryptoKey = await deriveKey(keyMaterial, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    encrypted
  );

  return decoder.decode(decrypted);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export { encryptKey, decryptKey };
