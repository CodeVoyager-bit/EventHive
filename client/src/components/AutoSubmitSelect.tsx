"use client";

import type { SelectHTMLAttributes } from "react";

// A <select> that applies its form as soon as it changes (no separate "Apply" step)
export default function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
