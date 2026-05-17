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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-200">
        <p className="text-sm text-zinc-600">Loading workspace…</p>
      </div>
    );
  }

  if (!user) return null;

  // Hide sidebar during setup flow for a focused onboarding experience
  if (pathname.startsWith("/dashboard/setup")) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] px-10 py-10 text-zinc-200">
        <div className="mx-auto max-w-[1000px]">{children}</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-zinc-200">
      <aside className="fixed left-0 top-0 flex h-full w-[260px] flex-col border-r border-zinc-800 bg-zinc-950 px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-zinc-50">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-zinc-950">K</span>
            Kreatly
          </div>
          <Link
            href="https://bhanu-personal.kreatly.blog"
            target="_blank"
            className="mt-1 inline-flex items-center text-xs font-medium text-cyan-500 hover:text-cyan-400 hover:underline"
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
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-100 ${
                  isActive
                    ? "bg-zinc-800 text-cyan-400 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-zinc-800 pt-4">
          <p className="truncate text-xs text-zinc-600">{user?.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 text-[11px] font-medium text-zinc-600 transition hover:text-amber-400"
          >
            Logout
          </button>
        </div>
      </aside>
      <div className="ml-[260px] flex-1 bg-[#0a0a0a]">
        <div className="border-b border-zinc-800 px-10 py-4 text-sm text-zinc-600">
          Kreatly / <span className="font-medium text-zinc-300">{breadcrumb}</span>
        </div>
        <main className="bg-[#0a0a0a] px-10 py-10">
          <div className="mx-auto max-w-[1000px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
