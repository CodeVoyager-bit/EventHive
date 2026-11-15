import { getSessionUser } from "@/lib/server";
import NavbarClient from "./NavbarClient";

// Server shell: reads the session cookie so the first paint already shows the signed-in state
export default async function Navbar({ theme }: { theme: "dark" | "light" }) {
  const user = await getSessionUser();
  return <NavbarClient user={user} initialTheme={theme} />;
}
