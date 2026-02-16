// Edge Function 진단 스크립트
// 브라우저 콘솔에서 실행하세요

(async function diagnoseEdgeFunctions() {
    console.log('=== Edge Function 진단 시작 ===\n');

    // 1. Supabase client 확인
    console.log('1️⃣ Supabase Client 확인');
    console.log('   - supabase:', typeof supabase !== 'undefined' ? '✅ 존재' : '❌ 없음');

    if (typeof supabase !== 'undefined') {
        console.log('   - supabase.functions:', supabase.functions ? '✅ 존재' : '❌ 없음');
        console.log('   - supabase.functions.invoke:', typeof supabase.functions?.invoke === 'function' ? '✅ 함수' : '❌ 없음');
    }
    console.log('');

    // 2. 환경 변수 확인
    console.log('2️⃣ 환경 변수 확인');
    try {
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        console.log('   - SUPABASE_URL:', url ? `✅ ${url}` : '❌ 없음');
        console.log('   - SUPABASE_ANON_KEY:', key ? `✅ ${key.substring(0, 20)}...` : '❌ 없음');
    } catch (e) {
        console.log('   - 환경 변수 접근 불가:', e.message);
    }
    console.log('');

    // 3. 테스트 Function 호출
    if (typeof supabase !== 'undefined' && supabase.functions) {
        console.log('3️⃣ Test Function 호출 테스트');
        try {
            console.log('   - test-function 호출 중...');
            const { data, error } = await supabase.functions.invoke('test-function');

            if (error) {
                console.log('   - ❌ 에러 발생:', error);
            } else {
                console.log('   - ✅ 성공:', data);
            }
        } catch (e) {
            console.log('   - ❌ 예외 발생:', e.message);
        }
        console.log('');

        // 4. Delete Account Function 호출 테스트
        console.log('4️⃣ Delete Account Function 호출 테스트');
        try {
            console.log('   - delete-account 호출 중...');
            const { data: sessionData } = await supabase.auth.getSession();

            if (!sessionData.session) {
                console.log('   - ⚠️ 로그인되어 있지 않아 건너뜁니다');
            } else {
                const { data, error } = await supabase.functions.invoke('delete-account', {
                    headers: {
                        Authorization: `Bearer ${sessionData.session.access_token}`,
                    },
                });

                if (error) {
                    console.log('   - ❌ 에러 발생:', error);
                } else {
                    console.log('   - ⚠️ 성공 (실제로 계정이 삭제됩니다!):', data);
                }
            }
        } catch (e) {
            console.log('   - ❌ 예외 발생:', e.message);
        }
    } else {
        console.log('3️⃣ Supabase client가 없어 Function 테스트를 건너뜁니다');
    }

    console.log('\n=== 진단 완료 ===');
    console.log('위 결과를 개발자에게 전달해주세요.');
})();
