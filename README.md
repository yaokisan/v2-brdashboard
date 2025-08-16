# BEAUTY ROAD Dashboard

BEAUTY ROAD番組の出演者情報管理専用ダッシュボードアプリ

## 機能概要

### 管理者側機能
- パスワード認証によるログイン
- プロジェクト作成・編集・一覧表示
- 出演者情報管理（名前、役割、入り・終わり時間）
- 企画管理（スケジュール、台本、参考動画）
- 香盤表自動生成
- 出演者個別情報詳細編集

### ユーザー（出演者）側機能
- プロジェクト情報表示（収録日、時間、場所）
- 出演者一覧表示
- 個別出演者ページ（担当企画、スケジュール、タイムライン）
- 確定/仮状態の可視化
- Google Maps連携

## 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Cookie-based (管理者のみ)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、Supabase の設定を入力：

```bash
cp .env.example .env.local
```

`.env.local` を編集：
```env
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabaseプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase匿名キー
ADMIN_PASSWORD=あなたの管理者パスワード
```

### 3. Supabaseデータベースセットアップ

Supabase の SQL Editor で以下のクエリを実行：

```sql
-- プロジェクトテーブル
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  recording_date DATE NOT NULL,
  total_recording_time VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  location_map_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 出演者テーブル
CREATE TABLE performers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  start_time TIME,
  end_time TIME,
  is_time_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 企画テーブル
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  scheduled_time TIME NOT NULL,
  duration VARCHAR(100) NOT NULL,
  script_url TEXT,
  has_script BOOLEAN DEFAULT FALSE,
  notes TEXT,
  reference_video_url TEXT,
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 企画出演者関連テーブル
CREATE TABLE plan_performers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  performer_id UUID REFERENCES performers(id) ON DELETE CASCADE,
  role VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, performer_id)
);

-- インデックス作成
CREATE INDEX idx_performers_project_id ON performers(project_id);
CREATE INDEX idx_plans_project_id ON plans(project_id);
CREATE INDEX idx_plan_performers_plan_id ON plan_performers(plan_id);
CREATE INDEX idx_plan_performers_performer_id ON plan_performers(performer_id);

-- updated_at自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performers_updated_at 
  BEFORE UPDATE ON performers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at 
  BEFORE UPDATE ON plans 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_performers ENABLE ROW LEVEL SECURITY;

-- 全操作許可ポリシー
CREATE POLICY "Allow all operations" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON performers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON plans FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON plan_performers FOR ALL USING (true);
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## 使用方法

### 管理者として使用

1. トップページで管理者パスワードを入力（環境変数で設定）
2. 新規プロジェクト作成
3. プロジェクト編集で出演者・企画を追加
4. 香盤表で全体スケジュールを確認

### 出演者として使用

1. 管理者から共有されたプロジェクトURLにアクセス
2. 出演者一覧から自分の名前をクリック
3. 個別ページで担当企画・スケジュールを確認

## ビルド

```bash
npm run build
npm start
```

## ライセンス

MIT License