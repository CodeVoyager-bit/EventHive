"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Plus } from "@phosphor-icons/react";
import { api } from "@/lib/api";

// Follow a host to hear about their new events (optimistic, rolls back on failure)
export default function FollowButton({ hostId, following: initial, signedIn, size = "sm" }: { hostId: string; following: boolean; signedIn: boolean; size?: "sm" | "md" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      await (next ? api.follow(hostId) : api.unfollow(hostId));
      router.refresh();
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={`btn ${following ? "btn-secondary" : "btn-ink"} ${size === "sm" ? "btn-sm" : ""}`} onClick={toggle} disabled={busy} aria-pressed={following}>
      {following ? <Check size={16} weight="bold" aria-hidden="true" /> : <Plus size={16} weight="bold" aria-hidden="true" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
