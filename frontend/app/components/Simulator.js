"use client";

import { useEffect, useRef, useState } from "react";
import { simulateStage } from "../lib/api";
import { PLAYBOOK_STAGES } from "../lib/constants";

function ChatMessage({ message }) {
  if (message.type === "system") {
    return (
      <li className="mx-auto max-w-[92%] rounded-2xl bg-surface-elevated px-4 py-3 text-center text-xs leading-5 text-muted">
        {message.content}
      </li>
    );
  }

  if (message.type === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[72%]">
          <p className="mb-1.5 text-right text-[10px] font-medium text-muted">You</p>
          <div className="rounded-[1.25rem] rounded-br-md bg-accent px-4 py-3 text-sm leading-6 text-[#07111d]">
            {message.content}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger-soft font-mono text-[9px] font-semibold text-danger" aria-hidden="true">SC</span>
      <div className="max-w-[82%]">
        <p className="mb-1.5 text-[10px] font-medium text-danger">{message.sender}</p>
        <div className="rounded-[1.25rem] rounded-bl-md bg-danger-soft/70 px-4 py-3 text-sm leading-6 text-foreground/90">
          {message.content}
        </div>
        {message.playbookFocus && (
          <div className="mt-2 rounded-lg border-l-2 border-danger bg-surface-elevated/65 px-3 py-2 text-[11px] leading-5 text-muted">
            <span className="font-semibold text-danger">Tactic:</span> {message.playbookFocus}
          </div>
        )}
      </div>
    </li>
  );
}

function TypingIndicator() {
  return (
    <li className="flex items-center gap-3" role="status">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger-soft font-mono text-[9px] font-semibold text-danger" aria-hidden="true">SC</span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface-elevated px-4 py-3">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
        <span className="sr-only">Generating a simulated response</span>
      </div>
    </li>
  );
}

export default function Simulator({ message, isScam }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState(null);
  const endRef = useRef(null);
  const delayRef = useRef(null);
  const mountedRef = useRef(true);

  const isActive = Boolean(isScam && message);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length || loading) {
      const frame = requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [messages, loading]);

  async function handleStageClick(stageInfo) {
    if (!isActive || loading) return;

    const userMessage = {
      id: `user-${stageInfo.stage}-${Date.now()}`,
      type: "user",
      content: stageInfo.userPrompt,
    };

    setActiveStage(stageInfo.stage);
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const data = await simulateStage(message, stageInfo.stage);
      if (!mountedRef.current) return;

      delayRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setMessages((current) => [
          ...current,
          {
            id: `scammer-${stageInfo.stage}-${Date.now()}`,
            type: "scammer",
            sender: data.sender,
            content: data.content,
            playbookFocus: data.playbook_focus,
          },
        ]);
        setLoading(false);
      }, 650);
    } catch (requestError) {
      if (!mountedRef.current) return;
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          type: "system",
          content: requestError.message,
        },
      ]);
      setLoading(false);
    }
  }

  function handleReset() {
    if (delayRef.current) clearTimeout(delayRef.current);
    setMessages([]);
    setActiveStage(null);
    setLoading(false);
  }

  const statusLabel = isActive ? "Ready to simulate" : "Locked until a scam is detected";

  return (
    <section className="panel overflow-hidden" aria-labelledby="simulator-heading">
      <div className="border-b border-border bg-surface px-6 py-6 sm:px-9 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Interactive walkthrough</p>
            <h2 id="simulator-heading" className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Scam escalation playbook.</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Explore how suspicious outreach can escalate from an innocent reply to off-platform pressure and payment fraud. Responses are generated for awareness only.
            </p>
          </div>
          <div className={`flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium ${isActive ? "bg-success-soft text-success" : "bg-surface-elevated text-muted"}`} aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {statusLabel}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-h-[31rem] flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 border-b border-border bg-[#11151a] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-danger-soft font-mono text-[9px] font-semibold text-danger" aria-hidden="true">SC</span>
              <div>
                <p className="text-xs font-semibold text-foreground">Simulated recruiter</p>
                <p className="mt-0.5 text-[10px] text-muted">AI-generated training scenario</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={handleReset} disabled={loading} className="rounded-full px-3 py-1.5 text-[11px] font-medium text-accent transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40">
                Clear conversation
              </button>
            )}
          </div>

          <ol className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6" role="log" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && (
              <ChatMessage
                message={{
                  type: "system",
                  content: isActive
                    ? "The analyzed message was flagged as suspicious. Choose any stage to see how that tactic could sound in a follow-up."
                    : "Run an analysis first. The playbook unlocks only when the outreach is flagged as a potential scam.",
                }}
              />
            )}
            {messages.map((chatMessage) => <ChatMessage key={chatMessage.id} message={chatMessage} />)}
            {loading && <TypingIndicator />}
            <li ref={endRef} aria-hidden="true" />
          </ol>

          <div className="border-t border-border bg-surface-elevated/45 px-5 py-3 text-[10px] leading-4 text-muted sm:px-6">
            Never follow links, contact handles, or payment instructions shown in a simulation.
          </div>
        </div>

        <aside className="bg-surface-elevated/35 p-5 sm:p-6" aria-label="Scam playbook stages">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground">Choose a stage</h3>
            <span className="font-mono text-[10px] text-muted">01—03</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">Each stage uses the analyzed message as context.</p>

          <div className="relative mt-5 space-y-3">
            <div className="absolute bottom-5 left-[1.05rem] top-5 w-px bg-border" aria-hidden="true" />
            {PLAYBOOK_STAGES.map((stageInfo) => {
              const isSelected = activeStage === stageInfo.stage;
              return (
                <button
                  key={stageInfo.stage}
                  type="button"
                  disabled={!isActive || loading}
                  aria-pressed={isSelected}
                  onClick={() => handleStageClick(stageInfo)}
                  className={`relative flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : "border-transparent bg-surface hover:bg-[#252a31]"
                  } disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-45`}
                >
                  <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold ${isSelected ? "bg-accent text-[#07111d]" : "bg-surface-elevated text-muted"}`}>
                    0{stageInfo.stage}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{stageInfo.title}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-muted">{stageInfo.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
