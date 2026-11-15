import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventForm from "@/components/EventForm";
import { apiFetch, ApiError, getSessionUser } from "@/lib/server";
import { refId } from "@/lib/format";
import type { Event } from "@/types";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, user] = await Promise.all([
    apiFetch<Event>(`/events/${id}`).catch((err) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
      throw err;
    }),
    getSessionUser(),
  ]);
  if (!user || (user.role !== "admin" && refId(event.organizerId) !== user.id)) notFound();

  return <EventForm initial={event} />;
}
