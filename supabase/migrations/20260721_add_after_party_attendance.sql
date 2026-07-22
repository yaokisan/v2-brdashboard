-- After-party attendance (飲み会出欠確認) support
-- Run this migration in the Supabase SQL Editor

-- 回答期限（この日まで回答可能）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS after_party_deadline date;

-- 出欠回答テーブル（出演者以外の付き添い・スタッフも名前で登録するため performers とは紐付けない）
CREATE TABLE IF NOT EXISTS after_party_attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('attending', 'not_attending')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_after_party_attendances_project_id ON after_party_attendances(project_id);

-- 他テーブルと同様にRLSを有効化し、オープンポリシーを設定
ALTER TABLE after_party_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on after_party_attendances" ON after_party_attendances;
CREATE POLICY "Allow all operations on after_party_attendances"
  ON after_party_attendances
  FOR ALL
  USING (true)
  WITH CHECK (true);
