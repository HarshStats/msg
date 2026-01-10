import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * 1. GENERATE KEYS (Identity)
 * Creates a Public Key (Identity) and Secret Key (Password).
 */
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
};

/**
 * 2. ENCRYPT (Lock the box)
 * Takes text -> Returns { ciphertext, nonce }
 */
export const encryptMessage = (text, receiverPublicKey, mySecretKey) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength); // Randomizer
  const messageUint8 = new TextEncoder().encode(text);
  
  // Encrypt
  const encryptedBox = nacl.box(
    messageUint8,
    nonce,
    decodeBase64(receiverPublicKey),
    decodeBase64(mySecretKey)
  );

  return {
    ciphertext: encodeBase64(encryptedBox),
    nonce: encodeBase64(nonce)
  };
};

/**
 * 3. DECRYPT (Open the box)
 * Takes encrypted package -> Returns text
 */
export const decryptMessage = (encryptedPackage, senderPublicKey, mySecretKey) => {
  const decrypted = nacl.box.open(
    decodeBase64(encryptedPackage.ciphertext),
    decodeBase64(encryptedPackage.nonce),
    decodeBase64(senderPublicKey),
    decodeBase64(mySecretKey)
  );

  if (!decrypted) throw new Error('Decryption failed');
  return new TextDecoder().decode(decrypted);
};