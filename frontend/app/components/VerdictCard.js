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

  // Reconciliation Logic (Option A & B)
  let displayIsScam = is_scam;
  let displayConfidence = confidence;
  let displayTier = verdict_tier;
  let displayHeading = is_scam ? "Potential Scam Detected" : "Appears Legitimate";

  if (explanation) {
    const redCount = red_flags?.length || 0;
    const greenCount = green_flags?.length || 0;

    // Override if explanation flags clearly contradict classifier output
    if (!is_scam && redCount > greenCount) {
      displayIsScam = true;
      displayTier = "SUSPICIOUS";
      displayConfidence = 0.58; // Adjust to suspicious range
      displayHeading = "Suspicious Outreach Detected";
    } else if (is_scam && greenCount > redCount) {
      displayIsScam = false;
      displayTier = "UNVERIFIED";
      displayConfidence = 0.52; // Adjust to neutral range
      displayHeading = "Unverified Outreach";
    }
  }

  // Handle uncertainty threshold band (45% to 60%)
  const scorePct = Math.round(displayConfidence * 100);
  if (scorePct >= 45 && scorePct <= 60) {
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
