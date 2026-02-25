import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface SyncOp {
    id: string;
    table: string;
    type: 'insert' | 'update' | 'delete' | 'upsert';
    rowId: string; // 대상 row의 id (insert 시 임시 uuid)
    data?: Record<string, unknown>;
    /** upsert 전용: onConflict 컬럼 */
    onConflict?: string;
    /** update/delete 시 추가 eq 필터 (예: user_id) */
    filters?: Record<string, string>;
    createdAt: number;
}

function queueKey(userId: string): string {
    return `sync_queue:${userId}`;
}

export async function getQueue(userId: string): Promise<SyncOp[]> {
    try {
        const raw = await AsyncStorage.getItem(queueKey(userId));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function saveQueue(userId: string, queue: SyncOp[]): Promise<void> {
    await AsyncStorage.setItem(queueKey(userId), JSON.stringify(queue));
}

export async function enqueue(userId: string, op: Omit<SyncOp, 'id' | 'createdAt'>): Promise<void> {
    const queue = await getQueue(userId);
    const entry: SyncOp = {
        ...op,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
    };
    queue.push(entry);
    await saveQueue(userId, queue);
}

/**
 * 큐 최적화: 동일 row에 대한 연산 병합
 * - insert → update: insert에 데이터 병합
 * - insert → delete: 양쪽 모두 제거
 * - update → update: 데이터 병합
 * - update → delete: update 제거, delete 유지
 */
export function coalesceQueue(queue: SyncOp[]): SyncOp[] {
    const result: SyncOp[] = [];
    // rowId+table 기준으로 마지막 유효 연산 유지
    const map = new Map<string, SyncOp>();

    for (const op of queue) {
        const key = `${op.table}:${op.rowId}`;
        const existing = map.get(key);

        if (!existing) {
            map.set(key, { ...op });
            continue;
        }

        if (existing.type === 'insert' && op.type === 'update') {
            // insert에 update 데이터 병합
            existing.data = { ...existing.data, ...op.data };
        } else if (existing.type === 'insert' && op.type === 'delete') {
            // insert→delete 상쇄
            map.delete(key);
        } else if (existing.type === 'update' && op.type === 'update') {
            // update 병합
            existing.data = { ...existing.data, ...op.data };
        } else if (existing.type === 'update' && op.type === 'delete') {
            // update→delete: delete로 대체
            map.set(key, { ...op });
        } else {
            // 기타: 새 연산으로 대체
            map.set(key, { ...op });
        }
    }

    for (const op of map.values()) {
        result.push(op);
    }

    // 생성 순서 유지
    result.sort((a, b) => a.createdAt - b.createdAt);
    return result;
}

async function executeSingleOp(op: SyncOp): Promise<boolean> {
    try {
        if (op.type === 'insert') {
            const { error } = await supabase.from(op.table).insert(op.data as any);
            if (error) {
                // duplicate key는 이미 처리된 것으로 간주
                if (error.code === '23505') return true;
                throw error;
            }
        } else if (op.type === 'update') {
            let query = supabase.from(op.table).update(op.data as any).eq('id', op.rowId);
            if (op.filters) {
                for (const [col, val] of Object.entries(op.filters)) {
                    query = query.eq(col, val);
                }
            }
            const { error } = await query;
            if (error) throw error;
        } else if (op.type === 'delete') {
            let query = supabase.from(op.table).delete().eq('id', op.rowId);
            if (op.filters) {
                for (const [col, val] of Object.entries(op.filters)) {
                    query = query.eq(col, val);
                }
            }
            const { error } = await query;
            // 삭제할 row가 없어도 성공
            if (error) throw error;
        } else if (op.type === 'upsert') {
            const { error } = await supabase
                .from(op.table)
                .upsert(op.data as any, op.onConflict ? { onConflict: op.onConflict } : undefined);
            if (error) throw error;
        }
        return true;
    } catch (err) {
        console.warn('[SyncQueue] Op failed:', op.type, op.table, op.rowId, err);
        return false;
    }
}

/**
 * 큐를 순차 실행. 성공한 연산은 제거, 실패 시 남은 연산 보존.
 * @returns 남은(실패) 연산 수
 */
export async function replayQueue(userId: string): Promise<number> {
    let queue = await getQueue(userId);
    if (queue.length === 0) return 0;

    // 병합 최적화
    queue = coalesceQueue(queue);

    const remaining: SyncOp[] = [];
    for (const op of queue) {
        const ok = await executeSingleOp(op);
        if (!ok) {
            remaining.push(op);
        }
    }

    await saveQueue(userId, remaining);
    return remaining.length;
}

export async function clearQueue(userId: string): Promise<void> {
    await AsyncStorage.removeItem(queueKey(userId));
}

export async function pendingCount(userId: string): Promise<number> {
    const queue = await getQueue(userId);
    return queue.length;
}
