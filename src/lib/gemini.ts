interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export interface CompassSuggestion {
  title: string;
  memo?: string;
  reason?: string;
}

export interface CompassAIResponse {
  message: string;
  suggestedTodos: CompassSuggestion[];
  followUpQuestion?: string;
}

function extractJsonFromText(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1).trim();
  }

  return null;
}

function normalizeResponse(parsed: any): CompassAIResponse {
  const message = typeof parsed?.message === "string" ? parsed.message.trim() : "";
  const followUpQuestion =
    typeof parsed?.followUpQuestion === "string" ? parsed.followUpQuestion.trim() : undefined;

  const suggestedTodos = Array.isArray(parsed?.suggestedTodos)
    ? parsed.suggestedTodos
      .slice(0, 5)
      .map((todo: any) => ({
        title: String(todo?.title ?? "").trim(),
        memo: typeof todo?.memo === "string" ? todo.memo.trim() : undefined,
        reason: typeof todo?.reason === "string" ? todo.reason.trim() : undefined,
      }))
      .filter((todo: CompassSuggestion) => todo.title.length > 0)
    : [];

  return {
    message: message || "지금 상황을 바탕으로 다음 액션을 함께 정리해볼까요?",
    suggestedTodos,
    followUpQuestion,
  };
}

export async function requestGeminiCompass(params: {
  apiKey: string;
  systemInstruction: string;
  userPrompt: string;
}): Promise<CompassAIResponse> {
  const { apiKey, systemInstruction, userPrompt } = params;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n").trim();

  if (!rawText) {
    throw new Error("Gemini response is empty");
  }

  const jsonText = extractJsonFromText(rawText);
  if (!jsonText) {
    return normalizeResponse({ message: rawText, suggestedTodos: [] });
  }

  try {
    return normalizeResponse(JSON.parse(jsonText));
  } catch {
    return normalizeResponse({ message: rawText, suggestedTodos: [] });
  }
}

