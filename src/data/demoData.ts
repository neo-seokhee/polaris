// Demo data for non-logged-in users to experience the app

// Helper to get relative dates
const getDate = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
};

const getDateTime = (daysFromNow: number, hour: number, minute: number = 0): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
};

// Demo Affirmations
export const DEMO_AFFIRMATIONS = [
    {
        id: 'demo-affirmation-1',
        user_id: 'demo-user',
        text: '오늘 하루도 최선을 다하자',
        created_at: new Date().toISOString(),
    },
    {
        id: 'demo-affirmation-2',
        user_id: 'demo-user',
        text: '나는 매일 성장하고 있다',
        created_at: new Date().toISOString(),
    },
    {
        id: 'demo-affirmation-3',
        user_id: 'demo-user',
        text: '작은 진전도 진전이다',
        created_at: new Date().toISOString(),
    },
];

// Demo D-Days
export const DEMO_DDAYS = [
    {
        id: 'demo-dday-1',
        user_id: 'demo-user',
        title: '프로젝트 마감',
        target_date: getDate(14),
        created_at: new Date().toISOString(),
    },
    {
        id: 'demo-dday-2',
        user_id: 'demo-user',
        title: '자격증 시험',
        target_date: getDate(30),
        created_at: new Date().toISOString(),
    },
];

// Demo Todos
export const DEMO_TODOS = [
    {
        id: 'demo-todo-1',
        user_id: 'demo-user',
        title: '오전 미팅 준비하기',
        time: null,
        is_completed: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-todo-2',
        user_id: 'demo-user',
        title: '보고서 작성하기',
        time: null,
        is_completed: false,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-todo-3',
        user_id: 'demo-user',
        title: '운동 30분',
        time: null,
        is_completed: true,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-todo-4',
        user_id: 'demo-user',
        title: '책 읽기',
        time: null,
        is_completed: false,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-todo-5',
        user_id: 'demo-user',
        title: '이메일 확인 및 답장',
        time: null,
        is_completed: true,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// Demo Schedules
export const DEMO_SCHEDULES = [
    {
        id: 'demo-schedule-1',
        user_id: 'demo-user',
        title: '팀 미팅',
        start_time: getDateTime(0, 10, 0),
        end_time: getDateTime(0, 11, 0),
        location: '3층 회의실',
        color: '#FFD700',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-schedule-2',
        user_id: 'demo-user',
        title: '점심 약속',
        start_time: getDateTime(0, 12, 30),
        end_time: getDateTime(0, 13, 30),
        location: '강남역',
        color: '#4CAF50',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-schedule-3',
        user_id: 'demo-user',
        title: '프로젝트 리뷰',
        start_time: getDateTime(1, 14, 0),
        end_time: getDateTime(1, 15, 30),
        location: '온라인',
        color: '#3B82F6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-schedule-4',
        user_id: 'demo-user',
        title: '치과 예약',
        start_time: getDateTime(3, 16, 0),
        end_time: getDateTime(3, 17, 0),
        location: '서울치과',
        color: '#FF5252',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// Demo Goals
export const DEMO_GOALS = [
    {
        id: 'demo-goal-1',
        user_id: 'demo-user',
        title: '영어 공부',
        description: '매일 30분씩 영어 공부하기',
        type: 'monthly' as const,
        year: new Date().getFullYear(),
        progress: null,
        percentage: null,
        monthly_status: ['complete', 'complete', 'partial', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
        target_value: null,
        target_unit: null,
        monthly_progress: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-goal-2',
        user_id: 'demo-user',
        title: '독서',
        description: '올해 24권 읽기',
        type: 'percentage' as const,
        year: new Date().getFullYear(),
        progress: null,
        percentage: 25,
        monthly_status: null,
        target_value: 24,
        target_unit: '권',
        monthly_progress: [2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-goal-3',
        user_id: 'demo-user',
        title: '운동',
        description: '주 3회 운동하기',
        type: 'monthly' as const,
        year: new Date().getFullYear(),
        progress: null,
        percentage: null,
        monthly_status: ['complete', 'partial', 'complete', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
        target_value: null,
        target_unit: null,
        monthly_progress: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// Demo Memos
export const DEMO_MEMOS = [
    {
        id: 'demo-memo-1',
        user_id: 'demo-user',
        content: '회의에서 논의된 주요 사항:\n- 다음 주까지 기획서 작성\n- 디자인 리뷰 일정 조율\n- 예산 검토 필요',
        category: '업무',
        category_color: '#FFD700',
        is_starred: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-memo-2',
        user_id: 'demo-user',
        content: '읽고 싶은 책 목록:\n1. 아토믹 해빗\n2. 딥워크\n3. 생각에 관한 생각',
        category: '독서',
        category_color: '#4CAF50',
        is_starred: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-memo-3',
        user_id: 'demo-user',
        content: '아이디어: 앱에 다크모드 추가하면 좋겠다',
        category: '아이디어',
        category_color: '#3B82F6',
        is_starred: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// Demo Year Goal Text
export const DEMO_YEAR_GOAL_TEXT = '올해는 성장의 해로 만들기';

// Demo Categories
export const DEMO_CATEGORIES = [
    {
        id: 'demo-category-1',
        user_id: 'demo-user',
        name: '업무',
        color: '#FFD700',
        created_at: new Date().toISOString(),
    },
    {
        id: 'demo-category-2',
        user_id: 'demo-user',
        name: '개인',
        color: '#4CAF50',
        created_at: new Date().toISOString(),
    },
    {
        id: 'demo-category-3',
        user_id: 'demo-user',
        name: '건강',
        color: '#3B82F6',
        created_at: new Date().toISOString(),
    },
];
