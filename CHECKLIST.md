PHASE 0 — SAFETY & SETUP

Branch: feat/ai-news-editor (create this branch before committing changes locally)

Acceptance criteria:
- [ ] App still builds and the existing MVP works with all flags false.
- [ ] `lib/ai.ts` compiles and returns mock data when no OPENAI_API_KEY is set.
- [ ] `.env.example` and `.env.local` contain the required AI_* flags and OPENAI_API_KEY placeholder.

PHASE 1 — AI MULTI-QUERY INTERPRETER

Acceptance criteria (high level):
- [ ] When `AI_MULTI_QUERY_ENABLED=true`, typing a compound query causes the server to call `aiSuggestQueries` and build a combined digest with separate sections per suggested query.
- [ ] With the flag off, behavior is unchanged.

Process notes:
- Make small commits. Update this file before each commit describing the newly added acceptance checks.
