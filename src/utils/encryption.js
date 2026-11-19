/**
 * Client-Side AES-256-GCM Encryption / Decryption via Web Crypto API
 * Compliant with Section C3.4 & B4.4 for securing PII in LocalStorage.
 */

const STATIC_PASSPHRASE = 'LendSwift_Secure_Vault_Key_2026_RBI_Compliant_Prod';
const SALT = new Uint8Array([76, 101, 110, 100, 83, 119, 105, 102, 116, 95, 83, 97, 108, 116, 50, 48]); // 'LendSwift_Salt20'

/**
 * Derives a CryptoKey from a passphrase using PBKDF2 with SHA-256
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey() {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(STATIC_PASSPHRASE),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Converts ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts Base64 string to ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypts a plain object or string using AES-256-GCM
 * @param {any} data
 * @returns {Promise<string>} Base64 encoded payload: { iv, ciphertext }
 */
export async function encryptData(data) {
  try {
    const key = await deriveKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const enc = new TextEncoder();
    const encodedData = enc.encode(jsonStr);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    );

    const payload = {
      iv: bufferToBase64(iv.buffer),
      data: bufferToBase64(ciphertext),
    };

    return JSON.stringify(payload);
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts an AES-256-GCM encrypted payload
 * @param {string} encryptedJsonString
 * @returns {Promise<any>} Parsed decrypted data
 */
export async function decryptData(encryptedJsonString) {
  try {
    if (!encryptedJsonString) return null;
    const parsedPayload = JSON.parse(encryptedJsonString);
    if (!parsedPayload.iv || !parsedPayload.data) {
      throw new Error('Invalid encrypted payload structure');
    }

    const key = await deriveKey();
    const iv = new Uint8Array(base64ToBuffer(parsedPayload.iv));
    const ciphertext = base64ToBuffer(parsedPayload.data);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch (err) {
    // If decryption fails (e.g. data corrupted or tampered), reject cleanly
    throw new Error('Data decryption or integrity check failed');
  }
}
