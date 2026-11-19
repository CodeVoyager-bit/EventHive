import { getCities, getCity, getSessionUser, getUnread } from "@/lib/server";
import NavbarClient from "./NavbarClient";

// Server shell: reads the session cookie so the first paint already shows the signed-in state
export default async function Navbar({ theme }: { theme: "dark" | "light" }) {
  const [user, unread, cities, city] = await Promise.all([getSessionUser(), getUnread(), getCities(), getCity()]);
  return <NavbarClient user={user} initialTheme={theme} unread={unread} cities={cities} city={city} />;
}
