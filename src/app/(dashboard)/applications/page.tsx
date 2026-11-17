import { redirect } from "next/navigation";

// Applications are the "Applied" tab of the Today inbox.
export default function ApplicationsPage() {
  redirect("/dashboard?tab=applied");
}
