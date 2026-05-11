"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MappingKey =
  | "slug"
  | "seoTitle"
  | "metaDescription"
  | "geoKeywords"
  | "geoFocus"
  | "publishStatus";

type MappingState = Record<MappingKey, string>;
const fallbackPropertyOptions = [
  "title",
  "slug",
  "status",
  "publish_status",
  "seo_title",
  "meta_description",
  "geo_keywords",
  "geo_focus",
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [resolvedDatabaseId, setResolvedDatabaseId] = useState("");
  const [propertyOptions, setPropertyOptions] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<MappingState>({
    slug: "slug",
    seoTitle: "seo_title",
    metaDescription: "meta_description",
    geoKeywords: "geo_keywords",
    geoFocus: "geo_focus",
    publishStatus: "publish_status",
  });

  const progress = useMemo(() => (step / 3) * 100, [step]);

  function updateMapping(field: MappingKey, value: string) {
    setMappings((prev) => ({ ...prev, [field]: value }));
  }

  async function scanAndMap() {
    setIsScanning(true);
    setError(null);
    try {
      const response = await fetch("/api/notion/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionUrl: databaseUrl }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to scan Notion schema.");
      }

      if (Array.isArray(data?.propertyNames)) {
        setPropertyOptions(
          Array.from(new Set([...data.propertyNames, ...fallbackPropertyOptions])),
        );
      }
      if (data?.mappings) {
        setMappings((prev) => ({ ...prev, ...data.mappings }));
      }
      if (typeof data?.databaseId === "string") {
        setResolvedDatabaseId(data.databaseId);
      }

      if (data?.autoSkip) {
        const payload = {
          databaseUrl,
          databaseId: data?.databaseId || resolvedDatabaseId || databaseUrl,
          mappings: { ...mappings, ...(data?.mappings || {}) },
          completedAt: new Date().toISOString(),
        };
        localStorage.setItem("kreatly_setup", JSON.stringify(payload));
        sessionStorage.setItem("kreatly_setup", JSON.stringify(payload));
        router.push("/dashboard/blogs");
        return;
      }

      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to scan Notion schema.",
      );
    } finally {
      setIsScanning(false);
    }
  }

  function handleFinish() {
    const payload = {
      databaseUrl,
      databaseId: resolvedDatabaseId || databaseUrl,
      mappings,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem("kreatly_setup", JSON.stringify(payload));
    sessionStorage.setItem("kreatly_setup", JSON.stringify(payload));
    router.push("/dashboard/blogs");
  }

  return (
    <main className="bg-white px-10 py-10">
      <div className="max-w-4xl border border-[#E5E5E5] bg-white p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Setup Wizard
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-black">
          Configure your Newsroom OS
        </h1>

        <div className="mt-5 border border-[#E5E5E5] bg-white">
          <div className="h-1.5 bg-[#2563EB]" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-6">
          {step === 1 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Step 1 · Connect
              </p>
              <label className="mt-4 block text-sm font-medium text-black">
                Notion Database URL
              </label>
              <input
                value={databaseUrl}
                onChange={(event) => setDatabaseUrl(event.target.value)}
                placeholder="https://www.notion.so/...database..."
                className="mt-2 w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none"
              />
              <a
                href="https://www.notion.so/templates"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-[4px] border border-[#2563EB] bg-[#2563EB] px-3 py-2 text-xs font-medium text-white"
              >
                Duplicate Notion Template
              </a>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Step 2 · Map Fields
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Map Notion properties to publishing and GEO fields.
              </p>
              <div className="mt-4 space-y-3">
                <MappingRow
                  label="Slug"
                  value={mappings.slug}
                  options={propertyOptions}
                  onChange={(v) => updateMapping("slug", v)}
                />
                <MappingRow
                  label="SEO Title"
                  value={mappings.seoTitle}
                  options={propertyOptions}
                  onChange={(v) => updateMapping("seoTitle", v)}
                />
                <MappingRow
                  label="Meta Description"
                  value={mappings.metaDescription}
                  options={propertyOptions}
                  onChange={(v) => updateMapping("metaDescription", v)}
                />
                <MappingRow
                  label="GEO Keywords"
                  value={mappings.geoKeywords}
                  options={propertyOptions}
                  onChange={(v) => updateMapping("geoKeywords", v)}
                />
                <MappingRow
                  label="GEO Focus"
                  value={mappings.geoFocus}
                  options={propertyOptions}
                  onChange={(v) => updateMapping("geoFocus", v)}
                />
                <MappingRow
                  label="Publish Status"
                  value={mappings.publishStatus}
                  options={propertyOptions}
                  onChange={(v) => updateMapping("publishStatus", v)}
                />
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Step 3 · Success
              </p>
              <div className="mt-4 border border-[#E5E5E5] bg-white p-4">
                <h2 className="text-sm font-semibold tracking-tight text-black">
                  Setup complete.
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Your Notion source is connected and mapped for GEO-ready writing.
                </p>
              </div>
            </section>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="rounded-[4px] border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  void scanAndMap();
                  return;
                }
                handleFinish();
              }}
              disabled={isScanning}
              className="rounded-[4px] border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white"
            >
              {isScanning ? "Scanning..." : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="rounded-[4px] border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white"
            >
              Finish Setup
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function MappingRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-3 border border-[#E5E5E5] p-3">
      <p className="text-sm font-medium text-black">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none"
      >
        {options.length > 0 ? (
          options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))
        ) : (
          <option value={value}>{value}</option>
        )}
      </select>
    </div>
  );
}
