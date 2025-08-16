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
- **Framework**: Next.js 15.3.3 with App Router
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
   - All database operations go through `lib/database.ts`
   - Supabase client initialized in `lib/supabase.ts`
   - No API routes - all operations are client-side via Supabase SDK

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
- Row Level Security with open policies

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ADMIN_PASSWORD=your-admin-password
```

## Development Notes

- The application has two distinct user flows: admin (full CRUD) and performer (read-only)
- Demo system available at `/admin/demo` with sample data
- Mobile-responsive design using Tailwind's responsive utilities
- Time management includes confirmed/unconfirmed states for flexibility
- No test suite currently implemented