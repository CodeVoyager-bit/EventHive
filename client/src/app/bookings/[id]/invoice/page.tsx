import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Logo from "@/components/Logo";
import PrintButton from "./PrintButton";
import { apiFetch, ApiError } from "@/lib/server";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Booking } from "@/types";
import s from "./invoice.module.css";

export const metadata: Metadata = { title: "Invoice" };

// A GST-style tax invoice (the Townscript / KonfHub pattern). Payments are simulated, so it says so.
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await apiFetch<Booking>(`/bookings/${id}`).catch((err) => {
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) notFound();
    throw err;
  });
  const buyer = typeof booking.userId === "object" ? booking.userId : null;
  const p = booking.pricing;
  const number = `EH-${booking._id.slice(-8).toUpperCase()}`;

  return (
    <div className="container">
      <div className={`${s.bar} no-print`}>
        <Link href="/bookings" className="text-link"><ArrowLeft size={16} aria-hidden="true" /> My tickets</Link>
        <PrintButton />
      </div>

      <article className={s.invoice}>
        <header className={s.head}>
          <div className={s.brand}>
            <Logo size={34} />
            <strong>EventHive</strong>
          </div>
          <div className={s.meta}>
            <h1 className={s.title}>Tax invoice</h1>
            <p className="mono">No. {number}</p>
            <p className="mono">Date {formatDate(booking.bookingDate, { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </header>

        <div className={s.parties}>
          <div>
            <p className="tag muted">Billed to</p>
            <p><strong>{buyer?.name}</strong></p>
            <p>{buyer?.email}</p>
          </div>
          <div>
            <p className="tag muted">Event</p>
            <p><strong>{booking.eventId?.title ?? "Deleted event"}</strong></p>
            {booking.eventId && <p>{formatDateTime(booking.eventId.date)}, {booking.eventId.location}</p>}
          </div>
        </div>

        <table className={s.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>SAC</th>
              <th className={s.num}>Qty</th>
              <th className={s.num}>Rate</th>
              <th className={s.num}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{booking.tierName} ticket<span className={s.sub}>Collected on behalf of the event host</span></td>
              <td>-</td>
              <td className={s.num}>{booking.quantity}</td>
              <td className={s.num}>{formatMoney(booking.unitPrice)}</td>
              <td className={s.num}>{formatMoney(p.subtotal)}</td>
            </tr>
            {(p.group ?? 0) > 0 && (
              <tr>
                <td>Group discount</td>
                <td>-</td>
                <td className={s.num}>1</td>
                <td className={s.num}>−{formatMoney(p.group!)}</td>
                <td className={s.num}>−{formatMoney(p.group!)}</td>
              </tr>
            )}
            {p.discount - (p.group ?? 0) > 0.005 && (
              <tr>
                <td>Promo code {booking.promoCode}</td>
                <td>-</td>
                <td className={s.num}>1</td>
                <td className={s.num}>−{formatMoney(p.discount - (p.group ?? 0))}</td>
                <td className={s.num}>−{formatMoney(p.discount - (p.group ?? 0))}</td>
              </tr>
            )}
            {p.fee > 0 && (
              <tr>
                <td>Platform fee<span className={s.sub}>2.5% + ₹10 per ticket</span></td>
                <td>998599</td>
                <td className={s.num}>1</td>
                <td className={s.num}>{formatMoney(p.fee)}</td>
                <td className={s.num}>{formatMoney(p.fee)}</td>
              </tr>
            )}
            {p.gst > 0 && (
              <>
                <tr>
                  <td>CGST @ 9% on platform fee</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className={s.num}>{formatMoney(p.gst / 2)}</td>
                </tr>
                <tr>
                  <td>SGST @ 9% on platform fee</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className={s.num}>{formatMoney(p.gst / 2)}</td>
                </tr>
              </>
            )}
            {p.protection > 0 && (
              <tr>
                <td>Refund Protection</td>
                <td>997139</td>
                <td className={s.num}>1</td>
                <td className={s.num}>{formatMoney(p.protection)}</td>
                <td className={s.num}>{formatMoney(p.protection)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {p.fee > 0 && p.total < p.subtotal - p.discount + p.fee + p.gst + p.protection - 0.005 && (
              <tr>
                <td colSpan={4}>Fees covered by the host</td>
                <td className={s.num}>−{formatMoney(p.fee + p.gst)}</td>
              </tr>
            )}
            <tr className={s.total}>
              <td colSpan={4}>Total paid</td>
              <td className={s.num}>{formatMoney(p.total)}</td>
            </tr>
          </tfoot>
        </table>

        <footer className={s.foot}>
          <p className="mono small">Payment reference {booking.transactionId ?? "n/a"} · Status {booking.status}</p>
          {booking.refundAmount ? <p className="mono small">Refunded {formatMoney(booking.refundAmount)}</p> : null}
          <p className="small muted">EventHive is a portfolio project. Payments are simulated and this invoice is not a valid tax document.</p>
        </footer>
      </article>
    </div>
  );
}
