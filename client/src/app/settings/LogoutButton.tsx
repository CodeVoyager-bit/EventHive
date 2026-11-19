"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { forgetOfflineTickets } from "@/components/ServiceWorker";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-block"
      onClick={async () => {
        await api.logout();
        await forgetOfflineTickets();
        router.push("/");
        router.refresh();
      }}
    >
      <SignOut size={18} weight="bold" aria-hidden="true" /> Log out
    </button>
  );
}
