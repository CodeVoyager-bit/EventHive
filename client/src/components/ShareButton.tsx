"use client";

import { useState } from "react";
import { Check, ShareNetwork } from "@phosphor-icons/react";

// Native share sheet where available; otherwise copy the link
export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={share}>
      {copied ? <Check size={16} weight="bold" aria-hidden="true" /> : <ShareNetwork size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Link Copied" : "Share"}</span>
    </button>
  );
}
