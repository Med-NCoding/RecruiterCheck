"use client";

import { useRef, useState } from "react";
import { classifyMessage, explainVerdict } from "./lib/api";
import AnalyzerForm from "./components/AnalyzerForm";
import AnalysisPanel from "./components/AnalysisPanel";
import Simulator from "./components/Simulator";

const MIN_CHARS = 80;

const TOO_SHORT_CLASSIFICATION = {
  is_scam: false,
  confidence: 0.55,
  verdict_tier: "INSUFFICIENT",
  source: "length_guard",
};

const TOO_SHORT_EXPLANATION = {
  red_flags: [],
  green_flags: [],
  verdict_reasoning:
    "There is not enough context to evaluate this outreach. Include the role, compensation, contact method, and requested next steps before relying on an assessment.",
};

const STEPS = [
  {
    number: "01",
    title: "Paste the outreach.",
    description: "Add the full email, text, direct message, or job offer. More context creates a more useful assessment.",
    className: "border border-accent/20 bg-[#121d2d]",
  },
  {
    number: "02",
    title: "See the signals.",
    description: "RecruiterCheck separates suspicious tactics from conventional recruiting cues and explains both clearly.",
    className: "border border-white/10 bg-[#1b1e24]",
  },
  {
    number: "03",
    title: "Verify with confidence.",
    description: "Get a practical next step, then confirm the sender through the employer’s official website before replying.",
    className: "border border-success/20 bg-[#10231d]",
  },
];

