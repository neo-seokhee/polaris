import type { CompassSuggestion } from "@/lib/gemini";

export type TodoLike = {
  id: string;
  title: string;
  memo: string | null;
  category: string | null;
  is_completed: boolean;
  is_active: boolean;
};

const MATCH_STOPWORDS = new Set([
  "할일",
  "투두",
  "todo",
  "to",
  "do",
  "하기",
  "진행",
  "정리",
  "작업",
  "업무",
  "오늘",
  "지금",
  "먼저",
  "우선",
  "관련",
  "계획",
  "작성",
  "검토",
  "실행",
  "추진",
  "지원",
]);

function normalizeTodoTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeTodoTitle(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !MATCH_STOPWORDS.has(token));
}

function compact(value: string) {
  return normalizeTodoTitle(value).replace(/\s+/g, "");
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function getTitleMatchScore(todoTitle: string, suggestionTitle: string) {
  const todoNorm = normalizeTodoTitle(todoTitle);
  const suggestionNorm = normalizeTodoTitle(suggestionTitle);
  if (!todoNorm || !suggestionNorm) return 0;
  if (todoNorm === suggestionNorm) return 1;

  if (todoNorm.includes(suggestionNorm) || suggestionNorm.includes(todoNorm)) {
    return 0.95;
  }

  const todoCompact = compact(todoTitle);
  const suggestionCompact = compact(suggestionTitle);
  const minLen = Math.min(todoCompact.length, suggestionCompact.length);
  const maxLen = Math.max(todoCompact.length, suggestionCompact.length);
  if (!minLen || !maxLen) return 0;

  const distance = levenshteinDistance(todoCompact, suggestionCompact);
  if (distance <= 1 && minLen >= 4) {
    return 0.92;
  }

  const todoTitleTokens = tokenize(todoTitle);
  const suggestionTitleTokens = tokenize(suggestionTitle);
  if (!todoTitleTokens.length || !suggestionTitleTokens.length) return 0;

  const todoTitleSet = new Set(todoTitleTokens);
  let overlap = 0;
  suggestionTitleTokens.forEach((token) => {
    if (todoTitleSet.has(token)) overlap += 1;
  });
  return overlap / Math.max(suggestionTitleTokens.length, 1);
}

function getMatchScore(todo: TodoLike, suggestion: CompassSuggestion) {
  const titleScore = getTitleMatchScore(todo.title, suggestion.title);
  if (titleScore >= 0.92) return titleScore;

  const todoText = [todo.title, todo.memo || "", todo.category || ""].join(" ");
  const suggestionText = [suggestion.title, suggestion.memo || ""].join(" ");

  const normalizedTodoText = normalizeTodoTitle(todoText);
  const normalizedSuggestionText = normalizeTodoTitle(suggestionText);

  if (!normalizedTodoText || !normalizedSuggestionText) return 0;
  if (normalizedTodoText === normalizedSuggestionText) return 1;

  if (
    normalizedTodoText.includes(normalizedSuggestionText) ||
    normalizedSuggestionText.includes(normalizedTodoText)
  ) {
    return 0.95;
  }

  const todoTokens = tokenize(todoText);
  const suggestionTokens = tokenize(suggestionText);
  if (!todoTokens.length || !suggestionTokens.length) return 0;

  const todoSet = new Set(todoTokens);
  const suggestionSet = new Set(suggestionTokens);
  let overlapCount = 0;
  suggestionSet.forEach((token) => {
    if (todoSet.has(token)) overlapCount += 1;
  });

  const overlapBySuggestion = overlapCount / suggestionSet.size;
  const overlapByTodo = overlapCount / Math.max(todoSet.size, 1);

  const hasCorePhrase =
    tokenize(suggestion.title).some((token) => todoSet.has(token) && token.length >= 3) ||
    tokenize(todo.title).some((token) => suggestionSet.has(token) && token.length >= 3);

  let contextScore = overlapBySuggestion * 0.7 + overlapByTodo * 0.3;
  if (hasCorePhrase) contextScore += 0.1;

  const score = titleScore * 0.78 + contextScore * 0.22;
  return Math.min(score, 1);
}

export const STRICT_MATCH_THRESHOLD = 0.66;
export const RELAXED_MATCH_THRESHOLD = 0.58;

export function findBestMatchingTodo(
  todos: TodoLike[],
  suggestion: CompassSuggestion,
  threshold: number = STRICT_MATCH_THRESHOLD
) {
  const candidates = todos.filter((todo) => !todo.is_completed);
  let best: { todo: TodoLike; score: number } | null = null;

  for (const todo of candidates) {
    const score = getMatchScore(todo, suggestion);
    if (!best || score > best.score) {
      best = { todo, score };
    }
  }

  if (best && best.score >= threshold) return best.todo;
  return null;
}
