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
      <div className="flex min-h-screen items-center justify-center bg-white text-black">
        <p className="text-sm text-slate-500">Loading workspace…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-white text-black">
      <aside className="fixed left-0 top-0 flex h-full w-[260px] flex-col border-r border-zinc-200 bg-[#f8f9fa] px-6 py-6">
        <div className="mb-6">
          <div className="text-xl font-semibold tracking-tight text-black">
            Kreatly
          </div>
          <Link
            href="https://bhanu-personal.kreatly.blog"
            target="_blank"
            className="mt-1 inline-flex items-center text-xs font-medium text-sky-600 hover:underline"
          >
            bhanu-personal.kreatly.blog ↗
          </Link>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-200 text-sky-700"
                    : "text-zinc-700 hover:bg-gray-200 hover:text-black"
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
      <div className="ml-[260px] flex-1 bg-white">
        <div className="border-b border-zinc-200 px-10 py-4 text-sm text-zinc-500">
          Kreatly / <span className="font-medium text-black">{breadcrumb}</span>
        </div>
        <main className="bg-white px-10 py-10">
          <div className="mx-auto max-w-[1000px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
