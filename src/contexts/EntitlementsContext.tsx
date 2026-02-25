import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UpgradePromptModal } from '@/components/UpgradePromptModal';

// --- Types ---

interface Entitlements {
    modules: string[];
    compass_daily_limit: number | null;
    google_calendar_sync: boolean;
    max_todos: number | null;
    max_memos: number | null;
    default_visibility: Record<string, boolean>;
    [key: string]: unknown;
}

interface LimitCheckResult {
    allowed: boolean;
    limit: number | null;
    current: number;
    message: string;
}

interface EntitlementsContextType {
    entitlements: Entitlements | null;
    loading: boolean;
    planId: string | null;
    purchasedProductIds: string[];

    canAccessModule: (moduleId: string) => boolean;
    hasPurchased: (productId: string) => boolean;
    checkTodoLimit: (currentCount: number) => LimitCheckResult;
    checkMemoLimit: (currentCount: number) => LimitCheckResult;
    checkCompassUsage: () => Promise<LimitCheckResult>;
    canUseGoogleCalendar: () => boolean;

    incrementCompassUsage: () => Promise<void>;
    compassUsageToday: number | null;

    showUpgradePrompt: (featureName: string, message?: string) => void;
    refetch: () => Promise<void>;
}

const CACHE_KEY_PREFIX = 'entitlements:v1:';

const GENEROUS_DEFAULTS: Entitlements = {
    modules: ['todo', 'goals', 'memo', 'schedule', 'settlement', 'habits', 'budget'],
    compass_daily_limit: null,
    google_calendar_sync: true,
    max_todos: null,
    max_memos: null,
    default_visibility: {},
};

