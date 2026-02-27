-- ============================================================
-- PBL 커뮤니티 - 테이블 생성 & 샘플 데이터
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. 테이블 생성
-- ────────────────────────────────────────────────────────────

-- profiles 테이블 (이미 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('professor','student','admin')),
  university TEXT,
  department TEXT,
  pbl_level  TEXT CHECK (pbl_level IN ('beginner','intermediate','advanced')),
  interests  TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- contents 테이블
CREATE TABLE IF NOT EXISTS contents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  type             TEXT NOT NULL CHECK (type IN ('short_video','deep_dive','template','case_series','interactive')),
  format           TEXT NOT NULL CHECK (format IN ('video','document','template','podcast')),
  video_url        TEXT,
  video_platform   TEXT CHECK (video_platform IN ('vimeo','youtube')),
  thumbnail_url    TEXT,
  file_url         TEXT,
  duration_minutes INTEGER,
  subject_area     TEXT NOT NULL CHECK (subject_area IN ('pbl_design','qbl','facilitation','team','assessment','active_learning')),
  academic_field   TEXT NOT NULL CHECK (academic_field IN ('engineering','medical','business','social','humanities','science','education','arts')),
  pbl_stage        TEXT NOT NULL DEFAULT '',
  difficulty       TEXT NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
  series_id        UUID,
  episode_number   INTEGER,
  author_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_count       INTEGER NOT NULL DEFAULT 0,
  bookmark_count   INTEGER NOT NULL DEFAULT 0,
  average_rating   NUMERIC(2,1) NOT NULL DEFAULT 0,
  is_published     BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- bookmarks 테이블
CREATE TABLE IF NOT EXISTS bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- reviews 테이블
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(type);
CREATE INDEX IF NOT EXISTS idx_contents_subject ON contents(subject_area);
CREATE INDEX IF NOT EXISTS idx_contents_difficulty ON contents(difficulty);
CREATE INDEX IF NOT EXISTS idx_contents_series ON contents(series_id);
CREATE INDEX IF NOT EXISTS idx_contents_published ON contents(is_published);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_content ON reviews(content_id);

-- ────────────────────────────────────────────────────────────
-- 2. 조회수 증가 RPC 함수
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_view_count(content_id UUID)
RETURNS VOID AS $$
  UPDATE contents SET view_count = view_count + 1 WHERE id = content_id;
$$ LANGUAGE sql;

-- ────────────────────────────────────────────────────────────
-- 3. RLS (Row Level Security) 정책
-- ────────────────────────────────────────────────────────────

ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- contents: 누구나 published 콘텐츠 읽기 가능
DROP POLICY IF EXISTS "contents_select_published" ON contents;
CREATE POLICY "contents_select_published" ON contents
  FOR SELECT USING (is_published = true);

-- bookmarks: 본인 것만 CRUD
DROP POLICY IF EXISTS "bookmarks_select_own" ON bookmarks;
CREATE POLICY "bookmarks_select_own" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_insert_own" ON bookmarks;
CREATE POLICY "bookmarks_insert_own" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_delete_own" ON bookmarks;
CREATE POLICY "bookmarks_delete_own" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- reviews: 누구나 읽기, 본인만 쓰기/수정
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. 샘플 작성자 프로필 (테스트용 더미)
--    ※ auth.users에 없는 UUID이므로 FK를 잠시 우회합니다
-- ────────────────────────────────────────────────────────────

-- FK 제약 임시 비활성화 (샘플 데이터 입력용)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_author_id_fkey;

INSERT INTO profiles (id, email, name, role, university, department, pbl_level, interests)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'kim@edu.ac.kr', '김교수', 'professor', '서울대학교', '교육공학과', 'advanced', ARRAY['PBL 수업설계','퍼실리테이션','평가']),
  ('a0000000-0000-0000-0000-000000000002', 'lee@med.ac.kr', '이교수', 'professor', '연세대학교', '간호학과', 'advanced', ARRAY['PBL 수업설계','팀운영','QBL']),
  ('a0000000-0000-0000-0000-000000000003', 'park@eng.ac.kr', '박교수', 'professor', '한양대학교', '산업공학과', 'intermediate', ARRAY['Active Learning','PBL 수업설계'])
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. 시리즈 ID 생성
-- ────────────────────────────────────────────────────────────

-- 사례시리즈 3편이 공유할 시리즈 ID
-- 고정 UUID를 사용합니다
-- series_id: 'b0000000-0000-0000-0000-000000000001'

-- ────────────────────────────────────────────────────────────
-- 6. 샘플 콘텐츠 10개 INSERT
-- ────────────────────────────────────────────────────────────

