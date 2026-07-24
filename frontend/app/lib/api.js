const REQUEST_TIMEOUT_MS = 25000;

async function requestJson(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const detail = payload?.detail;

      if (response.status === 503) {
        throw new Error("The analysis service is temporarily unavailable. Please try again shortly.");
      }

      throw new Error(
        typeof detail === "string"
          ? detail
          : "The analysis service could not complete this request. Please try again."
      );
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The analysis took too long to respond. Please try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("We could not reach the analysis service. Check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function classifyMessage(message) {
  return requestJson("/api/classify", { message });
}

export async function explainVerdict(message, is_scam, confidence) {
  return requestJson("/api/explain", { message, is_scam, confidence });
}

export async function simulateStage(message, stage) {
  return requestJson("/api/simulate", { message, stage });
}
