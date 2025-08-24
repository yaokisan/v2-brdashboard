# ARCHITECTURE.md

## 全体アーキテクチャ
- Next.js(App Router) のクライアントコンポーネント主体構成。
- データアクセスは `src/lib/database.ts` 経由で Supabase(PostgreSQL) に対し `@supabase/supabase-js` を用いて直接行う（サーバー API 経由なし）。
- 管理者保護は Cookie ベース（`auth=true`）でルーティングガード。
- デモモードは `sessionStorage` に `src/data/demo-data.json` を展開し、同一UI・同一処理フローを体験可能。

## データフロー
1. 画面（例 `/admin`）がマウント
2. 認証Cookieをチェック（未認証は `/` へ）
3. `lib/database.ts` の関数で Supabase から `select()` 取得
4. 画面で表示・編集
5. 編集操作時は「即時ローカル更新 + 非同期 DB 更新（失敗時再取得でロールバック）」

## 画面遷移（Mermaid）
```mermaid
flowchart LR
  login[/Login (/)
Cookie認証/] -->|成功| admin[/Admin (/admin)
プロジェクト/企画一覧/作成/削除/複製/編集/]
  admin --> projEdit[/Admin Project Edit (/admin/project/:id)
基本/出演者/企画/香盤エディタ/香盤表/]
  projEdit --> perfAdmin[/Admin Performer Edit (/admin/project/:id/performer/:performerId)]
  admin --> propNew[/Admin Proposal New (/admin/proposal/new)]
  admin --> propEdit[/Admin Proposal Edit (/admin/proposal/:id)]

  projPublic[/Project Public (/project/:id)] --> perfPublic[/Performer Public (/project/:id/performer/:performerId)]
  propPublic[/Proposal Public (/proposal/:slug)]

  demo[/Demo (/demo)] -->|デモID| projPublic
  demo --> admin
```

## ルーティング一覧
- 管理系
  - `/admin`（一覧/作成/削除/複製）
  - `/admin/project/[id]`（編集タブ: 基本/出演者/企画/香盤エディタ/香盤表）
  - `/admin/project/[id]/performer/[performerId]`（出演者詳細編集）
  - `/admin/proposal/new`（企画書新規）
  - `/admin/proposal/[id]`（企画書編集）
- 公開系
  - `/project/[id]`（出演者一覧・概要）
  - `/project/[id]/performer/[performerId]`（出演者個別ページ）
  - `/proposal/[slug]`（企画書公開ページ）
- その他
  - `/`（ログイン）
  - `/demo`（デモ入口）

## API/データアクセス一覧（フロント→Supabase CRUD）
- Projects
  - getProjects()/getProject(): `select` projects + performers + plans + plan_performers
  - createProject(): `insert` projects
  - updateProject(): `update` projects（必要フィールドのみマッピング）
  - deleteProject(): `delete` projects
  - duplicateProject(): get→新規作成→子テーブル複製
- Performers
  - createPerformer(): `insert` performers
  - updatePerformer(): `update` performers
  - deletePerformer(): `delete` performers
- Plans
  - createPlan(): `insert` plans
  - updatePlan(): `update` plans（performers を渡した場合は中間テーブルを再作成）
  - deletePlan(): `delete` plans
- PlanPerformers（中間）
  - addPerformerToPlan()/removePerformerFromPlan()/updatePlanPerformerRole(): `insert`/`delete`/`update` plan_performers
- ScheduleItems（休憩・準備・カスタム）
  - createScheduleItem()/getScheduleItems()/updateScheduleItem()/deleteScheduleItem(): `insert`/`select`/`update`/`delete` schedule_items
- Proposals
  - getProposals()/getProposal()/getProposalBySlug(): `select` proposals（slug 正規化/期限チェックあり）
  - createProposal()/updateProposal()/deleteProposal()/duplicateProposal()

## 認証・認可
- 管理者: `ADMIN_PASSWORD` と照合（`src/lib/auth.ts`）→ Cookie `auth=true` を発行。
- DB: Supabase RLS が有効化される前提のクライアント運用（README の初期 SQL では ALL 許可ポリシー）。本番では適切な RLS 設計推奨。

## エラーハンドリング指針
- DB 更新はローカル先行・バックグラウンド更新。失敗時はログ + 再取得による巻き戻し（管理編集ページ参照）。
- 公開ページは NotFound 相当時にリダイレクト/メッセージ表示。