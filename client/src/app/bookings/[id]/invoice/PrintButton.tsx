"use client";

import { Printer } from "@phosphor-icons/react";

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
      <Printer size={16} weight="bold" aria-hidden="true" /> Print or save as PDF
    </button>
  );
}
