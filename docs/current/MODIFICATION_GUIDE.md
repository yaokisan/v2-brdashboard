# MODIFICATION_GUIDE.md

## よく修正する箇所
- ユーザー入力フォーム: `src/app/admin/project/[id]/page.tsx`, `src/app/admin/proposal/[id]/page.tsx`, `src/app/admin/proposal/new/page.tsx`
- 一覧表示: `src/app/admin/page.tsx`
- 詳細表示: `src/app/project/[id]/page.tsx`, `src/app/project/[id]/performer/[performerId]/page.tsx`
- API定義/呼び出し: `src/lib/database.ts`

## 新機能追加チェックリスト
- [ ] 画面/コンポーネントの追加場所（`src/app/...` or `src/components/...`）
- [ ] DB操作の追加/変更（`src/lib/database.ts`）
- [ ] データモデル型の更新（`src/types/index.ts`）
- [ ] マイグレーションの追加（`supabase/migrations` or Supabase SQL Editor）
- [ ] ルーティングの追加（App Router: ディレクトリ作成）
- [ ] スタイル（Tailwind）調整
- [ ] 認証ガード（管理系は Cookie 確認）

## トラブルシューティング
- Supabase ローカル関連コマンドが失敗する: Docker Desktop を起動（`supabase status`, `supabase db dump` などは Docker 必須）
- RLS により取得/更新できない: ポリシーを確認（開発は Allow all、 本番は要制御）
- 企画書の公開期限で表示されない: `expires_at` 判定（`lib/database.ts#getProposalBySlug`）
- 企画出演者の更新が反映されない: `updatePlan()` は performers 配列を受け取ると中間テーブルを再作成（insert/delete）

## GitHubへのプッシュ前チェックリスト（必須）

### 1. 環境変数の確認
以下のコマンドを実行：
- `git status`（.envファイルが表示されていないことを確認）
- `grep -r "SUPABASE_SERVICE_ROLE_KEY" . --exclude-dir=node_modules`
- `grep -r "process.env" . --exclude-dir=node_modules | grep -v ".env"`

### 2. .gitignoreの確認
以下が含まれていることを確認：
- 環境変数: `.env`, `.env.local`, `.env.production`, `.env.development`
- Supabase: `**/supabase/.env`, `**/supabase/seed.sql`
- 秘密鍵: `*.pem`, `*.key`, `private-key*`, `serviceAccount.json`
- 個人データ: `*.sqlite`, `*.db`, `credentials.json`
- ビルド生成物: `.next/`, `dist/`, `build/`

### 3. 機密情報のスキャン
- APIキー: Supabase URL, anon key, service role key
- データベース: 接続文字列、パスワード
- 認証情報: JWT秘密鍵、OAuth credentials
- 個人情報: メールアドレス、電話番号、テストユーザー情報

### 4. プッシュ前の最終確認コマンド
以下のコマンドを実行：
- `git diff --staged`
- `grep -r "sk_" . --exclude-dir={node_modules,.next,dist}`
- `grep -r "secret" . --exclude-dir={node_modules,.next,dist} -i`
- `grep -r "password" . --exclude-dir={node_modules,.next,dist} -i`
- `git log -p -S "SUPABASE_SERVICE_ROLE_KEY"`

### 5. もし誤ってコミットしてしまった場合
まだプッシュしていない場合：
- `git reset --soft HEAD~1` を実行

すでにプッシュしてしまった場合：
1. すぐに該当のキーを無効化/再生成
2. git-filter-branchやBFG Repo-Cleanerで履歴から削除
3. force pushで履歴を書き換え