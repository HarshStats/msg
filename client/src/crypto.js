// 1. Generate ECDH Key Pair (Public & Private)
export const generateKeys = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKey, privateKey };
};

// 2. Derive Shared Secret (AES-GCM Key)
export const deriveSharedKey = async (privateKeyJwk, publicKeyJwk) => {
  try {
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveKey"]
    );

    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    return await window.crypto.subtle.deriveKey(
      { name: "ECDH", public: publicKey },
      privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } catch (e) {
    console.error("Key derivation failed:", e);
    return null;
  }
};

// 3. Encrypt Message
export const encryptText = async (sharedKey, text) => {
  const encoded = new TextEncoder().encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Random IV

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    sharedKey,
    encoded
  );

  // Combine IV + Encrypted Data -> Base64 String
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
};

// 4. Decrypt Message
export const decryptText = async (sharedKey, encryptedBase64) => {
  try {
    const string = atob(encryptedBase64);
    const buffer = new Uint8Array(string.length);
    for (let i = 0; i < string.length; i++) buffer[i] = string.charCodeAt(i);

    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      sharedKey,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return "🔒 Error Decrypting";
  }
};