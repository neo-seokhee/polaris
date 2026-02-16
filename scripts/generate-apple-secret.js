const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Apple Sign In 설정
const TEAM_ID = '9G54P6X7YU';
const KEY_ID = '265RC26XAS';
const CLIENT_ID = 'com.theforgeindustries.polaris'; // Bundle ID

// p8 파일 읽기
const p8FilePath = path.join(process.env.HOME, 'Downloads', 'AuthKey_265RC26XAS.p8');
const privateKey = fs.readFileSync(p8FilePath, 'utf8');

// JWT 생성 (6개월 유효)
const now = Math.floor(Date.now() / 1000);
const expiresIn = 180 * 24 * 60 * 60; // 180 days (Apple max is 6 months)

const token = jwt.sign(
    {
        iss: TEAM_ID,
        iat: now,
        exp: now + expiresIn,
        aud: 'https://appleid.apple.com',
        sub: CLIENT_ID,
    },
    privateKey,
    {
        algorithm: 'ES256',
        header: {
            alg: 'ES256',
            kid: KEY_ID,
        },
    }
);

console.log('\n========================================');
console.log('Apple Sign In Client Secret (JWT)');
console.log('========================================\n');
console.log(token);
console.log('\n========================================');
console.log('이 값을 Supabase > Apple > Secret Key에 붙여넣으세요');
console.log('만료일:', new Date((now + expiresIn) * 1000).toLocaleDateString('ko-KR'));
console.log('========================================\n');
