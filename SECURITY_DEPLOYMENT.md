# Server-authorized database access

The browser calls the fixed application operations in `/api/data`. Database credentials remain in a `server-only` module. Admin listing and CRUD require a signed, HttpOnly session; the server checks each API request independently of page navigation. The old `auth=true` cookie is ignored. The existing administrator password is retained, and users sign in again once after the release.

Existing project UUID links remain bearer links: anyone possessing that link can view the project's shared information. There is no anonymous project/proposal directory. This change does not introduce individual authentication for performers or revoke previously distributed links. Published proposals are checked for publication and expiry on the server.

Public attendance needs no account. New submissions receive an HttpOnly edit capability, scoped to the project and response. Other people's comments are hidden. Old responses and another device's responses must be changed by an administrator; an existing name is not proof of ownership. The server enforces the response deadline in Japan time. Cookies expiring/being cleared also require staff assistance.

## Production rollout (not yet applied)

1. In the existing **v2-brdashboard** Vercel project, configure `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (independent random value, at least 32 characters), and `CRON_SECRET` as **server-side secret** environment variables for the intended environment. Keep `ADMIN_PASSWORD` and the existing Supabase URL. Do not use a `NEXT_PUBLIC_` prefix for any secret. The previous anonymous key is no longer used by this application.
2. Save the current grants, policies, RLS flags and trigger settings, and inspect existing views and security-definer RPCs. This migration changes permissions only and covers the eight known application tables. The 2026-10-07 production inspection found exactly those eight public tables, no public views or security-definer functions, no column grants, and a service role with BYPASSRLS. The original permission settings were saved privately in the action workspace. The application now provides the admin-only `cliRead`, `cliMutate` and `cliContract` operations (`br-cli-v1`) for the existing external BR CLI; its reviewed adapter must replace anonymous access before CLI business operations resume. Do not ship a service-role key to that CLI or a browser.
3. Deploy this application with the new environment variables first. Verify login, admin read/edit, one known project link, schedule, proposal publication/expiry, and attendance in a test project. New environments with missing credentials fail closed.
4. Immediately apply `supabase/migrations/20261007_restrict_browser_access.sql` to the **BEAUTY ROAD DB** production database. It enables RLS and removes browser-role privileges and permissive policies on the eight application tables. It checks effective table/column grants, RLS, policy removal and server-role privileges before COMMIT; any failed assertion aborts the transaction. No business records are modified. Deploying code without this SQL does **not** close direct database access.
5. Run `supabase/tests/access_lockdown.sql` and check the Security Advisor. Verify anonymous/ordinary-authenticated database CRUD is denied, while the application workflows still work. The SQL assertions do not modify application data. Test public absence of unpublished/expired proposals and unauthorized attendance edits separately at the app boundary.

Do not revert to the old anonymous-access application after the database is closed. An application rollback would require a version supporting the server-only path. Diagnose a failed deployment while keeping browser DB access denied; do not reopen permissive policies as a routine recovery step.

## Verification completed locally, 2026-10-07

- `npm test`: 29 passing tests for real route handlers (database I/O mocked), sessions, input rules, proposal expiry, attendance ownership/deadlines and the administrative CLI boundary.
- `npm run build` and TypeScript checks: pass on Next.js 15.5.27 after reconciling the previously mismatched package lock (previous installed/locked version 15.3.3).
- Migration and assertion SQL passed on an isolated local PostgreSQL fixture, including a second migration application. All 64 anonymous/authenticated CRUD attempts across the 8 fixture tables were denied; a service-role CRUD transaction passed.
- Built-server HTTP checks cover protected page redirect, forged cookie denial, login/session, same-origin rejection, cron denial, logout, and the public demo entry. No real production data or credentials used in these checks.

The CLI API permits only seven fixed business tables, known columns and bounded reads. Creates preserve the prepared UUID; updates compare changed fields and the previous timestamp in the same database request; deletes compare all known columns. Sessions remain signed and HttpOnly, and same-origin checks still apply. CLI sessions are not separate staff identities. Parent-row comparisons do not make concurrent cascade-child changes atomic; the CLI retains its impact preview and read-before/read-after checks.

## Remaining limits

- This release preserves the shared admin password workflow. Individual staff accounts, MFA, and role separation remain a separate design decision.
- Login slowdown is per process. Public submission abuse and distributed password attacks require appropriate hosting-edge rate limiting; same-origin checks are not bot protection.
- Existing demo editing paths already contain database calls instead of local state updates in some operations. The production UUID/auth boundaries intentionally reject those calls; public demo entry/display remain available. Do not weaken production validation to make demo mutations work.
- Dependency audit still reports findings (including unused MCP/development-tool dependency paths); the lock correction is not a comprehensive dependency security remediation. Review reachability and update separately without blindly applying major-version changes.
- Supabase Auth settings, database engine updates, incident investigation and old public links are separate from closing these table grants. This change is not evidence that a breach did or did not occur.

Run tests with Node.js 22.18+ (native TypeScript stripping) or the validated local Node.js 23 runtime. Database assertion SQL is intended for the existing database owner connection after reviewing the target, not for the browser.
