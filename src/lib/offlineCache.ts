import AsyncStorage from '@react-native-async-storage/async-storage';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

interface CacheEntry<T = unknown> {
    data: T;
    timestamp: number;
}

function cacheKey(userId: string, table: string): string {
    return `offline_cache:${userId}:${table}`;
}

export async function writeCache<T>(userId: string, table: string, data: T): Promise<void> {
    try {
        const entry: CacheEntry<T> = { data, timestamp: Date.now() };
        await AsyncStorage.setItem(cacheKey(userId, table), JSON.stringify(entry));
    } catch (err) {
        console.warn('[OfflineCache] writeCache failed:', err);
    }
}

export async function readCache<T>(userId: string, table: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(cacheKey(userId, table));
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.timestamp > TTL_MS) {
            await AsyncStorage.removeItem(cacheKey(userId, table));
            return null;
        }
        return entry.data;
    } catch (err) {
        console.warn('[OfflineCache] readCache failed:', err);
        return null;
    }
}

export async function clearUserCache(userId: string): Promise<void> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const userCacheKeys = allKeys.filter((k) => k.startsWith(`offline_cache:${userId}:`));
        if (userCacheKeys.length > 0) {
            await AsyncStorage.multiRemove(userCacheKeys);
        }
    } catch (err) {
        console.warn('[OfflineCache] clearUserCache failed:', err);
    }
}
