"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import { api } from "@/lib/api";

export default function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      title={`Delete “${title}”?`}
      description="All confirmed tickets for this event are cancelled and attendees lose their seats. This cannot be undone."
      confirmLabel="Yes, delete it"
      onConfirm={async () => {
        await api.deleteEvent(id);
        router.refresh();
      }}
    >
      <Trash2 size={14} aria-hidden="true" /> Delete
    </ConfirmButton>
  );
}
