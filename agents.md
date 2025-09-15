# Repository Guidelines

## Project Structure & Module Organization
- Root server: `server.js` (Express, webhooks, SSE).
- Backend services: `services/` (Supabase persistence, cache, Redis) and `src/services/` (TypeScript integrations: ElevenLabs, Twilio, analytics).
- Frontend app: Vite + React in `src/` with build output in `dist/`.
- Database and ops: `supabase/`, `*.sql` migration files, and `docs/` references.
- Tests and tooling: ad‑hoc Node scripts `test-*.js` plus npm script aliases.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server for the UI.
- `npm run server`: Start Express API/webhook server (`server.js`).
- `npm run dev:full`: Run UI and server concurrently for local integration.
- `npm run build`: Build frontend to `dist/` (Vite).
- `npm run lint`: Lint TypeScript/React sources (ESLint flat config).
- Examples: `node test-supabase-persistence.js`, `node test-incoming-sms.js`, `npm run test:redis`, `npm run test:supabase` to exercise key paths.

## Coding Style & Naming Conventions
- TypeScript in `src/**/*.{ts,tsx}`; Node scripts and server in `.js`.
- Follow ESLint rules (`eslint.config.js`). Prefer explicit types in TS, camelCase for variables/functions, PascalCase for React components, kebab-case for standalone scripts.
- Keep functions small; validate `organization_id` on every data path.

## Testing Guidelines
- Use the provided Node test scripts to validate integrations (Supabase, Twilio mocks, SSE, Redis, ElevenLabs flows).
- Name new scripts `test-<area>.js` and print clear PASS/FAIL output.
- Before PRs: run `npm run lint`, exercise `test-*-*.js` relevant to your changes, and verify local `.env`.

## Commit & Pull Request Guidelines
- Commits: imperative, concise, scoped (e.g., "fix: conversation ordering for SMS"). Group related changes.
- PRs must include: summary, motivation, risk/rollback plan, test evidence (logs/screenshots), and any schema or env var changes.
- Link related issues. For UI tweaks, attach screenshots or short clips.

## Security & Configuration Tips
- Secrets: copy `.env.example` → `.env`; never commit secrets.
- Multi‑tenancy: every query must filter by `organization_id`; respect RLS.
- Webhooks: validate signatures; set `JWT_SECRET`, Supabase keys, and Twilio credentials.
- Data handling: avoid logging PII; redact phone/email when possible.

