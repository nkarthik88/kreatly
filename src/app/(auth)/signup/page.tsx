"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err) {
      console.error("Google sign-up failed:", err);
      const message = err instanceof Error ? err.message : "Google sign-up failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create account.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_circle_at_20%_10%,rgba(249,115,22,0.18),transparent_45%),radial-gradient(900px_circle_at_80%_15%,rgba(139,92,246,0.18),transparent_50%),linear-gradient(to_bottom,#07070A,#0B0C10)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px] opacity-15" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-14">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-orange-500/15 ring-1 ring-orange-400/40 flex items-center justify-center">
              <span className="text-orange-300 font-extrabold tracking-tight">K</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white/90">KREATLY</div>
              <div className="text-xs text-orange-200/80">Techno-futurist onboarding</div>
            </div>
          </div>
          <div className="hidden sm:block text-sm text-white/60">Fast. Clean. Neon.</div>
        </header>

        <main className="mt-10 flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-[-0.02em]">
                Create your account
              </h1>
              <p className="mt-2 text-sm text-white/70">
                Start publishing from Notion with AI-powered distribution in minutes.
              </p>
            </div>

            <section className="rounded-3xl border border-orange-400/25 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(249,115,22,0.08),0_20px_60px_rgba(0,0,0,0.35)]">
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full rounded-2xl border border-orange-400/35 bg-black/25 py-3 text-sm font-semibold text-white hover:bg-black/35 hover:shadow-[0_0_26px_rgba(249,115,22,0.35)] transition-all"
              >
                {loading ? "Please wait..." : "Sign up with Google"}
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/50">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form className="space-y-4" onSubmit={handleEmailSignup}>
                <div>
                  <label className="block text-sm font-medium text-orange-200/90">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-200/90">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black hover:bg-orange-400 hover:shadow-[0_0_34px_rgba(249,115,22,0.55)] transition-all"
                >
                  {loading ? "Creating account..." : "Sign up"}
                </button>
              </form>

              {error ? (
                <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              ) : null}

              <p className="mt-5 text-xs text-white/50">
                By continuing, you agree to our{" "}
                <span className="text-orange-200/90">Terms</span> and{" "}
                <span className="text-orange-200/90">Privacy</span>.
              </p>

              <div className="mt-5 text-sm text-white/70">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-orange-200/95 hover:text-orange-100 transition-colors"
                >
                  Log in
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

