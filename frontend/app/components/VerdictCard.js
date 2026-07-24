"use client";

import ScoreGauge from "./ScoreGauge";

function getSourceLabel(source) {
  if (source === "model") return "Fine-tuned DistilBERT classifier";
  if (source === "length_guard") return "Local context check";
  if (source === "local_heuristic") return "Built-in safety pattern engine";
  if (source === "groq" || source === "llm_fallback") return "Groq reasoning model";
  return "Configured analysis service";
}

function getVerdict(classification, explanation) {
  const { is_scam: isScam, confidence, verdict_tier: tier } = classification;
  const isInsufficient = tier === "INSUFFICIENT";
  let displayIsScam = isScam;
  let displayConfidence = confidence;
  let displayTier = tier;
  let heading = isScam ? "Potential scam detected" : "Appears legitimate";

  if (explanation && !isInsufficient) {
    const redCount = explanation.red_flags?.length || 0;
    const greenCount = explanation.green_flags?.length || 0;

    if (!isScam && redCount > greenCount) {
      displayIsScam = true;
      displayTier = "SUSPICIOUS";
      displayConfidence = 0.58;
      heading = "Suspicious outreach detected";
    } else if (isScam && greenCount > redCount) {
      displayIsScam = false;
      displayTier = "UNVERIFIED";
      displayConfidence = 0.52;
      heading = "Unverified outreach";
    }

    let scaled = 0.5 + (displayConfidence - 0.5) * 1.8;

    if (displayIsScam && redCount > 0 && greenCount === 0) {
      if (redCount === 1) scaled = Math.max(scaled, 0.78);
      if (redCount === 2) scaled = Math.max(scaled, 0.88);
      if (redCount >= 3) scaled = Math.max(scaled, 0.96);
    }

    if (!displayIsScam && greenCount > 0 && redCount === 0) {
      if (greenCount === 1) scaled = Math.max(scaled, 0.78);
      if (greenCount >= 2) scaled = Math.max(scaled, 0.92);
    }

    displayConfidence = Math.min(Math.max(scaled, 0.51), 0.98);

    if (displayIsScam) {
      displayTier = displayConfidence > 0.85 ? "CRITICAL_RISK" : displayConfidence > 0.6 ? "HIGH_RISK" : "SUSPICIOUS";
    } else {
      displayTier = displayConfidence > 0.85 ? "SAFE" : displayConfidence > 0.6 ? "LOW_RISK" : "UNVERIFIED";
    }
  }

  const score = Math.round(displayConfidence * 100);

  if (!isInsufficient && score >= 45 && score <= 60) {
    heading = "Uncertain — review the evidence";
    displayTier = displayIsScam ? "SUSPICIOUS" : "UNVERIFIED";
  }

  if (isInsufficient) heading = "Not enough context";

  const tone = isInsufficient
    ? "warning"
    : displayIsScam
      ? score > 60 ? "danger" : "warning"
      : "success";

  return { displayIsScam, displayConfidence, displayTier, heading, score, tone, isInsufficient };
}

