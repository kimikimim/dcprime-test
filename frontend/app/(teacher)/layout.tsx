import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NavBar from "./_components/NavBar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  const adminPassword = process.env.ADMIN_PASSWORD ?? "dcprime1234";

  if (!session || session.value !== adminPassword) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
