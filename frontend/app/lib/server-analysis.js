const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20000;

const RISK_RULES = [
  {
    pattern: /\b(telegram|whatsapp|signal|skype)\b/i,
    flag: "Moves the conversation to an off-platform messaging app",
    weight: 2,
  },
  {
    pattern: /\b(gift\s?card|bitcoin|crypto(?:currency)?|usdt|wire transfer|zelle|cash app)\b/i,
    flag: "Requests or references a hard-to-reverse payment method",
    weight: 3,
  },
  {
    pattern: /\b(refundable|insurance|processing|activation|registration|equipment)\s+(fee|deposit|payment)\b/i,
    flag: "Requires an upfront fee or refundable payment",
    weight: 3,
  },
  {
    pattern: /\b(certified |cashier'?s? |digital |mobile[- ]deposit )?check\b/i,
    flag: "Mentions a check or deposit process commonly used in equipment fraud",
    weight: 2,
  },
  {
    pattern: /\b(rate|rating|like|liking|optimiz(?:e|ing)|review)\s+(apps?|videos?|products?|hotels?)\b/i,
    flag: "Offers vague, low-effort online tasks associated with task scams",
    weight: 2,
  },
  {
    pattern: /\b(congratulations|selected|accepted|hired)\b[\s\S]{0,80}\b(without|immediately|today|position|role)\b/i,
    flag: "Suggests immediate selection or hiring without a normal interview process",
    weight: 2,
  },
  {
    pattern: /\b(act now|reply now|immediately|urgent|limited slots?|today only)\b/i,
    flag: "Uses urgency to pressure a quick response",
    weight: 1,
  },
  {
    pattern: /\b\$\s?(?:[3-9]\d{2}|\d{4,})\s*(?:\/|per\s+)(?:day|hour)\b/i,
    flag: "Promises unusually high pay for the amount or type of work described",
    weight: 2,
  },
  {
    pattern: /@[a-z0-9_]{4,}/i,
    flag: "Provides an unverified social-media handle instead of an official contact channel",
    weight: 1,
  },
];

const TRUST_RULES = [
  {
    pattern: /\b(video|phone|connection|screening|introductory)\s+(call|interview|chat)\b/i,
    flag: "Proposes a conventional call or interview step",
    weight: 1,
  },
  {
    pattern: /\b(team|department|hiring manager|reporting to|responsibilities|qualifications)\b/i,
    flag: "Includes role or team-specific context",
    weight: 1,
  },
  {
    pattern: /\b(benefits|equity|base salary|salary range|job description)\b/i,
    flag: "Uses conventional employment and compensation language",
    weight: 1,
  },
  {
    pattern: /https?:\/\/(?:careers?|jobs?)\.[a-z0-9.-]+|https?:\/\/[a-z0-9.-]+\/(?:careers?|jobs?)/i,
    flag: "References a company careers or jobs page",
    weight: 2,
  },
  {
    pattern: /\b(would you be open|availability|schedule|next week|this (?:monday|tuesday|wednesday|thursday|friday))\b/i,
    flag: "Invites a scheduled conversation without applying immediate pressure",
    weight: 1,
  },
];

const SIMULATION_FALLBACKS = {
  1: {
    sender: "Recruitment Coordinator",
    content:
      "Thank you for your interest. Our interview is conducted through a private messaging app for faster processing. Please add the hiring manager using the handle provided and message them immediately so your application is not delayed.",
    playbook_focus:
      "Moves the candidate away from official company channels to an account that is harder to verify.",
  },
  2: {
    sender: "Hiring Manager",
    content:
      "Congratulations—your responses have been reviewed and you have been selected. Please sign the attached digital offer and complete a short online task today so we can finalize your onboarding.",
    playbook_focus:
      "Creates excitement with an unusually fast offer and uses a trivial task to build compliance.",
  },
  3: {
    sender: "Onboarding Specialist",
    content:
      "We will issue a company check for your home-office equipment. Deposit it through your banking app, then use the available funds to pay our approved vendor. Send a screenshot once the payment is complete.",
    playbook_focus:
      "Uses a fraudulent check so the victim sends real money before the original deposit is reversed.",
  },
};

function collectEvidence(message) {
  const redFlags = [];
  const greenFlags = [];
  let riskScore = 0;
  let trustScore = 0;

  for (const rule of RISK_RULES) {
    if (rule.pattern.test(message)) {
      redFlags.push(rule.flag);
      riskScore += rule.weight;
    }
  }

  for (const rule of TRUST_RULES) {
    if (rule.pattern.test(message)) {
      greenFlags.push(rule.flag);
      trustScore += rule.weight;
    }
  }

  return { redFlags, greenFlags, riskScore, trustScore };
}

function getTier(isScam, confidence) {
  if (isScam) {
    if (confidence > 0.85) return "CRITICAL_RISK";
    if (confidence > 0.6) return "HIGH_RISK";
    return "SUSPICIOUS";
  }

  if (confidence > 0.85) return "SAFE";
  if (confidence > 0.6) return "LOW_RISK";
  return "UNVERIFIED";
}

export function classifyLocally(message) {
  const { riskScore, trustScore } = collectEvidence(message);
  const isScam = riskScore >= 3 && riskScore > trustScore;
  const signalStrength = isScam ? riskScore - trustScore : trustScore - riskScore;
  const confidence = Math.min(0.55 + Math.max(signalStrength, 0) * 0.065, 0.94);

  return {
    is_scam: isScam,
    confidence,
    verdict_tier: getTier(isScam, confidence),
    source: "local_heuristic",
  };
}

export function explainLocally(message, isScam) {
  const { redFlags, greenFlags } = collectEvidence(message);
  let verdictReasoning;

  if (isScam) {
    verdictReasoning = redFlags.length
      ? `This outreach matches ${redFlags.length} common recruitment-scam pattern${redFlags.length === 1 ? "" : "s"}. Verify the sender through the company’s official website and do not send money or sensitive information.`
      : "The message was flagged as suspicious, but the local analyzer could not isolate a single dominant pattern. Verify the sender independently before continuing.";
  } else if (greenFlags.length) {
    verdictReasoning = `The message contains ${greenFlags.length} conventional recruiting signal${greenFlags.length === 1 ? "" : "s"} and no stronger fraud pattern. This is a positive indicator, not a guarantee—verify the sender’s identity independently.`;
  } else {
    verdictReasoning =
      "No high-confidence scam pattern was found, but the message also lacks strong verification signals. Treat it as unverified and confirm the employer through an official channel.";
  }

  return {
    red_flags: redFlags,
    green_flags: greenFlags,
    verdict_reasoning: verdictReasoning,
  };
}

function normalizeBackendUrl() {
  return process.env.BACKEND_API_URL?.trim().replace(/\/$/, "") || null;
}

export async function callOriginalBackend(path, body) {
  const backendUrl = normalizeBackendUrl();
  if (!backendUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGroq({ system, prompt, temperature = 0.2 }) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function getSimulationFallback(stage) {
  return {
    stage,
    ...(SIMULATION_FALLBACKS[stage] || SIMULATION_FALLBACKS[1]),
  };
}

export function validateMessage(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "Message content cannot be empty." };
  }

  if (value.length > 5000) {
    return { error: "Message content cannot exceed 5,000 characters." };
  }

  return { message: value.trim() };
}
