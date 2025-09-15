# Pull Request Template

## Summary
Briefly describe what this PR changes and why.

Linked issues: Closes #

## Changes
- 

## Testing
- Commands run (examples):
  - `npm run lint`
  - `npm run build`
  - `npm run dev:full` (local integration)
  - Node tests: `node test-<area>.js` (list which)
- Evidence: attach logs, screenshots, or short clips.

## Screenshots / Media (if UI)

## Schema / Config Changes
- DB migrations or SQL files touched: 
- Env vars added/changed: update `.env.example` if needed.

## Risk / Rollback Plan
- Potential impact and fallback steps.

## Security & Multi‑Tenancy Checklist
- [ ] All DB queries filter by `organization_id`.
- [ ] Compatible with Supabase RLS policies.
- [ ] No secrets committed; sensitive logs redacted.
- [ ] Webhook signatures validated (Twilio/ElevenLabs) where applicable.

## Performance & Compatibility
- [ ] No breaking API changes (document if any).
- [ ] Acceptable performance for added logic.

## Documentation
- [ ] Updated docs where relevant (e.g., `AGENTS.md`, `docs/`, SQL notes).

