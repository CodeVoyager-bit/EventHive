import type { Metadata } from "next";
import EventForm from "@/components/EventForm";

export const metadata: Metadata = { title: "Create event" };

export default function CreateEventPage() {
  return <EventForm />;
}
