"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function VerifyToggle({ hostId, verified: initial, name }: { hostId: string; verified: boolean; name: string }) {
  const router = useRouter();
  const [verified, setVerified] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`chip ${verified ? "on" : ""}`}
      aria-pressed={verified}
      aria-label={`${verified ? "Unverify" : "Verify"} ${name}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.verifyHost(hostId, !verified);
          setVerified(!verified);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {verified ? "Verified" : "Verify"}
    </button>
  );
}
