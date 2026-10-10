"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, QrCode, ScanSmiley, WarningCircle, X } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import s from "./CheckInDesk.module.css";

type Result = { ok: boolean; text: string; at: number };

// BarcodeDetector is not in TypeScript's DOM lib yet
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

// Door check-in: type the code from a ticket, or scan its QR with the camera where supported
export default function CheckInDesk({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [scanning, setScanning] = useState(false);
  const canScan = useCanScan();
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  async function admit(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setBusy(true);
    try {
      const booking = await api.checkIn({ eventId, code: value });
      const name = typeof booking.userId === "object" ? booking.userId.name : "Attendee";
      setResults((r) => [{ ok: true, text: `${name} admitted (${booking.ticketType === "vip" ? "VIP" : "General"})`, at: Date.now() }, ...r].slice(0, 5));
      setCode("");
      router.refresh(); // update the table and counts
    } catch (err) {
      setResults((r) => [{ ok: false, text: err instanceof Error ? err.message : "Check-in failed", at: Date.now() }, ...r].slice(0, 5));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    admit(code);
  }

  // Camera scanning: open the camera, look for a QR every 250ms, admit the first one found
  useEffect(() => {
    if (!scanning || !window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let done = false;
    const modal = dialog.current;
    modal?.showModal();
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (!video.current) return;
        video.current.srcObject = s;
        video.current.play();
        timer = setInterval(async () => {
          if (done || !video.current || video.current.readyState < 2) return;
          const [hit] = await detector.detect(video.current).catch(() => []);
          if (hit && !done) {
            done = true;
            setScanning(false);
            admit(hit.rawValue);
          }
        }, 250);
      })
      .catch(() => {
        setResults((r) => [{ ok: false, text: "Camera unavailable. Type the code instead.", at: Date.now() }, ...r].slice(0, 5));
        setScanning(false);
      });
    return () => {
      done = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      modal?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <section className={`card ${s.desk}`} aria-labelledby="desk-title">
      <div className={s.top}>
        <h2 id="desk-title" className="h3">
          <QrCode size={20} aria-hidden="true" /> Check-in desk
        </h2>
        <p className="small muted">Admit guests at the door. Each ticket can only be used once.</p>
      </div>
      <form className={s.form} onSubmit={submit}>
        <label className="sr-only" htmlFor="ticket-code">Ticket code</label>
        <input
          id="ticket-code"
          name="ticket-code"
          className="input mono"
          placeholder="Ticket code, e.g. 9ED707EC5E82D59D…"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
          {busy ? "Checking…" : "Check In"}
        </button>
        {canScan && (
          <button type="button" className="btn btn-secondary" onClick={() => setScanning(true)}>
            <ScanSmiley size={18} aria-hidden="true" /> Scan QR
          </button>
        )}
      </form>

      <ul className={s.results} aria-live="polite">
        {results.map((r) => (
          <li key={r.at} className={`${s.result} ${r.ok ? s.ok : s.bad}`}>
            {r.ok ? <CheckCircle size={18} weight="fill" aria-hidden="true" /> : <WarningCircle size={18} weight="fill" aria-hidden="true" />}
            {r.text}
          </li>
        ))}
      </ul>

      <dialog ref={dialog} className={`dialog ${s.scanner}`} onClose={() => setScanning(false)} aria-label="Scan a ticket QR code">
        <video ref={video} className={s.video} muted playsInline />
        <span className={s.frame} aria-hidden="true" />
        <p className="small muted">Hold the ticket&apos;s QR code inside the frame.</p>
        <button type="button" className="btn btn-ghost" onClick={() => setScanning(false)}>
          <X size={16} aria-hidden="true" /> Close
        </button>
      </dialog>
    </section>
  );
}

// Camera scanning needs BarcodeDetector + a camera API; false on the server and during hydration
const noSubscribe = () => () => {};
function useCanScan() {
  return useSyncExternalStore(
    noSubscribe,
    () => !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia,
    () => false
  );
}
