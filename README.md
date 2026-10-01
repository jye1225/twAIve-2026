# twAIve-2026

Graduation project workspace configured with:

- GitHub Spec Kit for spec-driven development
- goaljaby for PRD-to-goal validation/recovery scaffolding

## Installed Tooling

### Spec Kit

Spec Kit files live under `.specify/`, with Codex skills under `.agents/skills/speckit-*`.

Suggested flow:

1. `$speckit-constitution`
2. `$speckit-specify`
3. `$speckit-plan`
4. `$speckit-tasks`
5. `$speckit-implement`

### goaljaby

The goaljaby Claude Code plugin structure is included at:

- `.claude-plugin/plugin.json`
- `commands/goaljaby.md`
- `skills/goaljaby/`
- `.agents/skills/goaljaby/`
- `docs/goaljaby/`

Use goaljaby when a PRD should become operational goal documents:

- `VALIDATION.md`
- `RECOVERY.md`
- `PLAN.md`
- `PROGRESS.md`
- `goal-command.md`

## Supabase Auth Setup

The site is deployed on Vercel, while user accounts and learning records use Supabase.
This project uses Supabase Auth.

1. Create a Supabase project.
2. Open `supabase-config.js` and replace:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_KEY`
3. In Supabase, open the SQL editor and run `supabase-schema.sql`.
4. In Authentication settings, disable email confirmation for this demo username/password flow.
   The UI asks for username/password, while Supabase Auth receives an internal email like
   `username@twaive-user.example.com`.
5. In Authentication settings, add the deployed Vercel URL to allowed redirect/site URLs:
   - `https://twaive-2026.vercel.app/`

Passwords are stored securely by Supabase Auth. Usernames and display names are stored in the `profiles` table.
Episode progress is stored in the `user_episode_progress` table, including the current scene, score, choices, feedback, and ending state.
Each episode includes a before/after reflection question and a final learning report to show how the user's AI ethics awareness changes through the story.
The current learning set covers five topics: deepfakes and portrait rights, AI misinformation, chatbot dependence, AI-assisted assignments, and privacy in recommendation algorithms.

## AI Ethics Scoring Model

The learning report uses an explainable rule-based model grounded in the 2026
`대한민국 인공지능 윤리원칙`. Each choice is rated independently across the
relevant national principles on a 0-4 behavioral rubric, normalized to a
0-100 principle score, and accompanied by policy evidence codes. The model is
implemented in `scoring-engine.js` and validated by `tests/scoring-engine.test.js`.

The resulting score is an educational diagnostic, not an official government
rating, legal judgment, or standardized psychological test. See
`docs/SCORING_MODEL.md` for the source crosswalk, formula, limitations, and the
data-driven model roadmap.

The scenario-specific rubric design also follows the KISDI AI Ethics
Communication Channel's self-check structure: general principles are adapted
into common checks and then into domain examples such as chatbots, writing AI,
and synthetic video. KISDI's Level 0/1/2 labels describe application layers,
not numeric scores; twAIve's 0-4 behavior rubric remains a separate educational
operationalization.

Each story decision now records a structured reason and response time in the
existing Supabase JSON history. The analysis engine derives risk/proactive
choice rates, dominant decision criteria, before/after change, repeat count,
and an explainable learner profile. These outputs are educational behavioral
analytics, not a trained psychological classifier.

After a learner chooses a story action, the signed-in app asks the same Vercel
serverless endpoint for exactly three scene-specific reason options. Only the
episode, scene, and selected action are sent. The response uses fixed analysis
codes so existing behavioral analytics remain comparable. Results are cached
for the browser session, and a deterministic three-option fallback keeps the
story usable when the AI request is unavailable or exceeds ten seconds.

## Optional AI Result Tutor

The result page can send the signed-in learner's episode score, principle
scores, choices, decision reasons, and optional question to a Vercel serverless
function. The function verifies the Supabase access token, asks the OpenAI
Responses API for a structured Korean explanation, and searches the YouTube
Data API for up to three related learning videos. Display name, username, and
password are not included in this request.

Configure these variables in Vercel Project Settings > Environment Variables,
then redeploy:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, defaults to `gpt-6-luna`)
- `YOUTUBE_API_KEY` (optional; without it, the UI provides a YouTube search link)
- `SUPABASE_URL` (required)
- `SUPABASE_ANON_KEY` (required)

Never put the OpenAI or YouTube secret key in `supabase-config.js` or another
browser-delivered file. Opening `index.html` directly or serving it with a basic
static server does not execute `/api/explain-result`; use a Vercel deployment or
Vercel's local development runtime for the AI tutor.
