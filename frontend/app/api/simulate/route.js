import {
  callGroq,
  callOriginalBackend,
  getSimulationFallback,
  validateMessage,
} from "../../lib/server-analysis";

export const runtime = "nodejs";

const STAGE_CONTEXT = {
  1: "Move the candidate from an official channel to Telegram, WhatsApp, Signal, or another private messaging account.",
  2: "Claim the candidate passed immediately, issue a generic offer, and introduce a trivial online task.",
  3: "Introduce equipment-check or vendor-payment fraud while keeping the output non-actionable and educational.",
};

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const validation = validateMessage(body.message);
  const stage = Number(body.stage);

  if (validation.error) {
    return Response.json({ detail: validation.error }, { status: 400 });
  }

  if (![1, 2, 3].includes(stage)) {
    return Response.json({ detail: "Stage must be 1, 2, or 3." }, { status: 400 });
  }

  const { message } = validation;
  const backendResult = await callOriginalBackend("/api/simulate", { message, stage });
  if (backendResult) return Response.json(backendResult);

  const groqResult = await callGroq({
    system: "You create brief, educational examples of recruiter-scam language for defensive awareness. Return only valid JSON. Do not include live links, real phone numbers, usable payment destinations, or instructions that facilitate fraud.",
    prompt: `Create a realistic but non-actionable simulated follow-up for stage ${stage}. Stage goal: ${STAGE_CONTEXT[stage]}\n\nOriginal suspicious outreach:\n${JSON.stringify(message)}\n\nReturn exactly this JSON shape:\n{"sender": string, "content": string, "playbook_focus": string}`,
    temperature: 0.6,
  });

  if (groqResult?.content) {
    return Response.json({
      stage,
      sender: groqResult.sender || "Recruitment Coordinator",
      content: groqResult.content,
      playbook_focus: groqResult.playbook_focus || STAGE_CONTEXT[stage],
    });
  }

  return Response.json(getSimulationFallback(stage));
}
