import { redirect } from "next/navigation";

export const metadata = { title: "Create Station – OpenRadio" };

export default function StationCreatePage() {
  redirect("/dashboard/stations/new");
}
