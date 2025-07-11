-- performersテーブルにprogram_itemsカラムを追加するマイグレーション
-- このスクリプトをSupabaseのSQLエディタで実行してください

-- 1. performersテーブルにprogram_itemsカラムを追加
ALTER TABLE public.performers 
ADD COLUMN IF NOT EXISTS program_items text;

-- 2. カラムにコメントを追加（オプション）
COMMENT ON COLUMN public.performers.program_items IS '番組側が準備する物品のリスト';

-- 3. 既存のupdated_atトリガーが正しく動作することを確認
-- （既にトリガーが設定されているはずなので、新しいカラムでも自動的に動作します）

-- 実行後の確認用クエリ
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'performers' 
-- AND column_name = 'program_items';