"use client";

import VerdictCard from "./VerdictCard";

function EmptyAnalysis() {
  return (
    <div className="flex min-h-[32rem] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="relative grid h-20 w-20 place-items-center rounded-full bg-accent-soft">
        <span className="text-2xl font-semibold text-accent">R</span>
        <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-[3px] border-surface bg-success" aria-hidden="true" />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-foreground">Your assessment will appear here.</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
        We’ll summarize the risk level, explain the strongest signals, and show which analysis engine produced the result.
      </p>
      <div className="mt-7 grid w-full max-w-sm grid-cols-3 gap-2 text-[11px] font-medium text-muted">
        {['Risk score', 'Red flags', 'Green flags'].map((label) => (
          <div key={label} className="rounded-xl bg-surface-elevated px-2 py-3">{label}</div>
        ))}
      </div>
    </div>
  );
}

function LoadingAnalysis({ phase }) {
  return (
    <div className="min-h-[32rem] p-6 sm:p-9" role="status">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="eyebrow">Your assessment</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Analyzing the outreach…</h2>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[11px] font-bold text-accent">
          {phase === "classify" ? "Classifying" : "Explaining"}
        </span>
      </div>

      <div className="mt-6 rounded-2xl bg-surface-elevated p-5">
        <div className="flex items-center gap-5">
          <div className="skeleton h-20 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-5 w-24 rounded-md" />
            <div className="skeleton h-7 w-3/4 rounded-md" />
            <div className="skeleton h-3 w-1/2 rounded-md" />
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="skeleton h-4 w-32 rounded-md" />
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        {phase === "classify" ? "Checking language and scam patterns…" : "Turning the model output into clear evidence…"}
      </p>
    </div>
  );
}

export default function AnalysisPanel({
  classification,
  explanation,
  isScanning,
  scanPhase,
  error,
  tooShort,
  minChars,
  onRetry,
}) {
  return (
    <section
      className="panel min-h-full overflow-hidden"
      aria-live="polite"
      aria-busy={isScanning}
      aria-labelledby="analysis-heading"
    >
      {!classification && !isScanning && !error && <EmptyAnalysis />}
      {isScanning && <LoadingAnalysis phase={scanPhase} />}

      {!isScanning && error && !classification && (
        <div className="flex min-h-[32rem] flex-col items-center justify-center px-6 py-12 text-center" role="alert">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-lg font-semibold text-danger">!</span>
          <h2 id="analysis-heading" className="mt-5 text-xl font-semibold tracking-[-0.03em]">Analysis interrupted.</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{error}</p>
          <button type="button" onClick={onRetry} className="mt-6 min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-[#07111d] transition hover:bg-accent-strong">
            Try again
          </button>
        </div>
      )}

      {!isScanning && classification && (
        <div className="p-6 sm:p-9">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="eyebrow">Your assessment</p>
              <h2 id="analysis-heading" className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Outreach risk assessment.</h2>
            </div>
            <span className="rounded-full bg-success-soft px-3 py-1.5 text-[10px] font-semibold text-success">Complete</span>
          </div>

          {tooShort && (
            <div className="mt-5 rounded-xl border border-warning/25 bg-warning-soft p-4" role="note">
              <p className="text-sm font-bold text-warning">More context is needed</p>
              <p className="mt-1 text-xs leading-5 text-warning/90">
                This message is under {minChars} characters, so the neutral score below is a placeholder—not a security verdict. Paste the full outreach for a reliable assessment.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-warning/25 bg-warning-soft p-4" role="alert">
              <p className="text-sm font-bold text-warning">The classification completed, but the explanation did not.</p>
              <p className="mt-1 text-xs leading-5 text-warning/90">{error}</p>
            </div>
          )}

          <div className="mt-5">
            <VerdictCard classification={classification} explanation={explanation} />
          </div>
        </div>
      )}
    </section>
  );
}
