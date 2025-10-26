# Repository Guidelines

## Project Structure & Module Organization
- `src/app` hosts App Router entry points: customer flows (`menu`, `orders`, `checkout`) and admin dashboards (`analytics`, `inventory`, `suppliers`).
- Shared UI sits in `src/components` (domain folders plus `components/ui`); common logic lives in `src/hooks`, `src/lib/services`, `src/providers`, and `src/types`.
- Persistent assets reside in `public/`; automation scripts live in `scripts/`.
- Database artifacts stay in `database/migrations` and `supabase/migrations`; env templates live in `ENV` and `ENV_SANDBOX`.
- Tests and helpers are centralized in `__tests__/`, mirroring component names.

## Build, Test & Development Commands
- `npm install` installs dependencies (Node 18+).
- `npm run dev:webpack` starts the preferred dev server; `npm run dev` tries Turbopack.
- `npm run build` compiles the production bundle; `npm start` serves it.
- `npm run lint` runs ESLint with the Next + TypeScript ruleset.
- Square/Supabase tooling: `npm run seed-square`, `npm run clear-and-reseed`, `npm run seed-inventory`, `npm run init-taxes`.
- Database workflows: `npm run db:migrate`, `npm run db:reset`, `npm run db:generate`; `npm run db:link` pairs the project to Supabase.
- Diagnostics: `npm run debug-square`; `npm run test:ai` smoke-tests invoice parsing.

## Coding Style & Naming Conventions
- TypeScript-first codebase with strict types; write functional React components.
- Match repo formatting: two-space indentation, single quotes, trailing commas, minimal semicolons.
- Components use PascalCase (`src/components/ui/Button.tsx`); hooks start with `use`; shared utilities prefer camelCase.
- Tailwind CSS v4 drives styling; deduplicate classes with `tailwind-merge`.
- Always run `npm run lint` before pushing; respect `eslint.config.mjs`.

## Testing Guidelines
- Tests live under `__tests__` with `.test.tsx` suffixes; shared setup and helpers are in `__tests__/setup.ts` and `__tests__/utils.tsx`.
- Execute suites with `npx jest --runInBand --setupFilesAfterEnv=__tests__/setup.ts` (install `jest` locally if missing).
- Cover menu, ordering, and inventory flows; mock network calls with `mockFetch`.

## Commit & Pull Request Guidelines
- Follow existing history: short, imperative subjects (e.g., `resolve production build errors`).
- Keep changes scoped; include prefixes like `admin:` or `inventory:` when clarifying impact.
- PRs should describe intent, list test commands run, link related issues, and attach screenshots for UI tweaks.
- Document environment changes and update `ENV*` templates whenever variables shift.

## Security & Configuration
- Store secrets only in untracked `.env.local`; scrub sensitive values before sharing `ENV` templates.
- Validate Square credentials with `npm run debug-square` and Supabase connectivity with `npm run db:link` before deployment.
- Review `middleware.ts` whenever adding routes to confirm auth guards cover admin surfaces.
