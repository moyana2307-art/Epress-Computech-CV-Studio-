"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getStaff } from "@/lib/api";

// The main navigation shown on every logged-in page.
const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/create", label: "Create CV" },
  { href: "/clients", label: "Clients" },
  { href: "/documents", label: "Saved Documents" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    setStaff(getStaff());
  }, []);

  function handleSignOut() {
    clearSession();
    router.replace("/login");
  }

  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            E
          </span>
          <span className="text-lg font-semibold text-slate-900">
            Epress CV Studio
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700"
                    : "rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {staff ? (
            <span className="hidden text-sm text-slate-500 sm:inline">
              {staff.name}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
