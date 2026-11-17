import { redirect } from "next/navigation";

// Matches now live in the Today inbox.
export default function MatchesPage() {
  redirect("/dashboard");
}
