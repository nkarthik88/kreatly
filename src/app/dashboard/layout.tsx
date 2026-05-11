"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import {
  FileText,
  MessageSquare,
  Mic,
  PenSquare,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

const navItems = [
  { label: "Blogs", href: "/dashboard/blogs", icon: FileText },
  { label: "Writer", href: "/dashboard/studio", icon: PenSquare },
  { label: "Interviews", href: "/dashboard/interviews", icon: Mic },
  { label: "Meadow", href: "/dashboard/meadow", icon: Sparkles },
  { label: "Replier", href: "/dashboard/replier", icon: MessageSquare },
  { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const breadcrumb =
    navItems.find((item) => item.href === pathname)?.label || "Blogs";

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-black">
        <p className="text-sm text-slate-500">Loading workspace…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white text-black flex">
      <aside className="fixed left-0 top-0 flex h-full w-[240px] flex-col border-r border-zinc-200 bg-white px-5 py-6">
        <div className="mb-8 text-base font-semibold tracking-tight">Kreatly</div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard/interviews" &&
                pathname.startsWith("/dashboard/transcriber")) ||
              (item.href === "/dashboard/blogs" &&
                (pathname.startsWith("/dashboard/archive") ||
                  pathname.startsWith("/dashboard/blogs") ||
                  pathname.startsWith("/dashboard/vault")));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-black"
                    : "text-zinc-500 hover:text-black"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-zinc-200 pt-4">
          <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 text-[11px] font-medium text-zinc-500 hover:text-black"
          >
            Logout
          </button>
        </div>
      </aside>
      <div className="ml-[240px] flex-1 bg-white">
        <div className="border-b border-zinc-200 px-10 py-4 text-sm text-zinc-500">
          Kreatly / <span className="text-black">{breadcrumb}</span>
        </div>
        <div className="bg-white">{children}</div>
      </div>
    </div>
  );
}
