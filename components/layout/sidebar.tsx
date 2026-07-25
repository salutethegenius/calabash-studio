"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Link2,
  Receipt,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/links", label: "Links", icon: Link2 },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-[var(--calabash-dark-green)] text-[var(--calabash-beige)]">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <Image
            src="/calabash-logo.png"
            alt="Calabash Studio"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <p className="font-heading text-lg font-semibold leading-none tracking-wide text-[var(--calabash-orange)]">
              CALABASH
            </p>
            <p className="font-heading text-xs tracking-[0.18em] text-[var(--calabash-light-green)]">
              STUDIO
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-body transition-colors",
                active
                  ? "bg-[var(--calabash-orange)] text-white"
                  : "text-[var(--calabash-beige)]/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          disabled={signingOut}
          onClick={handleSignOut}
          className="mb-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--calabash-beige)]/80 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        <p className="px-3 text-[11px] text-[var(--calabash-light-green)]">
          Powered by KemisPay
        </p>
      </div>
    </aside>
  );
}
