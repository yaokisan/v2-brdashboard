# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BEAUTY ROAD Dashboard - A Next.js 15 application for managing TV show performer information, schedules, and project planning.

## Essential Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Cookie-based admin authentication

### Directory Structure
```
src/
├── app/               # Next.js App Router pages
│   ├── admin/        # Admin-only pages (protected)
│   └── project/      # Public project viewer pages
├── components/       # React components
├── lib/              # Core logic and utilities
│   ├── auth.ts       # Authentication logic
│   ├── data.ts       # Data management
│   ├── database.ts   # Database operations
│   └── supabase.ts   # Supabase client setup
└── types/            # TypeScript definitions
```

### Key Architectural Patterns

1. **Authentication Flow**:
   - Admin login via password managed in environment variable: `ADMIN_PASSWORD`
   - Cookie-based session management in `lib/auth.ts`
   - Protected routes check authentication server-side

2. **Data Operations**:
   - Browser facade `lib/database.ts` calls the allowlisted `/api/data` endpoint
   - Database operations live in `lib/server/database.ts`; `lib/supabase.ts` is server-only
   - Every private operation verifies the signed admin session; public operations are explicitly scoped

3. **Type Safety**:
   - Central type definitions in `src/types/index.ts`
   - Database types generated from Supabase schema
   - Path alias `@/*` maps to `src/*`

4. **UI Components**:
   - `ComprehensiveSchedule.tsx`: Main schedule display component
   - `ScheduleEditor.tsx`: Interactive schedule editing interface
   - Japanese language UI throughout

### Database Schema

Main tables:
- `projects`: Project information
- `performers`: Performer details linked to projects
- `plans`: Individual segments/plans within projects
- `plan_performers`: Many-to-many relationship between plans and performers

All tables have:
- UUID primary keys
- Automatic `updated_at` timestamps via triggers
- Row Level Security enabled; anonymous/authenticated table access revoked (apply security migration)

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
SESSION_SECRET=independent-random-secret-at-least-32-characters
CRON_SECRET=separate-random-secret
ADMIN_PASSWORD=your-admin-password
```

## Development Notes

- The application has two distinct user flows: admin (full CRUD) and performer (read-only)
- Demo system available at `/admin/demo` with sample data
- Mobile-responsive design using Tailwind's responsive utilities
- Time management includes confirmed/unconfirmed states for flexibility
- Run `npm test`; review `SECURITY_DEPLOYMENT.md` before production rollout