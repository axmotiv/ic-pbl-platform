-- ============================================================
-- ai_sessions 테이블 생성
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- ── 테이블 생성 ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tool_type    TEXT NOT NULL DEFAULT 'problem_designer'
               CHECK (tool_type IN ('problem_designer')),
  input_data   JSONB NOT NULL DEFAULT '{}',
  output_text  TEXT NOT NULL DEFAULT '',
  is_edited    BOOLEAN NOT NULL DEFAULT false,
  edited_text  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 인덱스 ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user
  ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_tool
  ON ai_sessions(tool_type);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created
  ON ai_sessions(created_at DESC);

-- ── RLS 정책 ────────────────────────────────────────────────

ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;

-- 본인 세션만 읽기
DROP POLICY IF EXISTS "ai_sessions_select_own" ON ai_sessions;
CREATE POLICY "ai_sessions_select_own" ON ai_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- 본인만 삽입
DROP POLICY IF EXISTS "ai_sessions_insert_own" ON ai_sessions;
CREATE POLICY "ai_sessions_insert_own" ON ai_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인만 수정
DROP POLICY IF EXISTS "ai_sessions_update_own" ON ai_sessions;
CREATE POLICY "ai_sessions_update_own" ON ai_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- 본인만 삭제
DROP POLICY IF EXISTS "ai_sessions_delete_own" ON ai_sessions;
CREATE POLICY "ai_sessions_delete_own" ON ai_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ── 완료 ────────────────────────────────────────────────────
-- 확인: SELECT * FROM ai_sessions LIMIT 5;
