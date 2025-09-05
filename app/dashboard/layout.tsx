// app/(dashboard)/layout.tsx  — SERVER component
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header"; // default export (memoized)
import ClientProviders from "@/components/ClientProvider";

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
      <div className="max-w-5xl mx-auto p-0 md:p-6">
        <ClientProviders>{children}</ClientProviders>
      </div>
    </div>
  );
}
