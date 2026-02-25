export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string | null
                    name: string | null
                    phone: string | null
                    avatar_url: string | null
                    role: 'user' | 'admin'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    name?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    role?: 'user' | 'admin'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    name?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    role?: 'user' | 'admin'
                    created_at?: string
                    updated_at?: string
                }
            }
            todos: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    memo: string | null
                    time: string | null
                    is_active: boolean
                    is_completed: boolean
                    position?: number
                    category?: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    memo?: string | null
                    time?: string | null
                    is_active?: boolean
                    is_completed?: boolean
                    position?: number
                    category?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    memo?: string | null
                    time?: string | null
                    is_active?: boolean
                    is_completed?: boolean
                    position?: number
                    category?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            todo_categories: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    created_at?: string
                }
            }
            goals: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    description: string | null
                    type: 'monthly' | 'percentage'
                    year: number
                    progress: string | null
                    percentage: number | null
                    monthly_status: Json | null
                    target_value: number | null
                    target_unit: string | null
                    monthly_progress: number[] | null
                    position: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    description?: string | null
                    type: 'monthly' | 'percentage'
                    year: number
                    progress?: string | null
                    percentage?: number | null
                    monthly_status?: Json | null
                    target_value?: number | null
                    target_unit?: string | null
                    monthly_progress?: number[] | null
                    position?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    description?: string | null
                    type?: 'monthly' | 'percentage'
                    year?: number
                    progress?: string | null
                    percentage?: number | null
                    monthly_status?: Json | null
                    target_value?: number | null
                    target_unit?: string | null
                    monthly_progress?: number[] | null
                    position?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            schedules: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    start_time: string
                    end_time: string
                    location: string | null
                    color: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    start_time: string
                    end_time: string
                    location?: string | null
                    color?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    start_time?: string
                    end_time?: string
                    location?: string | null
                    color?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            memos: {
                Row: {
                    id: string
                    user_id: string
                    category: string
                    category_color: string
                    content: string
                    is_starred: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    category: string
                    category_color?: string
                    content: string
                    is_starred?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    category?: string
                    category_color?: string
                    content?: string
                    is_starred?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            settlement_jobs: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    client: string | null
                    job_type: 'shoot_only' | 'edit_only' | 'shoot_edit'
                    work_date: string | null
                    edit_date: string | null
                    delivery_date: string | null
                    unit_price: number
                    payment_due_date: string | null
                    status: 'before_work' | 'in_progress' | 'work_done' | 'paid'
                    shoot_done: boolean
                    edit_done: boolean
                    delivery_done: boolean
                    is_paid: boolean
                    paid_at: string | null
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    client?: string | null
                    job_type?: 'shoot_only' | 'edit_only' | 'shoot_edit'
                    work_date?: string | null
                    edit_date?: string | null
                    delivery_date?: string | null
                    unit_price?: number
                    payment_due_date?: string | null
                    status?: 'before_work' | 'in_progress' | 'work_done' | 'paid'
                    shoot_done?: boolean
                    edit_done?: boolean
                    delivery_done?: boolean
                    is_paid?: boolean
                    paid_at?: string | null
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    client?: string | null
                    job_type?: 'shoot_only' | 'edit_only' | 'shoot_edit'
                    work_date?: string | null
                    edit_date?: string | null
                    delivery_date?: string | null
                    unit_price?: number
                    payment_due_date?: string | null
                    status?: 'before_work' | 'in_progress' | 'work_done' | 'paid'
                    shoot_done?: boolean
                    edit_done?: boolean
                    delivery_done?: boolean
                    is_paid?: boolean
                    paid_at?: string | null
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            compass_messages: {
                Row: {
                    id: string
                    user_id: string
                    role: 'user' | 'assistant'
                    content: string
                    follow_up_question: string | null
                    suggested_todos: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    role: 'user' | 'assistant'
                    content: string
                    follow_up_question?: string | null
                    suggested_todos?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    role?: 'user' | 'assistant'
                    content?: string
                    follow_up_question?: string | null
                    suggested_todos?: Json
                    created_at?: string
                }
            }
            affirmations: {
                Row: {
                    id: string
                    user_id: string
                    text: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    text: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    text?: string
                    created_at?: string
                }
            }
            ddays: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    target_date: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    target_date: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    target_date?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            calendar_subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    url: string
                    color: string
                    is_enabled: boolean
                    last_synced_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    url: string
                    color?: string
                    is_enabled?: boolean
                    last_synced_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    url?: string
                    color?: string
                    is_enabled?: boolean
                    last_synced_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            synced_events: {
                Row: {
                    id: string
                    subscription_id: string
                    uid: string
                    title: string
                    start_time: string
                    end_time: string
                    location: string | null
                    description: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    subscription_id: string
                    uid: string
                    title: string
                    start_time: string
                    end_time: string
                    location?: string | null
                    description?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    subscription_id?: string
                    uid?: string
                    title?: string
                    start_time?: string
                    end_time?: string
                    location?: string | null
                    description?: string | null
                    created_at?: string
                }
            }
            google_tokens: {
                Row: {
                    id: string
                    user_id: string
                    access_token: string
                    refresh_token: string
                    expires_at: string
                    email: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    access_token: string
                    refresh_token: string
                    expires_at: string
                    email?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    access_token?: string
                    refresh_token?: string
                    expires_at?: string
                    email?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            year_goal_texts: {
                Row: {
                    id: string
                    user_id: string
                    year: number
                    content: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    year: number
                    content?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    year?: number
                    content?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            plans: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    price_krw: number
                    interval: 'month' | 'year' | 'lifetime' | 'none' | null
                    features: Json
                    is_active: boolean
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    name: string
                    description?: string | null
                    price_krw?: number
                    interval?: 'month' | 'year' | 'lifetime' | 'none' | null
                    features?: Json
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    price_krw?: number
                    interval?: 'month' | 'year' | 'lifetime' | 'none' | null
                    features?: Json
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            user_subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    plan_id: string
                    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
                    provider: 'revenuecat' | 'stripe' | 'admin' | 'promo' | null
                    provider_subscription_id: string | null
                    current_period_start: string | null
                    current_period_end: string | null
                    trial_end: string | null
                    canceled_at: string | null
                    memo: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    plan_id: string
                    status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
                    provider?: 'revenuecat' | 'stripe' | 'admin' | 'promo' | null
                    provider_subscription_id?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    trial_end?: string | null
                    canceled_at?: string | null
                    memo?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    plan_id?: string
                    status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
                    provider?: 'revenuecat' | 'stripe' | 'admin' | 'promo' | null
                    provider_subscription_id?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    trial_end?: string | null
                    canceled_at?: string | null
                    memo?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            user_entitlement_overrides: {
                Row: {
                    id: string
                    user_id: string
                    feature_key: string
                    feature_value: Json
                    reason: string | null
                    granted_by: string | null
                    expires_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    feature_key: string
                    feature_value?: Json
                    reason?: string | null
                    granted_by?: string | null
                    expires_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    feature_key?: string
                    feature_value?: Json
                    reason?: string | null
                    granted_by?: string | null
                    expires_at?: string | null
                    created_at?: string
                }
            }
            payment_events: {
                Row: {
                    id: string
                    user_id: string | null
                    event_type: string
                    provider: string
                    provider_event_id: string | null
                    amount: number | null
                    currency: string
                    payload: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    event_type: string
                    provider: string
                    provider_event_id?: string | null
                    amount?: number | null
                    currency?: string
                    payload?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    event_type?: string
                    provider?: string
                    provider_event_id?: string | null
                    amount?: number | null
                    currency?: string
                    payload?: Json
                    created_at?: string
                }
            }
            user_settings: {
                Row: {
                    user_id: string
                    feature_modules: Json
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    feature_modules?: Json
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    feature_modules?: Json
                    updated_at?: string
                }
            }
            compass_usage: {
                Row: {
                    id: string
                    user_id: string
                    used_at: string
                    request_count: number
                }
                Insert: {
                    id?: string
                    user_id: string
                    used_at?: string
                    request_count?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    used_at?: string
                    request_count?: number
                }
            }
        }
        Functions: {
            get_user_entitlements: {
                Args: { p_user_id: string }
                Returns: Json
            }
        }
    }
}
