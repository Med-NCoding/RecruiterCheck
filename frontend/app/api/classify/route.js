import {
  callGroq,
  callOriginalBackend,
  classifyLocally,
  validateMessage,
} from "../../lib/server-analysis";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const validation = validateMessage(body.message);

  if (validation.error) {
    return Response.json({ detail: validation.error }, { status: 400 });
  }

  const { message } = validation;
  const backendResult = await callOriginalBackend("/api/classify", { message });
  if (backendResult) return Response.json(backendResult);

  const groqResult = await callGroq({
    system: "You classify recruiter outreach for fraud risk. Return only valid JSON.",
    prompt: `Classify the recruiter outreach below as a scam or legitimate. Consider requests for money, gift cards, crypto, checks, off-platform messaging, unrealistic pay, urgency, instant hiring, verifiable role details, and conventional interview steps.\n\nMessage:\n${JSON.stringify(message)}\n\nReturn exactly this JSON shape:\n{"is_scam": boolean, "confidence": number from 0 to 1, "verdict_tier": "CRITICAL_RISK" | "HIGH_RISK" | "SUSPICIOUS" | "SAFE" | "LOW_RISK" | "UNVERIFIED"}`,
    temperature: 0.1,
  });

  if (groqResult && typeof groqResult.is_scam === "boolean") {
    const confidence = Math.min(Math.max(Number(groqResult.confidence) || 0.55, 0.5), 0.99);
    return Response.json({
      is_scam: groqResult.is_scam,
      confidence,
      verdict_tier: groqResult.verdict_tier || (groqResult.is_scam ? "SUSPICIOUS" : "UNVERIFIED"),
      source: "groq",
    });
  }

  return Response.json(classifyLocally(message));
}
