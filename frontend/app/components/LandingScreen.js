"use client";

import { useState } from "react";

export default function LandingScreen({ onEnter }) {
  const [exiting, setExiting] = useState(false);

  function handleGetStarted() {
    setExiting(true);
    setTimeout(() => onEnter(), 580);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background select-none ${
        exiting ? "anim-exit" : ""
      }`}
    >
      {/* Ambient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 65% 45% at 0% 0%, rgba(124,58,237,0.07) 0px, transparent 65%), " +
            "radial-gradient(ellipse 50% 38% at 100% 100%, rgba(56,189,248,0.05) 0px, transparent 60%)",
        }}
      />

      {/* ── Content ── */}
      <div className="relative flex flex-col items-center text-center px-6" style={{ gap: "2rem" }}>

        {/* 1. RECRUITER CHECK — drops in from top */}
        <div className="anim-title" style={{ animationDelay: "0.05s" }}>
          <h1
            className="logo-text"
            style={{
              fontSize: "clamp(2.8rem, 9vw, 6rem)",
              fontWeight: 900,
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            RECRUITER CHECK
          </h1>
        </div>

        {/* Divider */}
        <div
          className="anim-line h-px w-36 bg-accent/20 origin-center"
          style={{ animationDelay: "0.55s" }}
        />

        {/* 2. Split tagline — each half clipped so it truly slides from off-screen */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">

          {/* Left text — clip container, text slides from left */}
          <div className="overflow-hidden">
            <p
              className="anim-left text-lg sm:text-xl font-semibold text-foreground"
              style={{ animationDelay: "0.70s" }}
            >
              Paste any recruiter message.
            </p>
          </div>

          {/* Dot separator */}
          <span
            className="anim-btn hidden sm:block text-accent font-bold text-2xl leading-none"
            style={{ animationDelay: "1.10s" }}
          >
            ·
          </span>

          {/* Right text — clip container, text slides from right */}
          <div className="overflow-hidden">
            <p
              className="anim-right text-lg sm:text-xl font-medium text-muted"
              style={{ animationDelay: "0.70s" }}
            >
              Know if it&apos;s a scam in seconds.
            </p>
          </div>
        </div>

        {/* 3. Supporting description */}
        <p
          className="anim-btn max-w-md text-sm text-muted/75 leading-relaxed"
          style={{ animationDelay: "1.0s" }}
        >
          Our fine-tuned AI classifier and LLM reasoning engine analyze recruiter
          outreach and surface every red flag before you respond.
        </p>

        {/* 4. Get Started button */}
        <div className="anim-btn" style={{ animationDelay: "1.20s" }}>
          <button
            onClick={handleGetStarted}
            className="group relative overflow-hidden rounded-2xl bg-accent px-12 py-4 text-[15px] font-bold text-white"
            style={{
              boxShadow: "0 8px 32px rgba(124,58,237,0.30)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(124,58,237,0.42)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(124,58,237,0.30)";
            }}
          >
            {/* Shimmer sweep */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                transition: "transform 0.60s ease",
              }}
            />
            <span className="relative flex items-center gap-3">
              Get Started
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: "transform 0.18s ease" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateX(3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; }}
              >
                <path d="M4 10h12M11 4l6 6-6 6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Keyboard hint */}
        <p
          className="anim-btn text-[11px] text-muted/45 mt-1"
          style={{ animationDelay: "1.40s" }}
        >
          or press{" "}
          <kbd className="rounded bg-border/80 px-1.5 py-0.5 font-mono text-[10px] text-muted/60">
            Enter
          </kbd>
        </p>
      </div>

      {/* Bouncing scroll-down caret at the bottom */}
      <div
        className="anim-btn absolute bottom-10 flex flex-col items-center gap-1"
        style={{ animationDelay: "1.60s" }}
      >
        <p className="text-[10px] uppercase tracking-widest text-muted/40 font-medium">Scroll</p>
        {/* Three stacked chevrons for a cascading bounce */}
        {[0, 150, 300].map((delay) => (
          <svg
            key={delay}
            viewBox="0 0 16 10"
            fill="none"
            className="anim-caret h-3 w-4 text-accent/30"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animationDelay: `${delay}ms` }}
          >
            <path d="M1 1l7 7 7-7" />
          </svg>
        ))}
      </div>
    </div>
  );
}