function parseEntitlements(raw: Record<string, unknown>): Entitlements {
    const modules = Array.isArray(raw.modules) ? (raw.modules as string[]) : ['todo', 'goals', 'memo', 'schedule'];
    const compassLimit = raw.compass_daily_limit === null || raw.compass_daily_limit === undefined
        ? null
        : Number(raw.compass_daily_limit);
    const googleSync = raw.google_calendar_sync === true;
    const maxTodos = raw.max_todos === null || raw.max_todos === undefined ? null : Number(raw.max_todos);
    const maxMemos = raw.max_memos === null || raw.max_memos === undefined ? null : Number(raw.max_memos);

    const defaultVisibility: Record<string, boolean> = {};
    if (raw.default_visibility && typeof raw.default_visibility === 'object') {
        for (const [k, v] of Object.entries(raw.default_visibility as Record<string, unknown>)) {
            if (typeof v === 'boolean') defaultVisibility[k] = v;
        }
    }

    // Spread the rest for override keys like module:*, visibility:*
    const result: Entitlements = {
        ...raw,
        modules,
        compass_daily_limit: compassLimit,
        google_calendar_sync: googleSync,
        max_todos: maxTodos,
        max_memos: maxMemos,
        default_visibility: defaultVisibility,
    };

    return result;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
    const { user, isDemoMode } = useAuth();
    const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
    const [planId, setPlanId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [compassUsageToday, setCompassUsageToday] = useState<number | null>(null);
    const [purchasedProductIds, setPurchasedProductIds] = useState<string[]>([]);

    // Upgrade prompt modal state
    const [promptVisible, setPromptVisible] = useState(false);
    const [promptFeature, setPromptFeature] = useState<string>('');
    const [promptMessage, setPromptMessage] = useState<string | undefined>(undefined);

    const cacheKey = useMemo(() => `${CACHE_KEY_PREFIX}${user?.id ?? 'guest'}`, [user?.id]);

    const fetchEntitlements = useCallback(async () => {
        if (isDemoMode || !user) {
            setEntitlements(GENEROUS_DEFAULTS);
            setPlanId(null);
            setLoading(false);
            return;
        }

        let hasCachedData = false;

        try {
            // Load cached first for fast display
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.entitlements) {
                        const cachedEntitlements = parseEntitlements(parsed.entitlements);
                        setEntitlements(cachedEntitlements);
                        setPlanId(parsed.planId ?? null);
                        hasCachedData = true;
                    }
                } catch {
                    // ignore invalid cache
                }
            }

            // Fetch from RPC
            const { data, error } = await supabase.rpc('get_user_entitlements', {
                p_user_id: user.id,
            });

            if (error) {
                console.error('[Entitlements] RPC error:', error.message);
                // If no cache was loaded, use generous defaults
                if (!hasCachedData) setEntitlements(GENEROUS_DEFAULTS);
                return;
            }

            const parsed = parseEntitlements(data as Record<string, unknown>);
            setEntitlements(parsed);

            // Get plan ID separately
            const { data: subData } = await supabase
                .from('user_subscriptions')
                .select('plan_id')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing', 'past_due'])
                .limit(1)
                .maybeSingle();

            const currentPlanId = subData?.plan_id ?? 'free';
            setPlanId(currentPlanId);

            // Fetch user purchases
            const { data: purchaseData } = await supabase
                .from('user_purchases')
                .select('product_id, bundle_id')
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (purchaseData) {
                const ids: string[] = [];
                for (const p of purchaseData) {
                    if (p.product_id) ids.push(p.product_id);
                    if (p.bundle_id) ids.push(p.bundle_id);
                }
                setPurchasedProductIds(ids);
            }

            // Fetch today's compass usage
            const today = new Date().toISOString().split('T')[0];
            const { data: usageData } = await supabase
                .from('compass_usage')
                .select('request_count')
                .eq('user_id', user.id)
                .eq('used_at', today)
                .maybeSingle();

            setCompassUsageToday(usageData?.request_count ?? 0);

            // Cache for offline
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                entitlements: data,
                planId: currentPlanId,
            }));
        } catch (err) {
            console.error('[Entitlements] Fetch error:', err);
            if (!hasCachedData) setEntitlements(GENEROUS_DEFAULTS);
        } finally {
            setLoading(false);
        }
    }, [isDemoMode, user, cacheKey]);

    useEffect(() => {
        setLoading(true);
        fetchEntitlements();
    }, [fetchEntitlements]);

    const canAccessModule = useCallback((moduleId: string): boolean => {
        if (isDemoMode) return true;
        if (!entitlements) return true; // loading state — allow

        // Check module-specific override first
        const overrideKey = `module:${moduleId}`;
        if (overrideKey in entitlements) {
            return entitlements[overrideKey] === true;
        }

        // Check plan modules array
        return entitlements.modules.includes(moduleId);
    }, [isDemoMode, entitlements]);

    const checkTodoLimit = useCallback((currentCount: number): LimitCheckResult => {
        if (isDemoMode || !entitlements || entitlements.max_todos === null) {
            return { allowed: true, limit: null, current: currentCount, message: '' };
        }

        const limit = entitlements.max_todos;
        if (currentCount >= limit) {
            return {
                allowed: false,
                limit,
                current: currentCount,
                message: `미완료 할일은 ${limit}개까지 만들 수 있어요. 스토어에서 확장해볼까요?`,
            };
        }
        return { allowed: true, limit, current: currentCount, message: '' };
    }, [isDemoMode, entitlements]);

    const checkMemoLimit = useCallback((currentCount: number): LimitCheckResult => {
        if (isDemoMode || !entitlements || entitlements.max_memos === null) {
            return { allowed: true, limit: null, current: currentCount, message: '' };
        }

        const limit = entitlements.max_memos;
        if (currentCount >= limit) {
            return {
                allowed: false,
                limit,
                current: currentCount,
                message: `메모는 ${limit}개까지 작성할 수 있어요. 스토어에서 확장해볼까요?`,
            };
        }
        return { allowed: true, limit, current: currentCount, message: '' };
    }, [isDemoMode, entitlements]);

    const checkCompassUsage = useCallback(async (): Promise<LimitCheckResult> => {
        if (isDemoMode || !entitlements || entitlements.compass_daily_limit === null) {
            return { allowed: true, limit: null, current: compassUsageToday ?? 0, message: '' };
        }

        if (!user) {
            return { allowed: true, limit: null, current: 0, message: '' };
        }

        // Fetch fresh usage count
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('compass_usage')
            .select('request_count')
            .eq('user_id', user.id)
            .eq('used_at', today)
            .maybeSingle();

        const current = data?.request_count ?? 0;
        setCompassUsageToday(current);

        const limit = entitlements.compass_daily_limit;
        if (current >= limit) {
            return {
                allowed: false,
                limit,
                current,
                message: `오늘의 Compass 사용량(${limit}회)을 다 썼어요. 스토어에서 무제한 이용권을 살펴볼까요?`,
            };
        }
        return { allowed: true, limit, current, message: '' };
    }, [isDemoMode, entitlements, user, compassUsageToday]);

    const incrementCompassUsage = useCallback(async () => {
        if (isDemoMode || !user) return;

        const today = new Date().toISOString().split('T')[0];
        const nextCount = (compassUsageToday ?? 0) + 1;

        const { error } = await supabase
            .from('compass_usage')
            .upsert(
                { user_id: user.id, used_at: today, request_count: nextCount },
                { onConflict: 'user_id,used_at' }
            );

        if (!error) {
            setCompassUsageToday(nextCount);
        } else {
            console.error('[Entitlements] Failed to increment compass usage:', error.message);
        }
    }, [isDemoMode, user, compassUsageToday]);

    const canUseGoogleCalendar = useCallback((): boolean => {
        if (isDemoMode) return true;
        if (!entitlements) return true;
        return entitlements.google_calendar_sync === true;
    }, [isDemoMode, entitlements]);

    const hasPurchased = useCallback((productId: string): boolean => {
        return purchasedProductIds.includes(productId);
    }, [purchasedProductIds]);

    const showUpgradePrompt = useCallback((featureName: string, message?: string) => {
        setPromptFeature(featureName);
        setPromptMessage(message);
        setPromptVisible(true);
    }, []);

    const value = useMemo<EntitlementsContextType>(() => ({
        entitlements,
        loading,
        planId,
        purchasedProductIds,
        canAccessModule,
        hasPurchased,
        checkTodoLimit,
        checkMemoLimit,
        checkCompassUsage,
        canUseGoogleCalendar,
        incrementCompassUsage,
        compassUsageToday,
        showUpgradePrompt,
        refetch: fetchEntitlements,
    }), [
        entitlements, loading, planId, purchasedProductIds,
        canAccessModule, hasPurchased, checkTodoLimit, checkMemoLimit, checkCompassUsage,
        canUseGoogleCalendar, incrementCompassUsage, compassUsageToday,
        showUpgradePrompt, fetchEntitlements,
    ]);

    return (
        <EntitlementsContext.Provider value={value}>
            {children}
            <UpgradePromptModal
                visible={promptVisible}
                onClose={() => setPromptVisible(false)}
                featureName={promptFeature}
                limitMessage={promptMessage}
            />
        </EntitlementsContext.Provider>
    );
}

export function useEntitlements() {
    const context = useContext(EntitlementsContext);
    if (context === undefined) {
        throw new Error('useEntitlements must be used within an EntitlementsProvider');
    }
    return context;
}