INSERT INTO contents (
  id, title, description, type, format,
  video_url, video_platform, thumbnail_url, file_url,
  duration_minutes, subject_area, academic_field, pbl_stage, difficulty,
  series_id, episode_number, author_id,
  view_count, bookmark_count, average_rating, is_published, created_at
) VALUES

-- ① 숏폼영상: QBL 핵심질문 설계 5단계
(
  'c0000000-0000-0000-0000-000000000001',
  'QBL 핵심질문 설계 5단계',
  'QBL(Question-Based Learning)에서 가장 중요한 핵심질문을 설계하는 5단계 프레임워크를 소개합니다.

1단계: 학습목표와 역량 매핑
2단계: 실세계 맥락 부여
3단계: 인지적 복잡성 조절
4단계: 다양한 관점 내장
5단계: 자기주도 탐구 유도

이 5단계를 따라하면 학생들의 깊은 사고를 이끌어내는 핵심질문을 만들 수 있습니다.',
  'short_video', 'video',
  'https://www.youtube.com/watch?v=OEr6ItZufr0', 'youtube',
  NULL, NULL,
  5, 'qbl', 'education', 'problem_design', 'beginner',
  NULL, NULL, 'a0000000-0000-0000-0000-000000000001',
  1240, 87, 4.5, true, '2025-12-01T09:00:00Z'
),

-- ② 숏폼영상: PBL 퍼실리테이션 Do & Don't
(
  'c0000000-0000-0000-0000-000000000002',
  'PBL 퍼실리테이션 Do & Don''t',
  'PBL 수업에서 교수자가 퍼실리테이터로서 꼭 해야 할 것과 하지 말아야 할 것을 정리했습니다.

✅ Do: 열린 질문으로 사고 확장하기, 팀 간 상호작용 촉진, 적절한 침묵 활용
❌ Don''t: 바로 답 알려주기, 한 팀에 과도한 시간 투자, 평가적 피드백

실전에서 바로 활용할 수 있는 퍼실리테이션 팁을 5분 안에 익혀보세요.',
  'short_video', 'video',
  'https://www.youtube.com/watch?v=UyoYf7rZVGI', 'youtube',
  NULL, NULL,
  5, 'facilitation', 'education', 'facilitation', 'beginner',
  NULL, NULL, 'a0000000-0000-0000-0000-000000000001',
  2350, 156, 4.7, true, '2025-12-05T09:00:00Z'
),

-- ③ 심화강의: 공학 PBL에서 실제 산업문제 연결하기
(
  'c0000000-0000-0000-0000-000000000003',
  '공학 PBL에서 실제 산업문제 연결하기',
  '공학 분야에서 PBL을 운영할 때, 실제 산업 현장의 문제를 수업에 효과적으로 연결하는 방법을 다룹니다.

- 산학협력 파트너 확보 전략
- 현실 문제의 교육적 재구성 방법
- 학생 수준에 맞는 문제 스캐폴딩
- 기업 멘토 활용 모델
- 산출물의 실무 적용 가능성 높이기

한양대학교 산업공학과의 3년간 실제 운영 사례를 바탕으로 설명합니다.',
  'deep_dive', 'video',
  'https://vimeo.com/548575582', 'vimeo',
  NULL, NULL,
  45, 'pbl_design', 'engineering', 'problem_design', 'advanced',
  NULL, NULL, 'a0000000-0000-0000-0000-000000000003',
  890, 62, 4.3, true, '2025-12-10T09:00:00Z'
),

-- ④ 심화강의: 의료 PBL 수업설계 마스터클래스
(
  'c0000000-0000-0000-0000-000000000004',
  '의료 PBL 수업설계 마스터클래스',
  '의료·간호 분야에 특화된 PBL 수업설계 전 과정을 심층적으로 다룹니다.

Part 1: 임상 시나리오 기반 문제 설계
Part 2: 환자 사례의 교육적 활용
Part 3: 전문직 간 협력(IPE) 통합
Part 4: 근거기반 학습과 PBL의 결합
Part 5: 임상 역량 평가와 PBL 평가 연계

연세대학교 간호학과 15년 PBL 운영 노하우를 집약한 마스터클래스입니다.',
  'deep_dive', 'video',
  'https://www.youtube.com/watch?v=cxrLRbkOwKs', 'youtube',
  NULL, NULL,
  60, 'pbl_design', 'medical', 'problem_design', 'advanced',
  NULL, NULL, 'a0000000-0000-0000-0000-000000000002',
  1560, 134, 4.8, true, '2025-12-15T09:00:00Z'
),

