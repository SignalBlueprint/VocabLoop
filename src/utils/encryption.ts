/**
 * Client-side encryption for card content
 *
 * Uses Web Crypto API with AES-GCM for encryption.
 * The encryption key is derived from the user's ID using PBKDF2.
 */

// Storage key for the encryption key
const KEY_STORAGE = 'vocabloop_enc_key';

// Salt for key derivation (should be unique per user in production)
const SALT_PREFIX = 'vocabloop_salt_';

/**
 * Generate a random encryption key (exported for future use)
 */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive an encryption key from user ID using PBKDF2
 */
async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = encoder.encode(SALT_PREFIX + userId);

  // Import the user ID as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to storable format
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import key from stored format
 */
async function importKey(keyString: string): Promise<CryptoKey> {
  const keyBytes = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create encryption key for user
 */
export async function getEncryptionKey(userId: string): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE);

  if (stored) {
    try {
      return await importKey(stored);
    } catch {
      // Key corrupted, regenerate
      localStorage.removeItem(KEY_STORAGE);
    }
  }

  // Derive key from user ID
  const key = await deriveKey(userId);
  const exported = await exportKey(key);
  localStorage.setItem(KEY_STORAGE, exported);

  return key;
}

/**
 * Clear stored encryption key (on sign out)
 */
export function clearEncryptionKey(): void {
  localStorage.removeItem(KEY_STORAGE);
}

/**
 * Encrypt a string value
 */
export async function encryptString(value: string, key: CryptoKey): Promise<string> {
  if (!value) return '';

  const encoder = new TextEncoder();
  const data = encoder.encode(value);

  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a string value
 */
export async function decryptString(encrypted: string, key: CryptoKey): Promise<string> {
  if (!encrypted) return '';

  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    // Return empty string if decryption fails
    return '';
  }
}

/**
 * Encrypted card content interface
 */
export interface EncryptedCardContent {
  front: string;
  back: string;
  exampleEs: string;
  exampleEn: string;
  notes: string;
  clozeSentence: string;
  clozeWord: string;
}

/**
 * Encrypt card content fields
 */
export async function encryptCardContent(
  content: {
    front: string;
    back: string;
    exampleEs?: string;
    exampleEn?: string;
    notes?: string;
    clozeSentence?: string;
    clozeWord?: string;
  },
  key: CryptoKey
): Promise<EncryptedCardContent> {
  const [front, back, exampleEs, exampleEn, notes, clozeSentence, clozeWord] =
    await Promise.all([
      encryptString(content.front, key),
      encryptString(content.back, key),
      encryptString(content.exampleEs || '', key),
      encryptString(content.exampleEn || '', key),
      encryptString(content.notes || '', key),
      encryptString(content.clozeSentence || '', key),
      encryptString(content.clozeWord || '', key),
    ]);

  return { front, back, exampleEs, exampleEn, notes, clozeSentence, clozeWord };
}

/**
 * Decrypt card content fields
 */
export async function decryptCardContent(
  encrypted: EncryptedCardContent,
  key: CryptoKey
): Promise<{
  front: string;
  back: string;
  exampleEs: string;
  exampleEn: string;
  notes: string;
  clozeSentence: string;
  clozeWord: string;
}> {
  const [front, back, exampleEs, exampleEn, notes, clozeSentence, clozeWord] =
    await Promise.all([
      decryptString(encrypted.front, key),
      decryptString(encrypted.back, key),
      decryptString(encrypted.exampleEs, key),
      decryptString(encrypted.exampleEn, key),
      decryptString(encrypted.notes, key),
      decryptString(encrypted.clozeSentence, key),
      decryptString(encrypted.clozeWord, key),
    ]);

  return { front, back, exampleEs, exampleEn, notes, clozeSentence, clozeWord };
}
