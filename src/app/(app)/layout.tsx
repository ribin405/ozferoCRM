import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  return (
    <div className="app">
      <Sidebar name={profile.full_name || profile.email || "User"} isAdmin={profile.role === "admin"} />
      <main className="main">{children}</main>
    </div>
  );
}
