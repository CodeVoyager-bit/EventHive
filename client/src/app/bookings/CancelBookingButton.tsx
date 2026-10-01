"use client";

import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { api } from "@/lib/api";

export default function CancelBookingButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="Cancel this ticket?"
      description="Your seat is released for someone else and the payment is refunded. This cannot be undone."
      confirmLabel="Yes, cancel it"
      onConfirm={async () => {
        await api.cancelBooking(id);
        router.refresh();
      }}
    >
      Cancel ticket
    </ConfirmButton>
  );
}
