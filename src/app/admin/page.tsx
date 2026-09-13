import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { readPortfolio } from "@/lib/content";
import AdminEditor from "@/components/admin/AdminEditor";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return <AdminEditor initialData={await readPortfolio()} email={session.admin.email} />;
}
