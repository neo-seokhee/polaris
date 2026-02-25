import { supabase } from './supabase';

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
  systemInstruction: string;
  userPrompt: string;
}): Promise<CompassAIResponse> {
  const { systemInstruction, userPrompt } = params;

  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { systemInstruction, userPrompt },
  });

  if (error) {
    throw new Error(`Gemini proxy error: ${error.message}`);
  }

  const geminiData = data as GeminiResponse;
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n").trim();

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
