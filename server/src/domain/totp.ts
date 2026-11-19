import crypto from "crypto";

// Rotating ticket codes (the idea behind Ticketmaster SafeTix / AXS Mobile ID).
// The ticket owner's browser computes the same code from the ticket secret (see client/src/lib/totp.ts),
// so the QR keeps working offline, and a screenshot stops working within a minute.

export const STEP_MS = 30_000;

export const newSecret = () => crypto.randomBytes(20).toString("hex");

// HOTP (RFC 4226) dynamic truncation over HMAC-SHA256, 6 digits
export function codeAt(secret: string, step: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const mac = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return bin.toString().padStart(6, "0");
}

export const stepAt = (ms: number) => Math.floor(ms / STEP_MS);

// Accept the current step and the one before it (a code shown up to ~60s ago)
export function verifyCode(secret: string, code: string, now = Date.now()): boolean {
  const step = stepAt(now);
  return [step, step - 1].some((s) => {
    const expected = Buffer.from(codeAt(secret, s));
    const given = Buffer.from(code.padStart(6, "0").slice(-6));
    return crypto.timingSafeEqual(expected, given);
  });
}

// Ticket references: 6 letters, no I or O so they can be read aloud at the door
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const newRef = () =>
  Array.from(crypto.randomBytes(6), (b) => LETTERS[b % LETTERS.length]).join("");

// Accepts the QR payload "EH1:ABCDEF:123456" or a typed door code "ABCDEF 123456"
export function parseDoorCode(input: string): { ref: string; code: string } | null {
  const s = input.toUpperCase().replace(/^EH1:/, "").replace(/[\s:-]+/g, "");
  const m = /^([A-Z]{6})(\d{6})$/.exec(s);
  return m ? { ref: m[1], code: m[2] } : null;
}
