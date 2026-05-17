import { redirect } from "next/navigation";

export const metadata = { title: "Create Station – OpenRadio" };

export default function DashboardStationCreatePage() {
  redirect("/dashboard/stations/new");
}
