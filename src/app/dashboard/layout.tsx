"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { BarChart2, Copy, FileText, Globe, LayoutGrid, Settings as SettingsIcon, Tag, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Content", href: "/dashboard/blogs", icon: FileText },
  { label: "Pages", href: "/dashboard/pages", icon: Copy },
  { label: "Tags", href: "/dashboard/tags", icon: Tag },
  { label: "Authors", href: "/dashboard/authors", icon: Users },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { label: "Domains", href: "/dashboard/domains", icon: Globe },
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
    navItems.find((item) => item.href === pathname)?.label || "Dashboard";

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
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-sm text-zinc-400">Loading workspace…</p>
      </div>
    );
  }

  if (!user) return null;

  if (pathname.startsWith("/dashboard/setup")) {
    return (
      <main className="min-h-screen bg-white px-10 py-10 text-zinc-900">
        <div className="mx-auto max-w-[1000px]">{children}</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 flex h-full w-[220px] flex-col border-r border-zinc-100 bg-white px-4 py-6">
        <div className="mb-6 px-2">
          <div className="text-sm font-semibold tracking-tight text-zinc-900">
            Kreatly
          </div>
          <Link
            href="https://bhanu-personal.kreatly.blog"
            target="_blank"
            className="mt-1 inline-flex items-center text-xs text-zinc-400 hover:text-zinc-700 hover:underline"
          >
            bhanu-personal.kreatly.blog ↗
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-[15px] w-[15px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-zinc-100 pt-4 px-2">
          <p className="truncate text-xs text-zinc-400">{user?.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-900"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-[220px] flex-1 bg-white">
        <div className="border-b border-zinc-100 px-8 py-3.5 text-[13px] text-zinc-400">
          Kreatly /{" "}
          <span className="font-medium text-zinc-900">{breadcrumb}</span>
        </div>
        <main className="px-8 py-8">
          <div className="mx-auto max-w-[960px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
