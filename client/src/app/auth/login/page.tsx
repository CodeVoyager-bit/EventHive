import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import AuthShell from "../AuthShell";
import { getSessionUser } from "@/lib/server";
import { PHOTOS } from "@/lib/photos";
import { safeNext } from "../safeNext";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);

  return (
    <AuthShell image={PHOTOS.login} title="Your tickets are waiting.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
