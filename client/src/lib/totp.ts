// Browser twin of server/src/domain/totp.ts: the ticket owner's device computes the rotating door code
// from the ticket secret with Web Crypto, so the live QR works offline and screenshots expire.
export const STEP_MS = 30_000;
export const stepAt = (ms: number) => Math.floor(ms / STEP_MS);

const keys = new Map<string, Promise<CryptoKey>>();
function keyFor(secretHex: string) {
  let key = keys.get(secretHex);
  if (!key) {
    const bytes = new Uint8Array(secretHex.match(/../g)!.map((h) => parseInt(h, 16)));
    key = crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    keys.set(secretHex, key);
  }
  return key;
}

// HOTP (RFC 4226) dynamic truncation over HMAC-SHA256, 6 digits
export async function codeAt(secretHex: string, step: number): Promise<string> {
  const msg = new ArrayBuffer(8);
  new DataView(msg).setBigUint64(0, BigInt(step));
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", await keyFor(secretHex), msg));
  const o = mac[mac.length - 1] & 0x0f;
  const bin = (((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3]) % 1_000_000;
  return String(bin).padStart(6, "0");
}

export const qrPayload = (ref: string, code: string) => `EH1:${ref}:${code}`;
