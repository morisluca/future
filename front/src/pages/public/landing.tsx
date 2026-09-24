import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChartBar,
  Check,
  ChevronDown,
  Globe2,
  Menu,
  Shield,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getPublicSettings(),
    retry: 1,
  });
  const siteName = settingsData?.settings?.site_name ?? "Futurebkassest";

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) return <div className="min-h-screen bg-[#07110f]" />;

  const faqs = [
    ["How quickly can I open an account?", "Most customers complete their application in under five minutes. Identity checks are handled securely in the same flow."],
    ["Is my money protected?", "Your account is protected with encryption, multi-factor authentication, transaction monitoring, and clear activity controls."],
    ["Can I send money internationally?", "Yes. Send local and international transfers from one workspace with transparent fees shown before you confirm."],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07110f] text-white selection:bg-emerald-400 selection:text-[#07110f]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80" aria-hidden="true">
        <div className="absolute -left-32 top-0 h-[34rem] w-[34rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-[28rem] h-[28rem] w-[28rem] rounded-full bg-sky-500/5 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_65%)]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#07110f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label={`${siteName} home`}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-[#07110f] shadow-[0_0_28px_rgba(52,211,153,0.2)]"><ChartBar className="h-5 w-5" /></span>
            <span className="text-lg font-semibold uppercase tracking-[-0.03em]">{siteName}</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
            <a href="#product" className="text-sm text-white/60 transition hover:text-white">Product</a>
            <a href="#security" className="text-sm text-white/60 transition hover:text-white">Security</a>
            <a href="#pricing" className="text-sm text-white/60 transition hover:text-white">Pricing</a>
            <a href="#faq" className="text-sm text-white/60 transition hover:text-white">FAQ</a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <LanguageSwitcher />
            <Link href="/login"><Button variant="ghost" className="text-white/70 hover:text-white">Sign in</Button></Link>
            <Link href="/login"><Button>Account <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white sm:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-white/[0.08] px-5 pb-5 pt-4 sm:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {["product", "security", "pricing", "faq"].map((item) => <a key={item} href={`#${item}`} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm capitalize text-white/70 hover:bg-white/5 hover:text-white">{item}</a>)}
            </nav>
            <div className="mt-4 flex gap-3 border-t border-white/[0.08] pt-4">
              <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">Sign in</Button></Link>
              <Link href="/login" className="flex-1"><Button className="w-full">Account</Button></Link>
            </div><br/>
            <LanguageSwitcher />
          </div>
        )}
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:pb-32">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.div variants={fadeUp} className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1.5 text-xs font-medium text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> Banking for the way you move money</motion.div>
            <motion.h1 variants={fadeUp} className="max-w-2xl text-5xl font-semibold leading-[1.03] tracking-[-0.055em] text-white sm:text-7xl">A calmer way to <span className="text-emerald-300">manage money.</span></motion.h1>
            <motion.p variants={fadeUp} className="mt-7 max-w-xl text-lg leading-8 text-white/60 sm:text-xl">One secure place for everyday banking, global transfers, cards, and digital assets. Clear decisions, real-time visibility.</motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/login"><Button size="lg" className="h-13 px-6">Account Area<ArrowRight className="h-4 w-4" /></Button></Link><a href="#product"><Button size="lg" variant="outline" className="h-13 px-6">Explore the platform</Button></a></motion.div>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">{["No monthly account fee", "Protected with MFA", "24/7 account access"].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" />{item}</span>)}</motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative lg:pl-8">
            <div className="absolute -inset-5 rounded-[2rem] bg-emerald-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b18] p-4 shadow-2xl shadow-black/40 sm:p-5">
              <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4"><div><p className="text-xs text-white/45">Good morning, Alex</p><p className="mt-1 text-sm font-medium">Your financial overview</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-300/10 text-xs font-semibold text-emerald-300">AC</span></div>
              <div className="rounded-xl border border-emerald-300/15 bg-gradient-to-br from-emerald-300/15 to-transparent p-5"><div className="flex items-start justify-between"><p className="text-xs text-white/55">Total balance</p><span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-300">+4.8% this month</span></div><p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">$24,680.50</p><div className="mt-5 flex h-16 items-end gap-1.5" aria-label="Balance trend chart">{[28, 40, 32, 52, 44, 62, 54, 76, 68, 92, 80, 100].map((height, index) => <span key={index} className="flex-1 rounded-t bg-emerald-300/70" style={{ height: `${height}%` }} />)}</div></div>
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-xs text-white/50"><ArrowDownLeft className="h-3.5 w-3.5 text-emerald-300" /> Money in</div><p className="mt-3 text-lg font-medium">$8,420.00</p><p className="mt-1 text-xs text-emerald-300">+12.4%</p></div><div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-xs text-white/50"><ArrowUpRight className="h-3.5 w-3.5 text-amber-300" /> Money out</div><p className="mt-3 text-lg font-medium">$3,120.40</p><p className="mt-1 text-xs text-white/40">This month</p></div></div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.08] px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-300/10"><Globe2 className="h-4 w-4 text-sky-300" /></span><div><p className="text-xs font-medium">International transfer</p><p className="text-[11px] text-white/40">Completed just now</p></div></div><span className="text-sm font-medium text-emerald-300">+$1,250</span></div>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-white/[0.07] bg-white/[0.018]" aria-label="Trust indicators"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 sm:px-8">{["99.9% uptime", "256-bit encryption", "150+ currencies", "Human support 24/7"].map((item) => <div key={item} className="flex items-center justify-center gap-2 text-center text-xs font-medium text-white/50 sm:text-sm"><Shield className="h-4 w-4 text-emerald-300" />{item}</div>)}</div></section>

        <section id="product" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32"><div className="max-w-2xl"><p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Built around you</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Everything important, without the clutter.</h2><p className="mt-5 text-lg leading-8 text-white/55">Your money should be easy to understand. Futurebkassest brings the tools you use most into one thoughtful experience.</p></div><div className="mt-14 grid gap-4 md:grid-cols-3">{[{ icon: BarChart3, title: "See the full picture", text: "Track balances, spending, and progress across every account in one clear view." }, { icon: Globe2, title: "Move money globally", text: "Send money where it needs to go with transparent rates and status updates." }, { icon: TrendingUp, title: "Grow with confidence", text: "Explore digital assets and make informed moves with live market context." }].map(({ icon: Icon, title, text }) => <div key={title} className="group rounded-2xl border border-white/[0.09] bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-emerald-300/30 hover:bg-emerald-300/[0.04]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><Icon className="h-5 w-5" /></span><h3 className="mt-7 text-xl font-medium">{title}</h3><p className="mt-3 leading-7 text-white/50">{text}</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-emerald-300">Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>)}</div></section>

        <section id="security" className="border-y border-white/[0.07] bg-[#0b1916]"><div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-2"><div><p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Security by default</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Your trust is part of the product.</h2><p className="mt-5 max-w-lg text-lg leading-8 text-white/55">We pair modern protection with controls you can actually understand, so you always know what is happening with your account.</p><Link href="/registeration"><Button className="mt-8">See how it works <ArrowRight className="h-4 w-4" /></Button></Link></div><div className="grid gap-3 sm:grid-cols-2">{["Multi-factor authentication", "Real-time transaction alerts", "Encrypted data at rest", "Dedicated account controls"].map((item, index) => <div key={item} className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-300/10 text-emerald-300"><Check className="h-4 w-4" /></span><span className="text-xs text-white/30">0{index + 1}</span></div><p className="mt-8 text-sm font-medium text-white/85">{item}</p></div>)}</div></div></section>

        <section id="pricing" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32"><div className="rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-300/[0.12] to-transparent p-8 sm:p-12"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div><div className="flex items-center gap-2 text-sm font-medium text-emerald-300"><Zap className="h-4 w-4" /> Simple pricing</div><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">The essentials, with no surprises.</h2><p className="mt-4 max-w-xl leading-7 text-white/55">Open an account with no monthly fee. See applicable transfer and trading fees before you confirm any action.</p></div><Link href="/login"><Button size="lg" className="w-full sm:w-auto">Get started <ArrowRight className="h-4 w-4" /></Button></Link></div></div></section>

        <section id="faq" className="mx-auto max-w-3xl px-5 pb-24 sm:px-8 sm:pb-32"><div className="text-center"><p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Questions, answered</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em]">Good to know.</h2></div><div className="mt-10 divide-y divide-white/[0.09] border-y border-white/[0.09]">{faqs.map(([question, answer], index) => <div key={question}><button type="button" className="flex w-full items-center justify-between gap-5 py-5 text-left text-sm font-medium text-white" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}>{question}<ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${openFaq === index ? "rotate-180 text-emerald-300" : ""}`} /></button>{openFaq === index && <p className="max-w-2xl pb-5 pr-10 text-sm leading-7 text-white/50">{answer}</p>}</div>)}</div></section>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#050c0a]"><div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400 text-[#07110f]"><Shield className="h-4 w-4" /></span><span className="font-medium">{siteName}</span></div><div className="flex flex-wrap items-center gap-5 text-sm text-white/45"><a href="#product" className="hover:text-white">Product</a><a href="#security" className="hover:text-white">Security</a><a href="#faq" className="hover:text-white">Help center</a><span>(c) 2026 {siteName}</span></div></div></footer>
    </div>
  );
}
