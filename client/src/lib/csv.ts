// Spreadsheet-safe CSV download, shared by the guest list and the audience page

// Text that starts like a formula is neutralised so a spreadsheet won't run it
const cell = (v: string | number) => {
  const s = String(v);
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export function downloadCsv(filename: string, head: string[], rows: (string | number)[][]) {
  // BOM so Excel reads UTF-8 (Indian names, ₹) correctly; CRLF line ends per RFC 4180
  const text = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); // revoking at once can cancel the download in some browsers
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
