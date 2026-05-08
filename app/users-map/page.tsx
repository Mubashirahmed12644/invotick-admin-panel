import type { Metadata } from "next";
import UsersMapDashboard from "@/features/users-map/UsersMapDashboard";

export const metadata: Metadata = {
  title: "Users Map – Invotics Webpanel",
};

export default function UsersMapPage() {
  return <UsersMapDashboard />;
}
