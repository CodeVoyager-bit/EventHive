"use client";

import { useState } from "react";
import { Check, LinkSimple } from "@phosphor-icons/react";

// Copies a link that auto-applies a promo code (?code=), for influencers and college groups
export default function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(path, location.origin).toString()).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check size={15} weight="bold" aria-hidden="true" /> : <LinkSimple size={15} weight="bold" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}
