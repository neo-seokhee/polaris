import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Plus, Check, Flame } from "lucide-react-native";
import { TodoSkeleton } from "@/components/Skeleton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, Spacing, FontSizes, BorderRadius, LineHeights } from "@/constants/theme";
import { useTodos } from "@/hooks/useTodos";
import { useMemos } from "@/hooks/useMemos";
import { useGoals } from "@/hooks/useGoals";
import { requestGeminiCompass } from "@/lib/gemini";
import { loadCompassResponseGuide } from "@/lib/compassGuide";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { supabase } from "@/lib/supabase";
import { useDemoNudge } from "@/contexts/DemoNudgeContext";
import type { CompassSuggestion } from "@/lib/gemini";
import { findBestMatchingTodo, STRICT_MATCH_THRESHOLD, RELAXED_MATCH_THRESHOLD, type TodoLike } from "@/lib/compassMatcher";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  followUpQuestion?: string;
  suggestions?: Array<CompassSuggestion & { id: string; accepted?: boolean }>;
}

const BASE_SYSTEM_INSTRUCTION = [
  "너는 Polaris의 Compass 어시스턴트다.",
  "사용자에게 한국어로 답변한다.",
  "상담/고민 대화에서는 문제 해결 이전에 공감, 지지, 응원을 우선한다.",
  "사용자의 의도를 먼저 이해하고 감정을 존중한다.",
  "반드시 JSON만 출력한다. 코드블록 금지.",
  "응답 형식:",
  '{"message":"...", "followUpQuestion":"...", "suggestedTodos":[{"title":"...", "memo":"...", "reason":"..."}]}',
  "message는 기본적으로 다음 순서를 따른다: 현재 상황 진단 -> 방향성 제시 -> (필요한 경우에만) 실행 제안.",
  "사용자가 원하지 않으면 할일/액션을 강요하지 않는다.",
  "줄바꿈은 문장마다 하지 말고 문단/호흡 단위로 사용한다.",
  "한 문단에 2-3문장을 넘기지 않는다.",
  "기존 활성 할일과 맥락이 겹치면 새 할일을 만들지 말고, suggestedTodos.title에 기존 할일 제목을 그대로 사용한다.",
  "새로운 할일은 기존 할일과 명확히 다를 때만 제안한다.",
  "특정 할일을 제안하는 맥락에서만 '이 할일을 추가할까요?' 확인 질문을 제시한다.",
].join("\n");

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSuggestion(raw: any): (CompassSuggestion & { id: string; accepted?: boolean }) | null {
  const title = typeof raw?.title === "string" ? raw.title.trim() : "";
  if (!title) return null;
  return {
    id: typeof raw?.id === "string" && raw.id.trim() ? raw.id : makeId(),
    title,
    memo: typeof raw?.memo === "string" ? raw.memo : undefined,
    reason: typeof raw?.reason === "string" ? raw.reason : undefined,
    accepted: !!raw?.accepted,
  };
}

function hydrateSuggestions(raw: any): Array<CompassSuggestion & { id: string; accepted?: boolean }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeSuggestion(item))
    .filter((item): item is CompassSuggestion & { id: string; accepted?: boolean } => !!item);
}

function serializeSuggestions(raw?: Array<CompassSuggestion & { id: string; accepted?: boolean }>) {
  return (raw || []).map((item) => ({
    id: item.id,
    title: item.title,
    memo: item.memo || null,
    reason: item.reason || null,
    accepted: !!item.accepted,
  }));
}

function cleanMarkdown(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}

function formatAssistantText(text: string) {
  const normalized = cleanMarkdown(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!normalized) return "";

  // 이미 문단이 있으면 유지
  if (normalized.includes("\n\n")) {
    return normalized;
  }

  const sentences = (normalized.match(/[^.!?。！？\n]+[.!?。！？]?/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);

  // 문장 단위가 명확하지 않으면 원문 유지
  if (sentences.length <= 2) {
    return normalized;
  }

  // 2문장씩 문단으로 나눠 모바일 가독성 개선
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(" "));
  }
  return paragraphs.join("\n\n");
}

