"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checks } from "@phosphor-icons/react";
import { api } from "@/lib/api";

export default function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api.markRead().catch(() => {});
        router.refresh();
        setBusy(false);
      }}
    >
      <Checks size={16} weight="bold" aria-hidden="true" /> Mark all read
    </button>
  );
}
