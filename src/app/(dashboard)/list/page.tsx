import { redirect } from "next/navigation";

// Your list lives on the Companies page now.
export default function ListPage() {
  redirect("/companies");
}