export default function CompassScreen() {
  useScreenTracking("screen_compass");
  const { user, isDemoMode } = useAuth();
  const { checkCompassUsage, incrementCompassUsage, compassUsageToday, entitlements, showUpgradePrompt } = useEntitlements();
  const { checkDemoAndNudge } = useDemoNudge();

  const { todos, loading: todoLoading, addTodo, setActive, updateTodoCategory } = useTodos();
  const { memos, loading: memoLoading } = useMemos();
  const { goals, isLoading: goalLoading } = useGoals();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseGuide, setResponseGuide] = useState<string>("");
  const [historyReady, setHistoryReady] = useState(false);
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const storageKey = useMemo(() => `compass:messages:demo`, []);

  const isLoadingData = todoLoading || memoLoading || goalLoading;

  const contextSummary = useMemo(() => {
    const activeTodos = todos.filter((todo) => !todo.is_completed);
    const importantTodos = activeTodos.filter((todo) => todo.is_active);
    const staleTodos = activeTodos.filter((todo) => {
      const created = new Date(todo.created_at).getTime();
      const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
      return days >= 7;
    });

    return {
      totalActiveTodos: activeTodos.length,
      totalImportantTodos: importantTodos.length,
      staleTodos: staleTodos.slice(0, 10).map((todo) => ({
        title: todo.title,
        category: todo.category,
        daysOpen: Math.floor((Date.now() - new Date(todo.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      recentTodos: activeTodos.slice(0, 15).map((todo) => ({
        title: todo.title,
        isActive: todo.is_active,
        category: todo.category,
        memo: todo.memo,
      })),
      allActiveTodoTitles: activeTodos.slice(0, 120).map((todo) => todo.title),
      recentMemos: memos.slice(0, 12).map((memo) => ({
        category: memo.category,
        content: memo.content,
      })),
      currentGoals: goals.slice(0, 12).map((goal) => ({
        title: goal.title,
        description: goal.description,
        type: goal.type,
        percentage: goal.percentage,
      })),
    };
  }, [todos, memos, goals]);

  const addAssistantMessage = useCallback((payload: {
    message: string;
    followUpQuestion?: string;
    suggestedTodos?: any[];
  }) => {
    const suggestions = hydrateSuggestions(payload.suggestedTodos || []);

    const message: ChatMessage = {
      id: makeId(),
      role: "assistant",
      text: payload.message,
      followUpQuestion: payload.followUpQuestion,
      suggestions,
    };

    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const loadServerHistory = useCallback(async () => {
    if (isDemoMode || !user) return;
    const { data, error } = await supabase
      .from("compass_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      const message = `[Compass] Failed to load server history: ${error.message}`;
      console.error(message);
      setError(message);
      return;
    }
    const loaded = (data || []).map((row) => ({
      id: row.id,
      role: row.role as ChatRole,
      text: row.content,
      followUpQuestion: row.follow_up_question || undefined,
      suggestions: hydrateSuggestions((row as any).suggested_todos),
    }));
    setMessages(loaded);
  }, [isDemoMode, user]);

  const persistMessage = useCallback(async (params: {
    role: ChatRole;
    text: string;
    followUpQuestion?: string;
    suggestions?: Array<CompassSuggestion & { id: string; accepted?: boolean }>;
  }) => {
    if (isDemoMode || !user) return true;
    try {
      const { error } = await supabase.from("compass_messages").insert({
        user_id: user.id,
        role: params.role,
        content: params.text,
        follow_up_question: params.followUpQuestion || null,
        suggested_todos: serializeSuggestions(params.suggestions),
      });
      if (error) {
        const message = `[Compass] Failed to persist message: ${error.message}`;
        console.error(message);
        setError(message);
        return false;
      }
      return true;
    } catch (e) {
      const message = `[Compass] Failed to persist message: ${String((e as any)?.message || e)}`;
      console.error(message);
      setError(message);
      return false;
    }
  }, [isDemoMode, user]);

  const requestCompass = useCallback(
    async (opts: { userMessage?: string; proactive?: boolean }) => {
      const { userMessage, proactive = false } = opts;
      setSending(true);
      setError(null);

      const currentMessages = [...messages];
      if (userMessage) {
        const userChat: ChatMessage = {
          id: makeId(),
          role: "user",
          text: userMessage,
        };
        setMessages((prev) => [...prev, userChat]);
        await persistMessage({ role: "user", text: userMessage });
        currentMessages.push(userChat);
      }

      // Compass daily limit check
      const usageCheck = await checkCompassUsage();
      if (!usageCheck.allowed) {
        setSending(false);
        showUpgradePrompt('Compass 요청', usageCheck.message);
        return;
      }

      try {
        const conversation = currentMessages.slice(-8).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const userPrompt = JSON.stringify(
          {
            mode: proactive ? "proactive" : "chat",
            now: new Date().toISOString(),
            userRequest:
              userMessage ||
              "사용자가 방금 Compass 탭에 들어왔습니다. 먼저 따뜻한 체크인과 공감 중심으로 대화를 시작해주세요. 필요할 때만 가벼운 방향 제안을 해주세요.",
            context: contextSummary,
            conversation,
            goals: [
              "사용자 상태를 이해하고 공감/지지하기",
              "필요 시에만 부담 없는 방향 제안하기",
              "할일 제안은 사용자가 원하거나 동의하는 맥락에서만 하기",
            ],
          },
          null,
          2
        );

        const ai = await requestGeminiCompass({
          systemInstruction: `${BASE_SYSTEM_INSTRUCTION}\n\n[Compass Response Guide]\n${responseGuide || "간결하고 친절한 파트너 톤으로, 문단/호흡 단위 줄바꿈으로 답변하세요."}`,
          userPrompt,
        });

        const canonicalSuggestions = (ai.suggestedTodos || []).map((suggestion) => {
          const matchedTodo = findBestMatchingTodo(todos as TodoLike[], suggestion, RELAXED_MATCH_THRESHOLD);
          if (!matchedTodo) return suggestion;
          return {
            ...suggestion,
            title: matchedTodo.title,
            memo: suggestion.memo || matchedTodo.memo || undefined,
            reason: suggestion.reason || "이미 등록된 할일입니다. 중요 표시 후 먼저 처리해보세요.",
          };
        });

        const assistantMessage = addAssistantMessage({
          message: ai.message,
          followUpQuestion: ai.followUpQuestion,
          suggestedTodos: canonicalSuggestions,
        });
        await persistMessage({
          role: "assistant",
          text: ai.message,
          followUpQuestion: ai.followUpQuestion,
          suggestions: assistantMessage.suggestions,
        });

        // Increment compass usage after successful response
        await incrementCompassUsage();
      } catch (e: any) {
        setError("잠시 문제가 생겼어요. 다시 시도해주세요.");
        addAssistantMessage({
          message: "응답을 생성하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
          followUpQuestion: "지금은 어떤 문제부터 정리할까요?",
        });
        await persistMessage({
          role: "assistant",
          text: "응답을 생성하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
          followUpQuestion: "지금은 어떤 문제부터 정리할까요?",
        });
      } finally {
        setSending(false);
      }
    },
    [messages, contextSummary, addAssistantMessage, responseGuide, persistMessage, checkCompassUsage, incrementCompassUsage, showUpgradePrompt]
  );

  useEffect(() => {
    void (async () => {
      const guide = await loadCompassResponseGuide();
      setResponseGuide(guide);
    })();
  }, []);

  useEffect(() => {
    let alive = true;

    void (async () => {
      if (isDemoMode || !user) {
        const localRaw = await AsyncStorage.getItem(storageKey);
        if (!alive) return;
        if (localRaw) {
          try {
            const parsed = JSON.parse(localRaw) as ChatMessage[];
            if (Array.isArray(parsed)) {
              setMessages(parsed);
            }
          } catch {
            // ignore invalid local cache
          }
        }
        if (alive) setHistoryReady(true);
        return;
      }

      await loadServerHistory();
      if (!alive) return;
      setHistoryReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [isDemoMode, user, storageKey, loadServerHistory]);

  useFocusEffect(
    useCallback(() => {
      if (!isDemoMode && user) {
        void loadServerHistory();
      }
      return () => {};
    }, [isDemoMode, user, loadServerHistory])
  );

  useEffect(() => {
    if (isDemoMode || !user) return;

    const channel = supabase
      .channel(`compass_messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "compass_messages",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadServerHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode, user, loadServerHistory]);

  useEffect(() => {
    if (!isDemoMode || user) return;
    void AsyncStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey, isDemoMode, user]);

  useEffect(() => {
    if (!historyReady || isLoadingData || initializedRef.current) return;
    initializedRef.current = true;
    if (messages.length === 0) {
      void requestCompass({ proactive: true });
    }
  }, [historyReady, isLoadingData, messages.length, requestCompass]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [messages, sending]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    await requestCompass({ userMessage: trimmed });
  }, [input, sending, requestCompass]);

  const handleAcceptSuggestion = useCallback(async (messageId: string, suggestionId: string) => {
    const sourceMessage = messages.find((m) => m.id === messageId);
    const suggestion = sourceMessage?.suggestions?.find((s) => s.id === suggestionId);
    if (!suggestion || addingSuggestionId) return;

    const matchedTodo = findBestMatchingTodo(todos as TodoLike[], suggestion);
    let succeeded = false;

    setAddingSuggestionId(suggestionId);
    try {
      if (matchedTodo) {
        if (matchedTodo.category) {
          const categoryResult = await updateTodoCategory(matchedTodo.id, null);
          if (categoryResult?.demoBlocked) {
            checkDemoAndNudge("Compass 제안 할일 중요 표시");
            return;
          }
          const categoryError = (categoryResult as any)?.error;
          if (categoryError) return;
        }
        const result = await setActive(matchedTodo.id, true);
        if (result?.demoBlocked) {
          checkDemoAndNudge("Compass 제안 할일 중요 표시");
          return;
        }
        if (result?.error) return;
        succeeded = true;
      } else {
        const result = await addTodo(suggestion.title, suggestion.memo || null);
        if (result?.demoBlocked) {
          checkDemoAndNudge("Compass 제안 할일 추가");
          return;
        }
        if (result?.error) return;
        succeeded = true;
      }

      if (succeeded) {
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== messageId || !message.suggestions) return message;
            return {
              ...message,
              suggestions: message.suggestions.map((item) =>
                item.id === suggestionId ? { ...item, accepted: true } : item
              ),
            };
          })
        );
      }
    } finally {
      setAddingSuggestionId(null);
    }
  }, [messages, todos, addingSuggestionId, addTodo, setActive, updateTodoCategory, checkDemoAndNudge]);

  if (isLoadingData && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <TodoSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Image source={require("../../../assets/sparkle-icon.png")} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Compass</Text>
        </View>
        <View style={styles.headerRight}>
          {entitlements?.compass_daily_limit != null &&
           (compassUsageToday ?? 0) >= entitlements.compass_daily_limit - 1 && (
            <Text style={styles.usageText}>
              오늘 {Math.max(0, entitlements.compass_daily_limit - (compassUsageToday ?? 0))}회 남음
            </Text>
          )}
          <Pressable
            style={styles.refreshButton}
            onPress={() => requestCompass({ proactive: true })}
            disabled={sending}
          >
            <Text style={styles.refreshButtonText}>새 제안</Text>
          </Pressable>
        </View>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <ScrollView
        ref={(node) => {
          scrollRef.current = node;
        }}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.messageBubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}
          >
            <Text style={styles.messageText}>
              {message.role === "assistant" ? formatAssistantText(message.text) : cleanMarkdown(message.text)}
            </Text>
            {!!message.followUpQuestion && (
              <Text style={styles.followUpText}>{formatAssistantText(message.followUpQuestion)}</Text>
            )}
            {!!message.suggestions?.length && (
              <View style={styles.suggestionWrap}>
                {message.suggestions.map((suggestion) => {
                  const matchedTodo = findBestMatchingTodo(todos as TodoLike[], suggestion);
                  const isHighlightAction = !!matchedTodo;
                  const isImportantDone = !!matchedTodo?.is_active;
                  const isAddDone = !!suggestion.accepted;
                  const isDone = isHighlightAction ? isImportantDone : isAddDone;
                  const isBusy = addingSuggestionId === suggestion.id;

                  return (
                    <View key={suggestion.id} style={styles.suggestionCard}>
                      <View style={styles.suggestionHeaderRow}>
                        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                        <Pressable
                          style={
                            isHighlightAction
                              ? [
                                  styles.suggestionImportantButton,
                                  isImportantDone && styles.suggestionImportantButtonActive,
                                ]
                              : [styles.suggestionIconButton, isAddDone && styles.suggestionIconButtonDone]
                          }
                          onPress={() => handleAcceptSuggestion(message.id, suggestion.id)}
                          disabled={isDone || isBusy}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          {isHighlightAction ? (
                            <Flame
                              size={16}
                              color={isImportantDone ? Colors.accent : Colors.textMuted}
                              fill={isImportantDone ? Colors.accent : "transparent"}
                            />
                          ) : isAddDone ? (
                            <Check size={11} color={Colors.textOnDark} />
                          ) : (
                            <Plus size={11} color={Colors.textOnDark} />
                          )}
                        </Pressable>
                      </View>
                      {!!suggestion.reason && (
                        <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {sending && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ActivityIndicator size="small" color={Colors.accent} />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputWrap}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="예: 오늘 무엇부터 해야 할까?"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          multiline
          editable={!sending}
          onKeyPress={(e: any) => {
            if (Platform.OS !== "web") return;
            if (e?.nativeEvent?.key === "Enter" && !e?.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              void handleSend();
            }
          }}
        />
        <Pressable style={[styles.sendButton, sending && styles.sendButtonDisabled]} onPress={handleSend} disabled={sending}>
          <Send size={16} color={Colors.textOnDark} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerIcon: {
    width: 23,
    height: 23,
  },
  headerTitle: {
    fontSize: FontSizes["3xl"],
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  usageText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  refreshButton: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.bgSecondary,
  },
  refreshButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  errorText: {
    color: Colors.error,
    paddingHorizontal: Spacing["3xl"],
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: Spacing["3xl"],
    paddingBottom: Spacing["2xl"],
    gap: Spacing.md,
  },
  messageBubble: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  assistantBubble: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.borderPrimary,
  },
  userBubble: {
    backgroundColor: Colors.bgSecondary,
    borderColor: Colors.accentBg,
  },
  messageText: {
    fontSize: FontSizes.base,
    lineHeight: LineHeights.md,
    color: Colors.textContent,
    fontWeight: "400",
  },
  followUpText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.md,
    color: Colors.accent,
    fontWeight: "600",
  },
  suggestionWrap: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  suggestionTitle: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: "600",
    lineHeight: LineHeights.base,
    flex: 1,
  },
  suggestionReason: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    lineHeight: LineHeights.sm,
  },
  suggestionIconButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  suggestionIconButtonDone: {
    backgroundColor: Colors.textSecondary,
  },
  suggestionImportantButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionImportantButtonActive: {
    backgroundColor: Colors.accentBg,
  },
  inputWrap: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderSecondary,
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.md,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-end",
    backgroundColor: Colors.bgSecondary,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});
