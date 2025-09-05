// app/(dashboard)/layout.tsx  — SERVER component
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header"; // default export (memoized)

export const metadata = {
  title: "Dashboard",
  description: "Appointment Scheduler Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="min-h-screen font-sans bg-gray-100">
      <Header />
      <div className="max-w-5xl mx-auto p-4 md:p-6">{children}</div>
    </div>
  );
}
