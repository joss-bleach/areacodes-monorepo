// AES-256-GCM encrypt/decrypt via Web Crypto (SubtleCrypto).
// Key is a base64-encoded 32-byte secret from env (TOKEN_ENCRYPTION_KEY).
// Ciphertext format: base64(12-byte-IV || AES-GCM-ciphertext).
// Tokens are decrypted only inside internalActions — never returned by queries or mutations.

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(
  keyBase64: string,
  usage: "encrypt" | "decrypt",
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    base64ToBytes(keyBase64),
    { name: "AES-GCM" },
    false,
    [usage],
  );
}

export async function encryptData(
  plaintext: string,
  keyBase64: string,
): Promise<string> {
  const key = await importKey(keyBase64, "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  return bytesToBase64(combined);
}

export async function decryptData(
  ciphertextBase64: string,
  keyBase64: string,
): Promise<string> {
  const combined = base64ToBytes(ciphertextBase64);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await importKey(keyBase64, "decrypt");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return new TextDecoder().decode(plaintext);
}
