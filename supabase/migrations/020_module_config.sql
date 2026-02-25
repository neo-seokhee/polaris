-- 020: module_config 테이블 - 모듈 3단계 관리 (노출/상태/접근권한)

CREATE TABLE module_config (
  module_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT '핵심 생산성',
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'comingSoon', 'disabled')),
  access_type TEXT NOT NULL DEFAULT 'free'
    CHECK (access_type IN ('free', 'paid', 'admin_only')),
  price_krw INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 누구나 읽기 가능, admin만 수정
ALTER TABLE module_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view module_config"
  ON module_config FOR SELECT USING (true);

CREATE POLICY "Admins can manage module_config"
  ON module_config FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- updated_at 자동 갱신
CREATE TRIGGER update_module_config_updated_at
  BEFORE UPDATE ON module_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 시드 데이터 (moduleCatalog.ts 기반)
INSERT INTO module_config (module_id, title, description, category, status, access_type, price_krw, is_visible, sort_order) VALUES
  ('todo',         '할일',           '오늘 해야 할 일을 정리하고 우선순위를 관리합니다.',          '핵심 생산성', 'available',  'free', 0, true, 0),
  ('goals',        '목표',           '연간/월간 목표를 등록하고 진행률을 추적합니다.',            '핵심 생산성', 'available',  'free', 0, true, 1),
  ('memo',         '메모',           '카테고리별 메모를 기록하고 빠르게 검색합니다.',             '핵심 생산성', 'available',  'free', 0, true, 2),
  ('schedule',     '일정',           '일정을 관리하고 캘린더와 연동합니다.',                      '핵심 생산성', 'available',  'free', 0, true, 3),
  ('settlement',   '영상 발주 관리',  '영상 발주 작업, 진행 단계, 입금 일정을 한눈에 추적합니다.', '핵심 생산성', 'available',  'free', 0, true, 4),
  ('budget',       '자산 관리',       '수입/지출과 자산 흐름을 한눈에 확인합니다.',                '라이프 관리', 'comingSoon', 'free', 0, true, 5),
  ('habits',       '마음 챙김',       '마음 컨디션을 기록하고 루틴을 관리합니다.',                 '라이프 관리', 'comingSoon', 'free', 0, true, 6),
  ('focus-timer',  '몰입 타이머',     '집중 세션을 설정하고 작업 흐름을 관리합니다.',              '성장 도구',   'comingSoon', 'free', 0, true, 7),
  ('vision-board', '비전보드',        '목표 이미지를 모아 동기부여 보드를 구성합니다.',             '성장 도구',   'comingSoon', 'free', 0, true, 8),
  ('subscription', '구독 관리',       '정기결제 내역과 갱신 일정을 모아 관리합니다.',              '라이프 관리', 'comingSoon', 'free', 0, true, 9),
  ('long-term-plan','장기 계획',      '분기/연 단위 계획을 세우고 점검합니다.',                    '성장 도구',   'comingSoon', 'free', 0, true, 10);
