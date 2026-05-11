"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";

type TranscribeResponse = {
  success: boolean;
  transcript?: string;
  notionPageId?: string;
  title?: string;
  message?: string;
};

export default function InterviewsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscribeResponse | null>(null);

  const accepted = useMemo(() => ["audio/mpeg", "audio/wav", "audio/x-wav"], []);

  function handleFileChange(nextFile: File | null) {
    setError(null);
    setResult(null);
    setProgress(0);
    setFile(nextFile);
  }

  function uploadAndTranscribe() {
    if (!file) {
      setError("Select an MP3 or WAV file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("audio", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/transcribe");
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      setProgress(pct);
    };

    xhr.onload = () => {
      setIsUploading(false);
      const payload = xhr.response as TranscribeResponse | null;

      if (xhr.status < 200 || xhr.status >= 300 || !payload?.success) {
        setError(payload?.message || "Failed to transcribe audio.");
        return;
      }

      setProgress(100);
      setResult(payload);
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setError("Network error while uploading file.");
    };

    xhr.send(formData);
  }

  return (
    <main className="bg-white px-10 py-10">
      <div className="max-w-4xl">
        <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-black">
          INTERVIEWS
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Upload a voice note and instantly convert it into a draft story inside
          Archive.
        </p>

        <section className="mt-8 border border-[#E5E5E5] bg-white p-6">
          <label
            htmlFor="audio-file"
            className="flex min-h-52 cursor-pointer flex-col items-center justify-center border border-dashed border-[#E5E5E5] px-6 py-8 text-center"
          >
            <Upload className="h-8 w-8 text-black" />
            <p className="mt-4 text-sm font-medium text-black">
              Drop MP3/WAV here or click to upload
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Voice to transcript to archive draft.
            </p>
            <input
              id="audio-file"
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              className="hidden"
              onChange={(event) => {
                const candidate = event.target.files?.[0] ?? null;
                if (candidate && !accepted.includes(candidate.type)) {
                  setError("Only MP3 and WAV files are supported.");
                  return;
                }
                handleFileChange(candidate);
              }}
            />
          </label>

          {file ? (
            <p className="mt-4 text-sm text-zinc-600">
              Selected: <span className="font-medium text-black">{file.name}</span>
            </p>
          ) : null}

          <div className="mt-4 border border-[#E5E5E5] bg-white">
            <div
              className="h-2 bg-black transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {isUploading ? `Uploading... ${progress}%` : "Idle"}
          </p>

          <button
            type="button"
            onClick={uploadAndTranscribe}
            disabled={isUploading}
            className="mt-5 rounded-[4px] border border-black bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isUploading ? "Transcribing..." : "Upload & Transcribe"}
          </button>
        </section>

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

        {result?.success ? (
          <section className="mt-6 border border-[#E5E5E5] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Transcript Ready
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              Saved to Notion as draft:
              <span className="ml-1 font-medium text-black">
                {result.title || "Untitled Interview"}
              </span>
            </p>
            <div className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap border border-[#E5E5E5] p-3 text-sm leading-relaxed text-zinc-800">
              {result.transcript}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
