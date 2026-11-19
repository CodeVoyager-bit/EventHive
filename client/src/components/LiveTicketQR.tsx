"use client";

import { Suspense, use, useDeferredValue, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { codeAt, qrPayload, STEP_MS } from "@/lib/totp";
import s from "./LiveTicketQR.module.css";

type Props = { secret: string; ticketRef: string; size?: number };

// A 1-second clock shared by every live ticket on the page
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const nowSeconds = () => Math.floor(Date.now() / 1000);

// Codes are computed once per (secret, 30s step) and reused across renders. Web Crypto only exists on
// secure pages (https or localhost); elsewhere the code resolves to null and we say so instead of crashing.
const cache = new Map<string, Promise<string | null>>();
function codeFor(secret: string, step: number) {
  const key = `${secret}:${step}`;
  let p = cache.get(key);
  if (!p) {
    p = globalThis.crypto?.subtle ? codeAt(secret, step).catch(() => null) : Promise.resolve(null);
    cache.set(key, p);
    if (cache.size > 64) cache.delete(cache.keys().next().value!);
  }
  return p;
}

// The live ticket: a QR and door code that change every 30 seconds (a screenshot stops working
// within a minute), with a sheen sweeping across so staff can tell it's live, not a photo.
export default function LiveTicketQR(props: Props) {
  const now = useSyncExternalStore(subscribe, nowSeconds, () => null);
  const placeholder = <div className={s.placeholder} style={{ width: props.size ?? 168, height: props.size ?? 168 }} aria-hidden="true" />;
  if (now === null) return placeholder; // rendered on the device only: the code depends on its clock
  return (
    <Suspense fallback={placeholder}>
      <Live {...props} now={now} />
    </Suspense>
  );
}

function Live({ secret, ticketRef, size = 168, now }: Props & { now: number }) {
  const step = useDeferredValue(Math.floor((now * 1000) / STEP_MS)); // keep the old code on screen until the new one is ready
  const code = use(codeFor(secret, step));
  const left = STEP_MS / 1000 - (now % (STEP_MS / 1000));
  if (code === null) {
    return (
      <p className={s.unsupported} role="alert">
        This browser can&apos;t make the live code on an insecure connection. Open EventHive over https, or show reference <strong>{ticketRef}</strong> at the door.
      </p>
    );
  }
  return (
    <div className={s.wrap}>
      <div className={s.qr}>
        <QRCodeSVG value={qrPayload(ticketRef, code)} size={size} level="M" bgColor="#ffffff" fgColor="#16161d" marginSize={0} aria-label={`Live ticket QR for ${ticketRef}`} />
        <span className={s.sheen} aria-hidden="true" />
      </div>
      <p className={s.code}>
        <span className="sr-only">Door code </span>
        <span>{ticketRef}</span>
        <span className={s.digits}>{code.slice(0, 3)} {code.slice(3)}</span>
      </p>
      <div className={s.timerRow}>
        <div className={s.timer} aria-hidden="true">
          <span key={step} className={s.bar} style={{ animationDelay: `-${STEP_MS / 1000 - left}s` }} />
        </div>
        <span className={s.secs}>New code in {left}s</span>
      </div>
    </div>
  );
}
