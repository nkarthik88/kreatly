"use client";

import { useState } from "react";
import { ExternalLink, Link2, Tag, User, FileText, Globe2 } from "lucide-react";

type LinkType =
  | "external"
  | "notion_page"
  | "notion_post"
  | "notion_tag"
  | "notion_author"
  | "generated_page";

type NavLink = {
  id: string;
  name: string;
  description?: string;
  type: LinkType;
};

const linkTypeOptions: { value: LinkType; label: string }[] = [
  { value: "external", label: "External URL" },
  { value: "notion_page", label: "Notion Page" },
  { value: "notion_post", label: "Notion Post" },
  { value: "notion_tag", label: "Notion Tag" },
  { value: "notion_author", label: "Notion Author" },
  { value: "generated_page", label: "Generated Page" },
];

export default function NavigationSettingsPage() {
  const [logoMode, setLogoMode] = useState<"text" | "image">("text");
  const [logoLink, setLogoLink] = useState<string>("https://bhanu-personal.kreatly.blog");

  const [headerLinks, setHeaderLinks] = useState<NavLink[]>([]);
  const [footerLinks, setFooterLinks] = useState<NavLink[]>([]);
  const [drawerSection, setDrawerSection] = useState<"header" | "footer" | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftType, setDraftType] = useState<LinkType>("external");

  function resetDrawer() {
    setDraftName("");
    setDraftDescription("");
    setDraftType("external");
  }

  function openDrawer(section: "header" | "footer") {
    setDrawerSection(section);
    resetDrawer();
  }

  function addLink() {
    if (!draftName.trim()) return;
    const payload: NavLink = {
      id: `${Date.now()}`,
      name: draftName.trim(),
      description: draftDescription.trim() || undefined,
      type: draftType,
    };
    if (drawerSection === "header") {
      setHeaderLinks((prev) => [...prev, payload]);
    } else if (drawerSection === "footer") {
      setFooterLinks((prev) => [...prev, payload]);
    }
    setDrawerSection(null);
    resetDrawer();
  }

  return (
    <main className="bg-white px-10 py-10 text-black">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Settings · Website
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Navigation</h1>
          <p className="text-sm text-zinc-500">
            Control your site header, logo, and footer links for a Feather-style navigation.
          </p>
        </header>

        {/* Logo section */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight text-black">Logo</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Choose how your brand appears in the top left of your site.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLogoMode("text")}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                logoMode === "text"
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setLogoMode("image")}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                logoMode === "image"
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              Image
            </button>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-zinc-700" htmlFor="logo-link">
              Logo Link
            </label>
            <input
              id="logo-link"
              type="url"
              value={logoLink}
              onChange={(event) => setLogoLink(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="https://yourdomain.com"
            />
          </div>
        </section>

        {/* Header links */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-black">Header Links</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Add navigation links shown in the top bar next to your logo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDrawer("header")}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-100"
            >
              + Add new link
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {headerLinks.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No header links yet. Start by adding your main navigation items.
              </p>
            ) : (
              headerLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-zinc-800">{link.name}</p>
                    {link.description ? (
                      <p className="text-[11px] text-zinc-500">{link.description}</p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    {renderTypeIcon(link.type)}
                    {linkTypeOptions.find((t) => t.value === link.type)?.label ?? link.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Footer links */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-black">Footer Links</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Control privacy, legal, and utility links in the global footer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDrawer("footer")}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-100"
            >
              + Add new link
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {footerLinks.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No footer links yet. Add your legal, privacy, and contact links.
              </p>
            ) : (
              footerLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-zinc-800">{link.name}</p>
                    {link.description ? (
                      <p className="text-[11px] text-zinc-500">{link.description}</p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    {renderTypeIcon(link.type)}
                    {linkTypeOptions.find((t) => t.value === link.type)?.label ?? link.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Drawer-like inline editor */}
        {drawerSection ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {drawerSection === "header" ? "Add Header Link" : "Add Footer Link"}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-700" htmlFor="nav-name">
                  Name
                </label>
                <input
                  id="nav-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Blog, Changelog, Docs..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700" htmlFor="nav-desc">
                  Description
                </label>
                <input
                  id="nav-desc"
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Optional helper copy"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700" htmlFor="nav-type">
                  Link Type
                </label>
                <select
                  id="nav-type"
                  value={draftType}
                  onChange={(event) => setDraftType(event.target.value as LinkType)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                >
                  {linkTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerSection(null);
                  resetDrawer();
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addLink}
                className="rounded-md border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              >
                Save link
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function renderTypeIcon(type: LinkType) {
  if (type === "external") {
    return <ExternalLink className="h-3 w-3" />;
  }
  if (type === "notion_tag") {
    return <Tag className="h-3 w-3" />;
  }
  if (type === "notion_author") {
    return <User className="h-3 w-3" />;
  }
  if (type === "notion_post" || type === "generated_page") {
    return <FileText className="h-3 w-3" />;
  }
  if (type === "notion_page") {
    return <Globe2 className="h-3 w-3" />;
  }
  return <Link2 className="h-3 w-3" />;
}

