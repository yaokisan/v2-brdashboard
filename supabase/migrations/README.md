# Database Migrations

## 住所フィールドの追加

Supabaseのダッシュボードで以下のSQLを実行してください：

```sql
-- Add address column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing projects to have an empty address if needed
UPDATE projects
SET address = ''
WHERE address IS NULL;
```

これにより、プロジェクトテーブルに住所フィールドが追加され、管理画面で入力した住所が保存されるようになります。