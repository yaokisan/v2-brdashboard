# PROJECT_OVERVIEW.md

## プロジェクトの概要
- BEAUTY ROAD の出演者・企画（香盤）を管理し、出演者向け公開ページ・企画書公開ページを提供するダッシュボード。
- 管理画面はパスワード認証（Cookie）で保護。データは Supabase(PostgreSQL) に保存し、クライアントから `@supabase/supabase-js` で CRUD。
- デモモード搭載（`src/data/demo-data.json` を `sessionStorage` に展開）で DB がなくても動作確認可能。

## 技術スタック（自動判定）
- フロントエンド: Next.js 15, React 19, TypeScript 5
- バックエンド: 独自サーバーなし（Next.js クライアントから Supabase に直接アクセス）
- データベース/BaaS: Supabase（PostgreSQL）
- CSS: Tailwind CSS 4（`@tailwindcss/postcss` + `autoprefixer`）
- 状態管理: React Hooks（`useState`/`useEffect`/`useMemo`/`useCallback`）

主要パッケージ（package.json より）
- next: ^15.3.3
- react / react-dom: ^19.1.0
- typescript: ^5.8.3
- @supabase/supabase-js: ^2.50.0
- tailwindcss: ^4.1.8, @tailwindcss/postcss: ^4.1.8, autoprefixer: ^10.4.21
- eslint, eslint-config-next, @types/node/react/react-dom

## Supabase CLI 状態
- `supabase --version`: v2.33.9（インストール済）
- `supabase projects list`: `qfcmvsmbthrhkbllnonr`（BEAUTY ROAD DB, Tokyo）等を検出
- `supabase link --project-ref qfcmvsmbthrhkbllnonr`: リンク済（config 差分の警告あり）
- `supabase status`: Docker 未起動により失敗（ローカル DB 機能は Docker 必須）

補足: スキーマダンプや RLS 抽出（`supabase db dump ...`）は Docker 未起動で未実施。スキーマは本リポジトリのマイグレーション・README・コードから再構築（詳細は DATABASE_SCHEMA.md）。

## ディレクトリ構造（主要）
```
v2-brdashboard/
  src/
    app/
      admin/
        demo/
        project/[id]/
          performer/[performerId]/
        proposal/
          [id]/
          new/
        page.tsx
      project/[id]/
        performer/[performerId]/
      proposal/[slug]/
      demo/page.tsx
      layout.tsx
      globals.css
      page.tsx
    components/
      ComprehensiveSchedule.tsx
      ScheduleEditor.tsx
      TimeInput.tsx
    data/
      demo-data.json
    lib/
      auth.ts
      data.ts
      database.ts
      supabase.ts
      utils.ts
    types/
      index.ts
  supabase/
    migrations/
      20241213_add_address_to_projects.sql
      20241216_add_belongings_to_performers.sql
      20241216_add_schedule_items_table.sql
  migration_add_program_items.sql
  next.config.js / tailwind.config.js / postcss.config.js / tsconfig.json
  README.md
```

役割概要
- `src/app`: ページ（App Router）。`/admin` は Cookie 認証必須、`/project` と `/proposal` は公開。
- `src/lib`: DB・認証・共通処理（`database.ts` が実質の API 層）。
- `src/components`: 共通 UI（香盤エディタ/香盤表/時間入力）。
- `supabase/migrations`: 追加列や補助テーブルの変更。

重要ファイル
- `src/lib/database.ts`: CRUD 集約（projects/performers/plans/plan_performers/schedule_items/proposals）。
- `src/lib/supabase.ts`: `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` によるクライアント生成。
- `src/app/admin/project/[id]/page.tsx`: 管理 UI 中核（基本/出演者/企画/香盤エディタ/香盤表）。
- `src/components/ScheduleEditor.tsx`: DnD・尺編集・一括保存・時間外警告。

## 環境変数
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクト URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key（RLS 前提の公開キー）
- `ADMIN_PASSWORD`: 管理者ログイン用パスワード

設定例（`.env.local`）
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ADMIN_PASSWORD=...
```

## セットアップ
1) `npm install`
2) `.env.local` を作成し環境変数設定
3) （任意）`supabase link --project-ref qfcmvsmbthrhkbllnonr`
4) `npm run dev`

トラブルシュート
- Supabase ローカル系コマンドは Docker 必須。Docker Desktop を起動。
- スキーマは `supabase/migrations` と `README.md` の SQL、`src/lib/database.ts` の列利用から再現可能。