export default function Home() {
  const assessmentRef = useRef(null);
  const [message, setMessage] = useState("");
  const [scanPhase, setScanPhase] = useState(null);
  const [classification, setClassification] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);
  const [tooShort, setTooShort] = useState(false);

  const isScanning = scanPhase !== null;

  function scrollToAssessment() {
    requestAnimationFrame(() => {
      assessmentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleMessageChange(nextMessage) {
    setMessage(nextMessage);
    if (classification || explanation || error || tooShort) {
      setClassification(null);
      setExplanation(null);
      setError(null);
      setTooShort(false);
    }
  }

  async function handleScan(event) {
    event?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isScanning) return;

    setError(null);
    scrollToAssessment();

    if (trimmed.length < MIN_CHARS) {
      setTooShort(true);
      setClassification(TOO_SHORT_CLASSIFICATION);
      setExplanation(TOO_SHORT_EXPLANATION);
      return;
    }

    setTooShort(false);
    setClassification(null);
    setExplanation(null);
    setScanPhase("classify");

    let completedClassification = null;

    try {
      completedClassification = await classifyMessage(trimmed);
      setClassification(completedClassification);
      setScanPhase("explain");
      const completedExplanation = await explainVerdict(
        trimmed,
        completedClassification.is_scam,
        completedClassification.confidence
      );
      setExplanation(completedExplanation);
      scrollToAssessment();
    } catch (requestError) {
      if (completedClassification) setClassification(completedClassification);
      setError(requestError.message);
      scrollToAssessment();
    } finally {
      setScanPhase(null);
    }
  }

  function handleReset() {
    setMessage("");
    setClassification(null);
    setExplanation(null);
    setError(null);
    setTooShort(false);
  }

  return (
    <div className="min-h-screen">
      <header className="glass-nav sticky top-0 z-50 border-b border-white/10">
        <div className="app-container flex h-16 items-center justify-between gap-5">
          <a href="#top" className="flex items-center gap-2 rounded-full" aria-label="RecruiterCheck home">
            <span className="brand-mark" aria-hidden="true">R</span>
            <span className="brand-wordmark text-base font-semibold">RecruiterCheck</span>
          </a>

          <nav className="hidden items-center gap-9 text-sm font-medium text-muted md:flex" aria-label="Primary navigation">
            <a className="transition hover:text-foreground" href="#analyzer">Analyze</a>
            <a className="transition hover:text-foreground" href="#how-it-works">How it works</a>
            <a className="transition hover:text-foreground" href="#playbook">Playbook</a>
          </nav>

          <a href="#analyzer" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#07111d] transition hover:bg-accent-strong">
            Try it
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero-shell overflow-hidden px-5 pb-16 pt-20 text-center sm:pb-24 sm:pt-28">
          <div className="mx-auto max-w-5xl">
            <p className="intro-reveal text-lg font-semibold tracking-[-0.02em] text-accent" style={{ "--delay": "40ms" }}>
              Recruiter outreach, decoded.
            </p>
            <h1 className="intro-reveal mt-2 text-[clamp(3.4rem,9vw,7rem)] font-semibold leading-[0.94] tracking-[-0.075em] text-foreground" style={{ "--delay": "100ms" }}>
              Know before
              <span className="block text-[#8e98a5]">you reply.</span>
            </h1>
            <p className="intro-reveal mx-auto mt-7 max-w-2xl text-lg font-medium leading-7 tracking-[-0.025em] text-muted sm:text-2xl sm:leading-8" style={{ "--delay": "160ms" }}>
              A clear second opinion for recruiter emails, job offers, and direct messages—before you share, pay, or respond.
            </p>
            <div className="intro-reveal mt-8 flex items-center justify-center gap-6 text-base sm:text-lg" style={{ "--delay": "220ms" }}>
              <a href="#analyzer" className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#07111d] transition hover:bg-accent-strong sm:text-base">Analyze a message</a>
              <a href="#how-it-works" className="apple-link">See how it works ›</a>
            </div>

            <div className="hero-preview intro-reveal mx-auto mt-14 max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#10141a] p-3 text-left sm:mt-20 sm:p-4" style={{ "--delay": "280ms" }} aria-hidden="true">
              <div className="rounded-[1.35rem] bg-surface p-5 sm:p-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[11px] font-medium text-muted">Private analysis</span>
                </div>
                <div className="grid gap-5 pt-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                  <div className="rounded-2xl bg-surface-elevated p-5 text-sm leading-6 text-foreground/80">
                    “We found your profile and would like to offer you a remote role. Please add our hiring manager on Telegram to continue…”
                  </div>
                  <div className="rounded-2xl bg-danger-soft p-5">
                    <p className="text-xs font-semibold text-danger">Potential scam</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">3 risk signals found.</p>
                    <p className="mt-2 text-xs leading-5 text-muted">Off-platform redirect · Unverified contact · Immediate offer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="analyzer" className="analyzer-shell scroll-mt-20 py-20 sm:py-28">
          <div className="app-container">
            <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
              <p className="text-base font-semibold text-accent">Analyze in seconds</p>
              <h2 className="mt-2 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.06em]">Paste. Check. Understand.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">No account. No complicated setup. Just the message and a clear explanation of what deserves your attention.</p>
            </div>

            <div className="grid items-stretch gap-5 xl:grid-cols-2">
              <AnalyzerForm
                message={message}
                onMessageChange={handleMessageChange}
                onSubmit={handleScan}
                onClear={handleReset}
                isScanning={isScanning}
                scanPhase={scanPhase}
                hasResult={Boolean(classification || error)}
                minChars={MIN_CHARS}
              />
              <div ref={assessmentRef} className="scroll-mt-16">
                <AnalysisPanel
                  classification={classification}
                  explanation={explanation}
                  isScanning={isScanning}
                  scanPhase={scanPhase}
                  error={error}
                  tooShort={tooShort}
                  minChars={MIN_CHARS}
                  onRetry={handleScan}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="content-shell scroll-mt-20 py-20 sm:py-28">
          <div className="app-container">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-base font-semibold text-accent">Designed for clarity</p>
                <h2 className="mt-2 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.06em]">A safer next step starts here.</h2>
              </div>
              <a href="#analyzer" className="apple-link shrink-0 text-lg">Try the analyzer ›</a>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {STEPS.map((step) => (
                <article key={step.number} className={`min-h-[25rem] overflow-hidden rounded-[2rem] p-7 sm:p-9 ${step.className}`}>
                  <p className="font-mono text-sm text-muted">{step.number}</p>
                  <h3 className="mt-24 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{step.title}</h3>
                  <p className="mt-4 text-base leading-7 text-muted">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="playbook" className="scroll-mt-12 bg-[#07090c] py-20 sm:py-28">
          <div className="app-container">
            <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
              <p className="text-base font-semibold text-accent">Learn the pattern</p>
              <h2 className="mt-2 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-white">See what can happen next.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">Explore the common stages of a recruiter scam in a safe, educational simulation.</p>
            </div>
            <Simulator
              key={classification ? `${classification.verdict_tier}-${message}` : "no-analysis"}
              message={classification && !tooShort ? message : null}
              isScam={!tooShort && classification?.is_scam}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#080a0d]">
        <div className="app-container py-10 text-xs leading-5 text-muted">
          <p className="border-b border-white/10 pb-5">RecruiterCheck provides educational guidance, not a guarantee of legitimacy. Always verify employers through official company channels.</p>
          <div className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright © 2026 RecruiterCheck.</p>
            <p>Private analysis · No account required</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
