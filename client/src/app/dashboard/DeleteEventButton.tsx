"use client";

import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import ConfirmButton from "@/components/ConfirmButton";
import { api } from "@/lib/api";

export default function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      title={`Delete “${title}”?`}
      description="All confirmed tickets for this event are cancelled and attendees lose their seats. This cannot be undone."
      confirmLabel="Delete Event"
      onConfirm={async () => {
        await api.deleteEvent(id);
        router.refresh();
      }}
    >
      <Trash size={15} aria-hidden="true" /> Delete
    </ConfirmButton>
  );
}