function EvidenceGroup({ tone, title, items, emptyText }) {
  const isDanger = tone === "danger";

  return (
    <section className={`rounded-2xl p-5 ${isDanger ? "bg-danger-soft/70" : "bg-success-soft/70"}`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className={`text-base font-semibold tracking-[-0.02em] ${isDanger ? "text-danger" : "text-success"}`}>{title}</h4>
        <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 font-mono text-xs font-semibold ${isDanger ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-2.5 text-sm leading-6 text-foreground/85">
              <span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold text-[#08100d] ${isDanger ? "bg-danger" : "bg-success"}`} aria-hidden="true">
                {isDanger ? "!" : "+"}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted">{emptyText}</p>
      )}
    </section>
  );
}

function getRecommendedAction(verdict, redFlags, greenFlags) {
  const riskSignals = redFlags.join(" ").toLowerCase();

  if (verdict.isInsufficient) {
    return {
      title: "Add more context first",
      description:
        "Include the sender's address, role, compensation, contact method, and requested next step so the assessment can give you useful guidance.",
    };
  }

  if (verdict.displayIsScam) {
    if (/check|payment|money|gift|crypto|fee|deposit|wire|bank/.test(riskSignals)) {
      return {
        title: "Stop before any payment",
        description:
          "Do not deposit a check, buy gift cards, send cryptocurrency, or pay a fee. Contact the employer using details from its official website.",
      };
    }

    if (/telegram|whatsapp|signal|off-platform|social media|messaging app|contact channel/.test(riskSignals)) {
      return {
        title: "Keep the conversation on a verified channel",
        description:
          "Do not move to the requested messaging app. Find the employer's official careers page and contact its recruiting team independently.",
      };
    }

    if (/urgent|urgency|immediate|instant|selection|high pay|simple task|task-based/.test(riskSignals)) {
      return {
        title: "Pause and verify the role",
        description:
          "Ask for the official job posting, a company email address, and a live interview. Do not share identity or banking details while you verify them.",
      };
    }

    return verdict.score >= 85
      ? {
          title: "Do not engage with this sender",
          description:
            "The risk indicators are strong. Save the message, block or report the sender, and verify any claimed employer through its official website.",
        }
      : {
          title: "Verify independently before replying",
          description:
            "The message has suspicious signals. Use the company's official website to confirm both the recruiter and role before sharing any information.",
        };
  }

  if (verdict.score >= 85 && greenFlags.length >= 2) {
    return {
      title: "Continue with normal verification",
      description:
        "The outreach has several credible signals. Confirm the sender's company domain and match the role to an official listing before scheduling the next step.",
    };
  }

  if (greenFlags.length > 0) {
    return {
      title: "Confirm the sender before continuing",
      description:
        "The message has positive signals, but verify the company email domain and match the role to an official careers-page listing before scheduling.",
    };
  }

  return {
    title: "Ask for more verifiable detail",
    description:
      "Request an official job link, company email, role details, and a live interview before sharing personal information or moving forward.",
  };
}

export default function VerdictCard({ classification, explanation }) {
  if (!classification) return null;

  const verdict = getVerdict(classification, explanation);
  const redFlags = explanation?.red_flags || [];
  const greenFlags = explanation?.green_flags || [];
  const reasoning = explanation?.verdict_reasoning;
  const tierLabel = verdict.displayTier.replace(/_/g, " ");
  const recommendedAction = getRecommendedAction(verdict, redFlags, greenFlags);

  const summaryStyle = verdict.tone === "danger"
    ? "bg-danger-soft/70"
    : verdict.tone === "warning"
      ? "bg-warning-soft/70"
      : "bg-success-soft/70";

  const badgeStyle = verdict.tone === "danger"
    ? "bg-danger text-[#180609]"
    : verdict.tone === "warning"
      ? "bg-warning text-[#171006]"
      : "bg-success text-[#07140f]";

  const recommendationStyle = verdict.tone === "danger"
    ? "border-danger/20 bg-danger-soft/70"
    : verdict.tone === "warning"
      ? "border-warning/20 bg-warning-soft/70"
      : "border-success/20 bg-success-soft/70";

  const recommendationAccent = verdict.tone === "danger"
    ? "bg-danger text-[#180609]"
    : verdict.tone === "warning"
      ? "bg-warning text-[#171006]"
      : "bg-success text-[#07140f]";

  const recommendationLabel = verdict.tone === "danger"
    ? "text-danger"
    : verdict.tone === "warning"
      ? "text-warning"
      : "text-success";

  return (
    <div className="space-y-5">
      <section className={`rounded-[1.4rem] p-5 sm:p-6 ${summaryStyle}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ScoreGauge
            score={verdict.displayConfidence}
            tone={verdict.tone}
            label={`Confidence in the ${verdict.heading.toLowerCase()} assessment`}
          />
          <div className="min-w-0 flex-1">
            <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${badgeStyle}`}>
              {tierLabel}
            </span>
            <h3 className="mt-2.5 text-2xl font-semibold tracking-[-0.04em] text-foreground">{verdict.heading}</h3>
            <p className="mt-2 text-xs leading-5 text-muted">
              Produced by <span className="font-semibold text-foreground">{getSourceLabel(classification.source)}</span>
            </p>
          </div>
        </div>
        {!verdict.isInsufficient && (
          <p className="mt-4 border-t border-current/10 pt-3 text-[11px] leading-5 text-muted">
            The percentage shows confidence in this assessment—not the mathematical probability that the sender is fraudulent.
          </p>
        )}
      </section>

      {reasoning && (
        <section className="rounded-2xl bg-surface-elevated p-5">
          <h4 className="text-xs font-semibold text-muted">Why this result</h4>
          <p className="mt-2.5 text-sm leading-6 text-foreground/85">{reasoning}</p>
        </section>
      )}

      {!verdict.isInsufficient && explanation && (
        <div className="grid gap-3 sm:grid-cols-2">
          <EvidenceGroup
            tone="danger"
            title="Risk signals"
            items={redFlags}
            emptyText="No specific scam indicators were identified in the explanation."
          />
          <EvidenceGroup
            tone="success"
            title="Trust signals"
            items={greenFlags}
            emptyText="No strong legitimacy indicators were identified in the explanation."
          />
        </div>
      )}

      <section className={`flex items-start gap-4 rounded-2xl border p-5 sm:p-6 ${recommendationStyle}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-bold ${recommendationAccent}`} aria-hidden="true">›</span>
          <div>
            <p className={`text-sm font-semibold ${recommendationLabel}`}>Recommended next step</p>
            <h4 className="mt-1.5 text-xl font-semibold leading-6 tracking-[-0.025em] text-foreground">{recommendedAction.title}</h4>
            <p className="mt-2 text-[15px] leading-6 text-muted">
              {recommendedAction.description}
            </p>
          </div>
      </section>
    </div>
  );
}