-- ⑤ 템플릿: PBL 수업설계 캔버스
(
  'c0000000-0000-0000-0000-000000000005',
  'PBL 수업설계 캔버스',
  'PBL 수업을 처음 설계할 때 활용할 수 있는 원페이지 캔버스 템플릿입니다.

포함 항목:
• 수업 개요 (과목명, 학년, 인원)
• 핵심 역량 & 학습목표
• 문제 시나리오 초안
• 주차별 활동 타임라인
• 팀 구성 전략
• 평가 계획 (과정평가 + 결과평가)
• 필요 자원 체크리스트

PDF와 편집 가능한 PPTX 형식으로 제공됩니다. 다운로드 후 바로 수업 설계에 활용하세요.',
  'template', 'template',
  NULL, NULL,
  NULL, 'https://example.com/templates/pbl-canvas.pptx',
  NULL, 'pbl_design', 'education', 'problem_design', 'beginner',
  NULL, NULL, 'a0000000-0000-0000-0000-000000000001',
  3200, 412, 4.6, true, '2025-11-20T09:00:00Z'
),

-- ⑥ 템플릿: 팀 역할분담 & 그라운드룰 시트
(
  'c0000000-0000-0000-0000-000000000006',
  '팀 역할분담 & 그라운드룰 시트',
  'PBL 팀 활동 초기에 사용하는 역할분담 및 그라운드룰 설정 워크시트입니다.

포함 항목:
• 팀원 역할 카드 (리더, 기록자, 발표자, 타임키퍼, 자료조사)
• 역할 로테이션 스케줄표
• 그라운드룰 합의 양식
• 팀 커뮤니케이션 채널 설정
• 갈등 해결 프로세스 가이드

학생들이 직접 작성하도록 설계된 인쇄용 워크시트입니다.',
  'template', 'template',
  NULL, NULL,
  NULL, 'https://example.com/templates/team-roles-groundrules.pdf',
  NULL, 'team', 'education', 'facilitation', 'beginner',
  NULL, NULL, 'a0000000-0000-0000-0000-000000000001',
  1870, 298, 4.4, true, '2025-11-25T09:00:00Z'
),

-- ⑦ 사례시리즈 EP01: 문제발견
(
  'c0000000-0000-0000-0000-000000000007',
  'A대학 간호학과 PBL 8주 여정 - EP01 문제발견',
  '연세대학교 간호학과에서 실제로 진행된 PBL 수업의 8주간 전체 과정을 시리즈로 기록합니다.

EP01에서는 첫 주에 이루어지는 문제발견 단계를 다룹니다:
• 임상 시나리오 제시 방법
• 학생들의 첫 반응과 질문 형성 과정
• "무엇을 알고 있는가 / 무엇을 알아야 하는가" 정리
• 학습이슈 도출 과정

실제 수업 장면 영상과 교수자 인터뷰를 함께 제공합니다.',
  'case_series', 'video',
  'https://www.youtube.com/watch?v=dek3JMYaNtk', 'youtube',
  NULL, NULL,
  15, 'pbl_design', 'medical', 'problem_design', 'intermediate',
  'b0000000-0000-0000-0000-000000000001', 1, 'a0000000-0000-0000-0000-000000000002',
  2100, 178, 4.6, true, '2026-01-06T09:00:00Z'
),

-- ⑧ 사례시리즈 EP02: 팀빌딩
(
  'c0000000-0000-0000-0000-000000000008',
  'A대학 간호학과 PBL 8주 여정 - EP02 팀빌딩',
  'EP02에서는 2주차에 진행되는 팀빌딩 과정을 상세히 보여줍니다.

• 팀 구성 방법 (학업 수준 혼합, 성격 유형 고려)
• 아이스브레이킹 활동 실제 사례
• 그라운드룰 설정 워크숍
• 팀 내 역할 분담 과정
• 첫 번째 팀 미팅 운영 팁

교수자가 팀빌딩 과정에서 어떻게 개입하고, 어떤 점을 관찰하는지 인터뷰와 함께 전달합니다.',
  'case_series', 'video',
  'https://www.youtube.com/watch?v=1nBnMnOjMQU', 'youtube',
  NULL, NULL,
  18, 'team', 'medical', 'facilitation', 'intermediate',
  'b0000000-0000-0000-0000-000000000001', 2, 'a0000000-0000-0000-0000-000000000002',
  1780, 145, 4.5, true, '2026-01-13T09:00:00Z'
),

