import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";
import AuthShell from "../AuthShell";
import { getSessionUser } from "@/lib/server";
import { PHOTOS } from "@/lib/photos";
import { safeNext } from "../safeNext";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSessionUser()) redirect(next);

  return (
    <AuthShell image={PHOTOS.register} title="Front row starts here." tone="blue">
      <RegisterForm next={next} role={params.role === "organizer" ? "organizer" : "attendee"} />
    </AuthShell>
  );
}
