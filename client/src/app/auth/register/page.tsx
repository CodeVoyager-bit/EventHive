import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";
import AuthShell from "../AuthShell";
import { getSessionUser } from "@/lib/server";
import { PHOTOS } from "@/lib/photos";
import { safeNext } from "../safeNext";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);

  return (
    <AuthShell image={PHOTOS.register} title="Front row starts here.">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
