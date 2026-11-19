import { test } from "node:test";
import assert from "node:assert/strict";
import { quote } from "../domain/pricing";
import { refundFor, refundPolicyFor } from "../domain/policies";
import { codeAt, newRef, parseDoorCode, stepAt, STEP_MS, verifyCode, newSecret } from "../domain/totp";

test("pricing: fee is 2.5% + ₹10 per ticket, GST is 18% of the fee, promo and protection apply to the net", () => {
  const q = quote({ unitPrice: 500, quantity: 2, promo: null, protection: false, absorbFees: false });
  assert.deepEqual(q, { subtotal: 1000, discount: 0, group: 0, fee: 45, gst: 8.1, protection: 0, total: 1053.1, payout: 1000, absorbFees: false });

  const promo = quote({ unitPrice: 500, quantity: 2, promo: { kind: "percent", amount: 20 }, protection: true, absorbFees: false });
  assert.equal(promo.discount, 200);
  assert.equal(promo.fee, 40); // 2.5% of 800 + 20
  assert.equal(promo.protection, 48); // 6% of 800
  assert.equal(promo.total, 800 + 40 + 7.2 + 48);

  const flat = quote({ unitPrice: 150, quantity: 1, promo: { kind: "flat", amount: 500 }, protection: false, absorbFees: false });
  assert.equal(flat.discount, 150, "a discount never exceeds the subtotal");
  assert.equal(flat.total, 0);

  const absorbed = quote({ unitPrice: 1000, quantity: 1, promo: null, protection: false, absorbFees: true });
  assert.equal(absorbed.total, 1000, "buyer pays the ticket price only");
  assert.equal(absorbed.payout, 1000 - 35 - 6.3, "host pays the fee and its GST");

  const free = quote({ unitPrice: 0, quantity: 3, promo: null, protection: true, absorbFees: false });
  assert.equal(free.total, 0, "free tickets carry no fee or protection");

  const group = { minQty: 4, percent: 10 };
  assert.equal(quote({ unitPrice: 250, quantity: 3, group, protection: false, absorbFees: false }).discount, 0, "below the group size");
  const crowd = quote({ unitPrice: 250, quantity: 4, group, promo: { kind: "flat", amount: 100 }, protection: false, absorbFees: false });
  assert.deepEqual([crowd.group, crowd.discount], [100, 200], "10% of 1000, then ₹100 off the rest");
  assert.equal(crowd.fee, 2.5 / 100 * 800 + 40, "fees are on what's actually paid");

  const waitlisted = quote({ unitPrice: 1000, quantity: 1, promo: null, protection: true, freeProtection: true, absorbFees: false });
  assert.equal(waitlisted.protection, 0, "waitlist bookings get protection on the house");
});

test("refunds: policy windows, protection, and nothing after the start", () => {
  const pricing = { subtotal: 1000, discount: 100, fee: 32.5, gst: 5.85, protection: 54, total: 992.35 };
  const eventDate = new Date("2030-06-10T19:00:00Z");
  const at = (iso: string) => new Date(iso);

  assert.equal(refundFor(pricing, { eventDate, policy: "flexible", protection: false, now: at("2030-06-09T18:00:00Z") }), 900);
  assert.equal(refundFor(pricing, { eventDate, policy: "flexible", protection: false, now: at("2030-06-09T20:00:00Z") }), 0, "inside 24h");
  assert.equal(refundFor(pricing, { eventDate, policy: "moderate", protection: false, now: at("2030-06-02T19:00:00Z") }), 900);
  assert.equal(refundFor(pricing, { eventDate, policy: "moderate", protection: false, now: at("2030-06-04T19:00:00Z") }), 0, "inside 7 days");
  assert.equal(refundFor(pricing, { eventDate, policy: "strict", protection: false, now: at("2030-01-01T00:00:00Z") }), 0);
  assert.equal(refundFor(pricing, { eventDate, policy: "strict", protection: true, now: at("2030-06-10T18:00:00Z") }), 938.35, "everything but the protection fee");
  assert.equal(refundFor(pricing, { eventDate, policy: "flexible", protection: true, now: at("2030-06-10T19:30:00Z") }), 0, "after the start");
  assert.equal(refundPolicyFor("unknown").name, "flexible", "the factory falls back to flexible");
});

test("rotating code: valid now and one step back, rejected after that, and differs per secret", () => {
  const secret = newSecret();
  const now = Date.now();
  const step = stepAt(now);
  assert.match(codeAt(secret, step), /^\d{6}$/);
  assert.ok(verifyCode(secret, codeAt(secret, step), now));
  assert.ok(verifyCode(secret, codeAt(secret, step - 1), now), "a code from the previous 30s still scans");
  assert.ok(!verifyCode(secret, codeAt(secret, step - 2), now), "a screenshot older than a minute fails");
  assert.ok(!verifyCode(newSecret(), codeAt(secret, step), now), "another ticket's code fails");
  assert.ok(verifyCode(secret, codeAt(secret, stepAt(now + STEP_MS)), now + STEP_MS));

  // Known-answer vector, so the browser implementation (client/src/lib/totp.ts) can be checked against it
  const rfcKey = "3132333435363738393031323334353637383930"; // "12345678901234567890", the RFC 4226 test key
  assert.equal(codeAt(rfcKey, 1), "247374");
  assert.equal(codeAt(rfcKey, 59_000_000), "639076");
});

test("door codes: QR payloads and typed codes parse, junk does not", () => {
  assert.deepEqual(parseDoorCode("EH1:ABCDEF:123456"), { ref: "ABCDEF", code: "123456" });
  assert.deepEqual(parseDoorCode(" abcdef 123 456 "), { ref: "ABCDEF", code: "123456" });
  assert.equal(parseDoorCode("ABCDE 123456"), null);
  assert.equal(parseDoorCode("hello"), null);
  assert.match(newRef(), /^[A-HJ-NP-Z]{6}$/, "no I or O");
});
