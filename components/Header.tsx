"use client";

import Link from "next/link";
import { UserButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, isLoaded } = useUser();

  return (
    <header className="bg-violet-600 px-6 py-4 flex items-center justify-between text-gray-100">
      <div className="flex items-center space-x-6">
        <Link
          href="/dashboard"
          className="text-xl font-semibold hover:underline"
        >
          Scheduler
        </Link>
        <Link href="/dashboard/appointments" className="hover:underline">
          Appointments
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <span className="text-sm" suppressHydrationWarning>
          {user?.firstName ? `Hi, ${user.firstName}` : " "}
        </span>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut />
      </div>
    </header>
  );
}