-- ⑨ 사례시리즈 EP03: 자기주도학습
(
  'c0000000-0000-0000-0000-000000000009',
  'A대학 간호학과 PBL 8주 여정 - EP03 자기주도학습',
  'EP03에서는 3-4주차에 이루어지는 자기주도학습(SDL) 단계를 다룹니다.

• 학습이슈별 자기주도학습 계획 수립
• 학생들의 자료 탐색 및 학습 과정
• 튜터 상담 및 중간 점검
• 학습 결과 공유 방법
• 자기주도학습 저널 작성

학생 인터뷰를 통해 자기주도학습 과정에서 겪는 어려움과 극복 경험을 생생하게 전달합니다.',
  'case_series', 'video',
  'https://www.youtube.com/watch?v=PjDw3azfZWI', 'youtube',
  NULL, NULL,
  20, 'pbl_design', 'medical', 'reflection', 'intermediate',
  'b0000000-0000-0000-0000-000000000001', 3, 'a0000000-0000-0000-0000-000000000002',
  1450, 132, 4.4, true, '2026-01-20T09:00:00Z'
),

-- ⑩ 숏폼영상: Active Learning 5분 가이드
(
  'c0000000-0000-0000-0000-000000000010',
  'Active Learning 5분 가이드',
  '대규모 강의에서도 바로 적용할 수 있는 Active Learning 기법을 5분 안에 소개합니다.

소개하는 기법:
• Think-Pair-Share
• 1분 페이퍼 (Minute Paper)
• 개념 맵핑
• Peer Instruction (동료 교수법)
• Muddiest Point (가장 어려운 점)

각 기법의 운영 방법, 적용 팁, 주의사항을 빠르게 알려드립니다.
PBL 입문 전 기초 Active Learning부터 시작해보세요.',
  'short_video', 'video',
  'https://www.youtube.com/watch?v=gM95HHI4gLk', 'youtube',
  NULL, NULL,
  5, 'active_learning', 'education', 'facilitation', 'beginner',
  NULL, NULL, 'a0000000-0000-0000-0000-000000000003',
  4100, 289, 4.9, true, '2026-02-01T09:00:00Z'
)

ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 7. 샘플 리뷰 데이터
-- ────────────────────────────────────────────────────────────

-- 작성자들끼리 서로의 콘텐츠에 리뷰 남기기
INSERT INTO reviews (content_id, user_id, rating, comment, created_at)
VALUES
  -- 김교수가 이교수의 의료 PBL 마스터클래스에 리뷰
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 5,
   '의료 분야 PBL의 A to Z를 담은 훌륭한 강의입니다. 다른 학문 분야에도 적용할 수 있는 인사이트가 많았습니다.',
   '2025-12-20T14:30:00Z'),

  -- 박교수가 QBL 핵심질문에 리뷰
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 4,
   '짧은 시간 안에 핵심을 잘 정리해주셨네요. 공학 분야 예시도 추가되면 더 좋을 것 같습니다.',
   '2025-12-08T10:15:00Z'),

  -- 이교수가 Active Learning 가이드에 리뷰
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 5,
   'PBL 도입 전에 이 영상부터 보면 좋겠어요. 기본 Active Learning 기법을 깔끔하게 정리해주셨습니다.',
   '2026-02-05T11:00:00Z'),

  -- 김교수가 사례시리즈 EP01에 리뷰
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 5,
   '실제 수업 장면을 볼 수 있어서 매우 도움이 됩니다. 시리즈 완결이 기대됩니다!',
   '2026-01-10T16:45:00Z'),

  -- 박교수가 PBL 수업설계 캔버스에 리뷰
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 4,
   '처음 PBL을 설계할 때 이 캔버스 하나로 큰 그림을 그릴 수 있었습니다. 실제로 수업에 적용 중입니다.',
   '2025-12-01T09:30:00Z'),

  -- 이교수가 퍼실리테이션 Do & Don't에 리뷰
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 5,
   'Do & Don''t 정리가 아주 명확합니다. 신규 교수자 오리엔테이션 때 이 영상을 추천하고 있어요.',
   '2025-12-12T13:20:00Z')

ON CONFLICT (user_id, content_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. profiles 테이블 RLS 정책
-- ────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 누구나 프로필 읽기 가능 (콘텐츠 작성자 표시용)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

-- 본인만 수정 가능
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 본인만 삽입 가능
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 완료!
-- ────────────────────────────────────────────────────────────
-- 실행 후 확인:
--   SELECT id, title, type, subject_area, difficulty FROM contents ORDER BY created_at;
--   SELECT * FROM profiles WHERE id LIKE 'a0000000%';
--   SELECT r.rating, r.comment, p.name FROM reviews r JOIN profiles p ON r.user_id = p.id;
