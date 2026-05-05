"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Zap,
  RefreshCw,
  Bell,
  Shield,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";

// ─── Animation variants ────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: EASE },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// ─── Data ─────────────────────────────────────────────────────────────────

const features = [
  {
    icon: BookOpen,
    title: "Notion Sync",
    description:
      "Two-way live sync with your entire Notion workspace — pages, databases, and tasks stay perfectly up to date.",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: Zap,
    title: "Instant Updates",
    description:
      "Changes propagate in real time. No more manual refreshes — your data is always current.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: RefreshCw,
    title: "Auto Backups",
    description:
      "Daily encrypted snapshots so you never lose a single word, no matter what.",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description:
      "AI-powered nudges that learn your rhythm and surface the right task exactly when you need it.",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "End-to-end encryption and SOC 2 compliant infrastructure — your data is yours alone.",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description:
      "Summarize, generate, and chat with your Notion pages without leaving your workflow.",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
];

const included = [
  "Unlimited Notion-to-Blog Sync",
  "Real-time collaboration",
  "AI Reddit & Twitter Auto-posting",
  "Smart reminders & nudges",
  "Daily encrypted backups",
  "Priority support",
  "All future features included",
];

const stats = [
  { value: "10,000+", label: "Active users" },
  { value: "2M+", label: "Pages synced" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9 / 5", label: "Average rating" },
];

const previewRows = [
  { status: "Synced", badgeClass: "bg-emerald-50 text-emerald-600" },
  { status: "Updating", badgeClass: "bg-violet-50 text-violet-600" },
  { status: "Synced", badgeClass: "bg-emerald-50 text-emerald-600" },
  { status: "Pending", badgeClass: "bg-amber-50 text-amber-600" },
  { status: "Synced", badgeClass: "bg-emerald-50 text-emerald-600" },
];

const rowWidths = [160, 120, 176, 136, 152];
const sidebarWidths = [56, 48, 64, 40];

// ─── Nav ──────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-md border-b border-gray-100"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-900">KREATLY</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
        <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
        <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
        <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
      </div>

      <div className="flex items-center gap-3">
        <a href="#" className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Sign in
        </a>
        <a
          href="/signup"
          className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 hover:shadow-[0_0_22px_rgba(139,92,246,0.45)] transition-all"
        >
          Get started <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="flex flex-col items-center justify-center pt-48 pb-20 px-6 text-center">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
      >
        <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        AI-powered Notion sync — just $9/month
      </motion.div>

      {/* Headline */}
      <motion.h1
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="max-w-3xl font-bold tracking-[-0.03em] leading-[1.06] text-slate-900"
        style={{ fontSize: "clamp(2.6rem, 7vw, 5rem)" }}
      >
        KREATLY — Best in Feather.io
      </motion.h1>

      {/* Sub */}
      <motion.p
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-6 max-w-md text-lg text-gray-500 leading-relaxed"
      >
        Turn your Notion workspace into a beautiful blog in seconds. Plus, use AI to automatically generate and publish Twitter threads and Reddit posts from your content.
      </motion.p>

      {/* CTAs */}
      <motion.div
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-10 flex flex-col sm:flex-row items-center gap-3"
      >
        <a
          href="/signup"
          className="flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 hover:shadow-[0_0_24px_rgba(139,92,246,0.45)] transition-all"
        >
          Start free trial <ArrowRight className="h-4 w-4" />
        </a>
        <a
          href="#features"
          className="flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          See how it works
        </a>
      </motion.div>

      <motion.p
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-5 text-xs text-gray-400"
      >
        No credit card required · Cancel anytime
      </motion.p>

      {/* Product preview frame */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-14 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xl shadow-gray-200/70"
      >
        <img
          src="/hero-illustration.svg"
          alt="3D illustration of a Notion workspace transforming into a beautiful blog"
          className="h-auto w-full"
        />
      </motion.div>
    </section>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────

function StatsStrip() {
  return (
    <section className="py-16 border-y border-gray-100">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mx-auto max-w-4xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8"
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="text-center">
            <p className="text-3xl font-bold tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-1.5 text-sm text-gray-400">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-16"
        >
          <motion.p variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-4">
            Everything you need
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-bold tracking-[-0.02em] text-slate-900">
            Built for how you actually work
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-500 max-w-lg mx-auto">
            KREATLY layers powerful automation on top of Notion without changing how you use it.
          </motion.p>
        </motion.div>

        {/* Gap-px grid creates hairline dividers between cells */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-3xl overflow-hidden"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className="bg-white p-8">
              <div className={`mb-5 inline-flex items-center justify-center rounded-xl ${f.iconBg} p-2.5 ${f.iconColor}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Notion Sync Callout ──────────────────────────────────────────────────

function NotionSync() {
  return (
    <section className="py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: EASE }}
        className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-slate-50 p-10 md:p-14"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-12">
          <div className="flex-1">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
              <BookOpen className="h-3.5 w-3.5 text-violet-500" />
              Notion Sync
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-slate-900 mb-4">
              Two-way sync that actually works
            </h2>
            <p className="text-gray-500 leading-relaxed max-w-lg">
              Connect KREATLY to your Notion workspace in 60 seconds. Every page, database, and task stays in perfect harmony — edits flow both ways, instantly.
            </p>
            <ul className="mt-7 space-y-3">
              {["Works with all Notion database types", "Granular permission control", "Conflict-free merging"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <Check className="h-3 w-3 text-violet-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Stats panel */}
          <div className="w-full md:w-56 flex-shrink-0 rounded-2xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
            {[
              { label: "Pages synced", value: "1,284", color: "text-slate-900" },
              { label: "Last sync", value: "Just now", color: "text-emerald-600" },
              { label: "Conflicts", value: "0", color: "text-gray-400" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className="py-28 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-4">
            Simple pricing
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-bold tracking-[-0.02em] text-slate-900">
            One plan. Everything included.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-500 max-w-md mx-auto">
            No hidden tiers, no usage limits. Just one honest price.
          </motion.p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-stretch gap-5 max-w-4xl mx-auto">
          {/* Dark pricing card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex-1 rounded-3xl bg-slate-900 p-9"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/50">
              <Sparkles className="h-3 w-3" /> Most popular
            </div>

            <div className="mt-6 flex items-end gap-1.5">
              <span className="text-6xl font-bold tracking-tight text-white">$9</span>
              <span className="mb-2.5 text-white/40">/month</span>
            </div>
            <p className="text-sm text-white/30">or $84/year — save 2 months</p>

            <a
              href="#"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-slate-900 hover:bg-gray-100 transition-colors"
            >
              Start 14-day free trial <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-center text-xs text-white/25">No credit card required</p>

            <div className="mt-9 pt-8 border-t border-white/10 space-y-3.5">
              {included.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-white/55">
                  <Check className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="flex flex-col gap-4 lg:w-72 flex-shrink-0"
          >
            {[
              {
                quote: "KREATLY's AI Twitter auto-posting saves us at least 10 hours every week. We ship more content with way less effort.",
                name: "Alex Rivera, Founder of TechPulse",
                role: "Founder",
              },
              {
                quote: "The Notion sync is ridiculously simple. I connected once and everything just stays updated in the background.",
                name: "Jordan Chen, Indie Maker",
                role: "Indie maker",
              },
              {
                quote: "Switched from a $30/month competitor. KREATLY does more for a third of the price.",
                name: "Priya M.",
                role: "Startup founder",
              },
            ].map((t) => (
              <div key={t.name} className="flex-1 rounded-2xl border border-gray-100 p-6">
                <p className="text-sm text-gray-600 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-gray-100 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-slate-50 px-10 py-16 text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-slate-900 mb-4">
          Ready to supercharge Notion?
        </h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Join thousands of makers, founders, and teams who run their work through KREATLY.
        </p>
        <a
          href="#pricing"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Get started free <ArrowRight className="h-4 w-4" />
        </a>
        <p className="mt-5 text-xs text-gray-400">14-day trial · $9/month after · Cancel anytime</p>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-gray-100 py-10 px-8">
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-slate-900 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">KREATLY</span>
        </div>
        <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} KREATLY. All rights reserved.</p>
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
          <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <StatsStrip />
        <Features />
        <NotionSync />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
