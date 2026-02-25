import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '@/contexts/AuthContext';
import { replayQueue, pendingCount as getPendingCount } from '@/lib/syncQueue';

interface NetworkContextType {
    isOnline: boolean;
    isSyncing: boolean;
    syncError: boolean;
    pendingCount: number;
    /** 동기화 완료 시마다 +1 — 훅에서 refetch 트리거에 사용 */
    syncVersion: number;
    triggerSync: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
    isOnline: true,
    isSyncing: false,
    syncError: false,
    pendingCount: 0,
    syncVersion: 0,
    triggerSync: async () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [pending, setPending] = useState(0);
    const [syncVersion, setSyncVersion] = useState(0);
    const syncingRef = useRef(false);

    // 네트워크 상태 감지
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);
            setIsOnline(navigator.onLine);
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOnline(state.isConnected ?? true);
        });
        return () => unsubscribe();
    }, []);

    // pending count 업데이트
    const refreshPending = useCallback(async () => {
        if (!user) { setPending(0); return; }
        const count = await getPendingCount(user.id);
        setPending(count);
    }, [user]);

    useEffect(() => {
        refreshPending();
    }, [refreshPending]);

    // 동기화 실행
    const triggerSync = useCallback(async () => {
        if (!user || syncingRef.current || !isOnline) return;
        syncingRef.current = true;
        setIsSyncing(true);
        setSyncError(false);
        try {
            const remaining = await replayQueue(user.id);
            setPending(remaining);
            if (remaining > 0) {
                setSyncError(true);
            }
            // 동기화 완료(성공이든 부분 실패이든) → 훅들에게 refetch 신호
            setSyncVersion((v) => v + 1);
        } catch {
            setSyncError(true);
        } finally {
            setIsSyncing(false);
            syncingRef.current = false;
        }
    }, [user, isOnline]);

    // 오프라인→온라인 전환 시 자동 동기화
    const prevOnlineRef = useRef(isOnline);
    useEffect(() => {
        if (!prevOnlineRef.current && isOnline) {
            triggerSync();
        }
        prevOnlineRef.current = isOnline;
    }, [isOnline, triggerSync]);

    // 앱 포그라운드 복귀 시 큐 확인 및 동기화
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const handleAppState = (next: AppStateStatus) => {
            if (next === 'active' && isOnline) {
                refreshPending().then((/* void */) => {
                    // pending이 있으면 동기화
                    if (user) {
                        getPendingCount(user.id).then((count) => {
                            if (count > 0) triggerSync();
                        });
                    }
                });
            }
        };

        const sub = AppState.addEventListener('change', handleAppState);
        return () => sub.remove();
    }, [isOnline, user, triggerSync, refreshPending]);

    return (
        <NetworkContext.Provider
            value={{
                isOnline,
                isSyncing,
                syncError,
                pendingCount: pending,
                syncVersion,
                triggerSync,
            }}
        >
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    return useContext(NetworkContext);
}
