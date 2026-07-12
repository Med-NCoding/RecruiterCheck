"use client";

import ScoreGauge from "./ScoreGauge";

function getBadgeStyle(isScam, tier) {
  if (tier === "INSUFFICIENT") {
    return "bg-warning-soft text-warning border border-warning/20";
  }
  if (tier === "SUSPICIOUS" || tier === "UNVERIFIED") {
    return "bg-warning-soft text-warning";
  }
  if (isScam) return "bg-danger-soft text-danger";
  return "bg-success-soft text-success";
}

export default function VerdictCard({ classification, explanation }) {
  if (!classification) return null;

  const { is_scam, confidence, verdict_tier, source } = classification;
  const { red_flags, green_flags, verdict_reasoning } = explanation || {};

  // Check if it's the too-short/insufficient length tier
  const isInsufficient = verdict_tier === "INSUFFICIENT";

  let displayIsScam = is_scam;
  let displayConfidence = confidence;
  let displayTier = verdict_tier;
  let displayHeading = is_scam ? "Potential Scam Detected" : "Appears Legitimate";

  if (explanation && !isInsufficient) {
    const redCount = red_flags?.length || 0;
    const greenCount = green_flags?.length || 0;

    // 1. Reconciliation override if flag counts contradict classifier
    if (!is_scam && redCount > greenCount) {
      displayIsScam = true;
      displayTier = "SUSPICIOUS";
      displayConfidence = 0.58;
      displayHeading = "Suspicious Outreach Detected";
    } else if (is_scam && greenCount > redCount) {
      displayIsScam = false;
      displayTier = "UNVERIFIED";
      displayConfidence = 0.52;
      displayHeading = "Unverified Outreach";
    }

    // 2. Stretch and calibrate the score so it isn't "nerfed"
    let scaled = 0.5 + (displayConfidence - 0.5) * 1.8;

    // 3. Dynamic boost based on clean flag indicators
    if (displayIsScam) {
      if (redCount > 0 && greenCount === 0) {
        if (redCount === 1) scaled = Math.max(scaled, 0.78);
        else if (redCount === 2) scaled = Math.max(scaled, 0.88);
        else if (redCount >= 3) scaled = Math.max(scaled, 0.96);
      }
    } else {
      if (greenCount > 0 && redCount === 0) {
        if (greenCount === 1) scaled = Math.max(scaled, 0.78);
        else if (greenCount >= 2) scaled = Math.max(scaled, 0.92);
      }
    }

    // Clamp score safely between 0.51 and 0.98
    displayConfidence = Math.min(Math.max(scaled, 0.51), 0.98);

    // 4. Update the display tier based on the final scaled score
    if (displayIsScam) {
      if (displayConfidence > 0.85) {
        displayTier = "CRITICAL_RISK";
      } else if (displayConfidence > 0.60) {
        displayTier = "HIGH_RISK";
      } else {
        displayTier = "SUSPICIOUS";
      }
    } else {
      if (displayConfidence > 0.85) {
        displayTier = "SAFE";
      } else if (displayConfidence > 0.60) {
        displayTier = "LOW_RISK";
      } else {
        displayTier = "UNVERIFIED";
      }
    }
  }

  // Handle uncertainty threshold band (45% to 60%)
  const scorePct = Math.round(displayConfidence * 100);
  if (!isInsufficient && scorePct >= 45 && scorePct <= 60) {
    displayHeading = "Uncertain — Review Flags Below";
    if (displayTier !== "SUSPICIOUS" && displayTier !== "UNVERIFIED") {
      displayTier = displayIsScam ? "SUSPICIOUS" : "UNVERIFIED";
    }
  }

  const borderClass = displayIsScam
    ? scorePct > 60
      ? "border-danger/20 bg-danger-soft/40"
      : "border-warning/20 bg-warning-soft/30"
    : "border-success/20 bg-success-soft/40";


  return (
    <div className="space-y-5">
      {/* Verdict Banner */}
      <div className={`flex items-center gap-5 rounded-xl p-5 border ${borderClass}`}>
        <ScoreGauge score={displayConfidence} isScam={displayIsScam} />

        <div className="space-y-1">
          <span
            className={`inline-block rounded px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${getBadgeStyle(
              displayIsScam,
              displayTier
            )}`}
          >
            {displayTier.replace(/_/g, " ")}
          </span>
          <h3 className="text-lg font-semibold text-foreground">
            {displayHeading}
          </h3>
          <p className="text-xs text-muted">
            Analyzed by{" "}
            <span className="font-medium text-foreground/80">
              {source === "model" ? "DistilBERT Classifier" : "LLM Fallback"}
            </span>
          </p>
        </div>
      </div>

      {/* Reasoning */}
      {verdict_reasoning && (
        <div className="rounded-xl border border-border bg-surface-elevated/50 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Analysis Summary
          </h4>
          <p className="text-sm leading-relaxed text-foreground/80">
            {verdict_reasoning}
          </p>
        </div>
      )}

      {/* Red Flags */}
      {red_flags && red_flags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-danger/80">
            Red Flags Identified
          </h4>
          <ul className="space-y-1.5">
            {red_flags.map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-foreground/80 animate-in fade-in duration-200"
              >
                <svg viewBox="0 0 16 16" fill="none" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-danger/80" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 5v3M8 10.5v.5" />
                </svg>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Green Flags */}
      {green_flags && green_flags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-success/80">
            Positive Signals
          </h4>
          <ul className="space-y-1.5">
            {green_flags.map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-foreground/80 animate-in fade-in duration-200"
              >
                <svg viewBox="0 0 16 16" fill="none" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success/80" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M5.5 8.2l1.8 1.8 3.2-3.5" />
                </svg>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
