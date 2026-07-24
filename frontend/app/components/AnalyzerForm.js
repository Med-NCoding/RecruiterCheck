"use client";

import { EXAMPLES } from "../lib/constants";

export default function AnalyzerForm({
  message,
  onMessageChange,
  onSubmit,
  onClear,
  isScanning,
  scanPhase,
  hasResult,
  minChars,
}) {
  const charCount = message.trim().length;
  const needsContext = charCount > 0 && charCount < minChars;
  const activeExample = EXAMPLES.find((example) => example.message === message)?.id;

  function handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (message.trim() && !isScanning) onSubmit(event);
    }
  }

  return (
    <form className="panel flex h-full flex-col p-6 sm:p-9" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Your message</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">Paste the recruiter outreach.</h2>
          <p id="message-help" className="mt-2 text-sm leading-6 text-muted">
            Include the offer, proposed next steps, pay details, and contact method when available.
          </p>
        </div>
        <span className="hidden rounded-full bg-surface-elevated px-3 py-1.5 font-mono text-[10px] font-medium text-muted sm:block">
          ⌘ / Ctrl + Enter
        </span>
      </div>

      <label htmlFor="recruiter-message" className="sr-only">Recruiter message</label>
      <div className="relative mt-6 flex-1">
        <textarea
          id="recruiter-message"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isScanning}
          maxLength={5000}
          aria-describedby="message-help message-count"
          placeholder="Paste the email, direct message, text, or job offer here…"
          className="min-h-72 w-full resize-y rounded-2xl border border-transparent bg-surface-elevated px-5 py-5 text-[15px] leading-6 text-foreground outline-none transition placeholder:text-muted/60 hover:bg-[#242930] focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15 disabled:cursor-wait disabled:opacity-70"
        />
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-surface/90 px-2.5 py-1 backdrop-blur-sm">
          <span id="message-count" className={`font-mono text-[10px] ${needsContext ? "text-warning" : "text-muted"}`}>
            {charCount.toLocaleString()} / 5,000
          </span>
        </div>
      </div>

      <div className="mt-3 min-h-6" aria-live="polite">
        {needsContext ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-warning">
            <span className="status-dot scale-75" aria-hidden="true" />
            Add {minChars - charCount} more characters for a reliable analysis.
          </p>
        ) : (
          <p className="text-xs text-muted">
            {charCount >= minChars ? "Enough context for a full scan." : `For best results, include at least ${minChars} characters.`}
          </p>
        )}
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-muted">Or start with an example</legend>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              aria-pressed={activeExample === example.id}
              disabled={isScanning}
              onClick={() => onMessageChange(example.message)}
              className={`flex min-h-10 items-center justify-center gap-2 rounded-full border px-3 py-2 text-center text-xs font-medium transition ${
                activeExample === example.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-transparent bg-surface-elevated text-muted hover:bg-[#292e36] hover:text-foreground"
              } disabled:cursor-wait disabled:opacity-50`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${example.tag === "SCAM" ? "bg-danger" : "bg-success"}`} aria-hidden="true" />
              <span>{example.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
        {hasResult && (
          <button
            type="button"
            onClick={onClear}
            disabled={isScanning}
            className="min-h-12 rounded-full px-5 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        )}
        <button
          type="submit"
          disabled={!message.trim() || isScanning}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-[#07111d] transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isScanning ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              {scanPhase === "classify" ? "Checking message…" : "Explaining signals…"}
            </>
          ) : (
            <>
              Analyze message
              <span aria-hidden="true">›</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
