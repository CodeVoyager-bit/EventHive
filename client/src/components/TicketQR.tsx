"use client";

import { QRCodeSVG } from "qrcode.react";

export default function TicketQR({ code, size = 96 }: { code: string; size?: number }) {
  return <QRCodeSVG value={code} size={size} level="M" aria-label={`QR code for ticket ${code}`} />;
}
