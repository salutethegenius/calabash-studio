import { redirect } from "next/navigation";

/** Middleware already redirects `/` based on session cookie presence. */
export default function HomePage() {
  redirect("/login");
}
