"use client";

import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";

// Says exactly what comes back before anyone confirms (policy, or Refund Protection)
export default function CancelBookingButton({ id, refund, pending, paid }: { id: string; refund: number; pending: boolean; paid: boolean }) {
  const router = useRouter();
  const description = pending
    ? "Your request is withdrawn and the seat goes back to the host. You haven't been charged."
    : !paid
      ? "Your seats are released for someone else."
      : refund > 0
        ? `You'll get ${formatMoney(refund)} back and your seats go to the next person in line. This can't be undone.`
        : "Under this event's refund policy you won't get money back. Sending your ticket to a friend might be better. This can't be undone.";
  return (
    <ConfirmButton
      className="btn btn-ghost btn-sm"
      title={pending ? "Withdraw your request?" : "Cancel this booking?"}
      description={description}
      confirmLabel={pending ? "Withdraw" : "Cancel booking"}
      onConfirm={async () => {
        await api.cancelBooking(id);
        router.refresh();
      }}
    >
      {pending ? "Withdraw request" : "Cancel booking"}
    </ConfirmButton>
  );
}
