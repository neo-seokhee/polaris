import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Kakao unlink API
async function unlinkKakaoAccount(kakaoId: string): Promise<boolean> {
    const kakaoAdminKey = Deno.env.get('KAKAO_ADMIN_KEY')
    if (!kakaoAdminKey || !kakaoId) {
        console.log('[DeleteAccount] No Kakao admin key or kakao_id, skipping Kakao unlink')
        return false
    }

    try {
        console.log(`[DeleteAccount] Unlinking Kakao account: ${kakaoId}`)
        const response = await fetch('https://kapi.kakao.com/v1/user/unlink', {
            method: 'POST',
            headers: {
                'Authorization': `KakaoAK ${kakaoAdminKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `target_id_type=user_id&target_id=${kakaoId}`,
        })

        if (response.ok) {
            const result = await response.json()
            console.log('[DeleteAccount] Kakao unlink successful:', result)
            return true
        } else {
            const error = await response.text()
            console.error('[DeleteAccount] Kakao unlink failed:', error)
            return false
        }
    } catch (error) {
        console.error('[DeleteAccount] Kakao unlink error:', error)
        return false
    }
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get access_token from request body
        const body = await req.json().catch(() => ({}))
        const accessToken = body.access_token

        if (!accessToken) {
            return new Response(
                JSON.stringify({ error: 'Missing access_token in request body' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[DeleteAccount] Received access_token, verifying user...')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[DeleteAccount] Starting deletion for user: ${user.id}`)

        // Get kakao_id from user metadata or request body
        const kakaoId = body.kakao_id || user.user_metadata?.kakao_id
        if (kakaoId) {
            console.log(`[DeleteAccount] Found kakao_id: ${kakaoId}`)
            await unlinkKakaoAccount(kakaoId)
        }

        // Create admin client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const userId = user.id

        // Delete user data in parallel
        console.log(`[DeleteAccount] Deleting user data...`)
        const deleteResults = await Promise.allSettled([
            supabaseAdmin.from('todos').delete().eq('user_id', userId),
            supabaseAdmin.from('goals').delete().eq('user_id', userId),
            supabaseAdmin.from('memos').delete().eq('user_id', userId),
            supabaseAdmin.from('schedules').delete().eq('user_id', userId),
            supabaseAdmin.from('users').delete().eq('id', userId),
        ])

        // Log any deletion errors but don't fail
        deleteResults.forEach((result, index) => {
            const tables = ['todos', 'goals', 'memos', 'schedules', 'users']
            if (result.status === 'rejected') {
                console.error(`[DeleteAccount] Failed to delete from ${tables[index]}:`, result.reason)
            } else if (result.value.error) {
                console.error(`[DeleteAccount] Error deleting from ${tables[index]}:`, result.value.error)
            } else {
                console.log(`[DeleteAccount] Successfully deleted from ${tables[index]}`)
            }
        })

        // Delete auth user (this is the critical fix!)
        console.log(`[DeleteAccount] Deleting auth user...`)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteAuthError) {
            console.error('[DeleteAccount] Failed to delete auth user:', deleteAuthError)
            return new Response(
                JSON.stringify({ error: 'Failed to delete account from auth system' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[DeleteAccount] Successfully deleted user: ${userId}`)

        return new Response(
            JSON.stringify({ success: true, message: 'Account deleted successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('[DeleteAccount] Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
