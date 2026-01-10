// client/src/crypto.js
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
  );
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return { publicKey: publicKeyJwk, privateKey: privateKeyJwk };
};

export const deriveSharedKey = async (myPrivateKeyJwk, friendPublicKeyJwk) => {
  try {
    const myPrivateKey = await window.crypto.subtle.importKey(
      "jwk", myPrivateKeyJwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
    );
    const friendPublicKey = await window.crypto.subtle.importKey(
      "jwk", friendPublicKeyJwk, { name: "ECDH", namedCurve: "P-256" }, true, []
    );
    return await window.crypto.subtle.deriveKey(
      { name: "ECDH", public: friendPublicKey }, myPrivateKey,
      { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
  } catch (e) { return null; }
};

export const encryptText = async (sharedKey, text) => {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, sharedKey, encoder.encode(text)
  );
  return JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) });
};

export const decryptText = async (sharedKey, cipherTextString) => {
  try {
    const { iv, data } = JSON.parse(cipherTextString);
    const decoder = new TextDecoder();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) }, sharedKey, new Uint8Array(data)
    );
    return decoder.decode(decrypted);
  } catch (e) { return "🔒 Encrypted"; }
};