import { supabase } from './supabase';

const SLACK_LOG_WEBHOOK_URL =
    process.env.EXPO_PUBLIC_SLACK_LOG_WEBHOOK_URL ||
    process.env.EXPO_PUBLIC_SLACK_WEBHOOK_URL ||
    '';

interface UserInfo {
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    userId?: string;
    auth_method?: string;
}

async function getUserInfo(userId: string): Promise<{ email: string | null; phone: string | null; name: string | null }> {
    const { data } = await supabase
        .from('users')
        .select('email, phone, name')
        .eq('id', userId)
        .single();
    return { email: data?.email || null, phone: data?.phone || null, name: data?.name || null };
}

export async function notifySlack(event: string, userInfo: UserInfo, details?: string) {
    // userId가 있으면 DB에서 정보 조회
    if (userInfo.userId && !userInfo.email && !userInfo.phone) {
        const dbInfo = await getUserInfo(userInfo.userId);
        userInfo = { ...userInfo, ...dbInfo };
    }
    if (!SLACK_LOG_WEBHOOK_URL) {
        console.log('[SlackNotify] Webhook URL not configured');
        return;
    }

    const eventEmoji: Record<string, string> = {
        user_signed_up: '🎉',
        user_identified: '👤',
        todo_created: '✅',
        todo_status_changed: '🔄',
        todo_priority_changed: '🔥',
        goal_created: '🎯',
        memo_created: '📝',
        schedule_created: '📅',
        settlement_job_created: '🎬',
        settlement_job_status_changed: '📌',
        account_deleted: '🗑️',
    };

    const eventLabel: Record<string, string> = {
        user_signed_up: '새 회원가입',
        user_identified: '유저 식별',
        todo_created: '할 일 추가',
        todo_status_changed: '할 일 상태 변경',
        todo_priority_changed: '할 일 중요도 변경',
        goal_created: '목표 추가',
        memo_created: '메모 추가',
        schedule_created: '일정 추가',
        settlement_job_created: '영상 발주 작업 추가',
        settlement_job_status_changed: '영상 발주 상태 변경',
        account_deleted: '계정 삭제',
    };

    try {
        await fetch(SLACK_LOG_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `${eventEmoji[event] || '📢'} ${eventLabel[event] || event}`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `${eventEmoji[event] || '📢'} ${eventLabel[event] || event}`,
                            emoji: true,
                        },
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*이메일:*\n${userInfo.email || '없음'}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*연락처:*\n${userInfo.phone || '없음'}`,
                            },
                        ],
                    },
                    ...(userInfo.name ? [{
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*이름:*\n${userInfo.name}`,
                            },
                        ],
                    }] : []),
                    ...(details ? [{
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*내용:*\n${details}`,
                        },
                    }] : []),
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: `${new Date().toLocaleString('ko-KR')}`,
                            },
                        ],
                    },
                ],
            }),
        });
    } catch (error) {
        console.error('[SlackNotify] Error:', error);
    }
}
