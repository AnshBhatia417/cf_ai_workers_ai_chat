<<<<<<< HEAD
# cf_ai_workers_ai_chat
A Cloudflare Workers AI chat agent with stateful memory , a minimal chat andvoice UI, and configurable Llama on Workers AI.
=======
cf_ai_worker_agent

A Cloudflare Workers project that implements a chat-backed Durable Object (ChatAgent) and uses Workers AI + Vectorize index resources.

Status summary
- Durable Object worker (`chat-agent-worker`) has been scaffolded and deployed to your account. You should have a published URL like `https://chat-agent-worker.<your-subdomain>.workers.dev`.
- Main worker uses `script_name = "chat-agent-worker"` for the `CHAT_AGENT` binding in `wrangler.toml`, so it routes Durable Object calls to the deployed DO.
- The project had issues running fully in local dev because Wrangler/miniflare attempts to wrap internal Cloudflare bindings (AI/Vectorize) which are not fully resolvable locally. Attempts to start `npx wrangler dev --local` produced "wrapped binding module can't be resolved" errors.
- To make local development possible a mocked fallback was added to `src/llm.ts` so the code will return a deterministic mock reply if the `AI` binding isn't present. However, Wrangler may still fail to start if it tries to resolve wrapped internal bindings during startup.

Recommended workflows

1) Quick local development (mock AI)
- This is the safest way to iterate on UI and Durable Object flows without publishing the main worker or using remote AI:

  # start the DO worker locally (optional, recommended for DO connection)
  cd chat-agent-worker
  # cf_ai_workers_ai_chat

  A Cloudflare Workers AI chat agent with stateful memory, a minimal chat UI, and configurable Llama on Workers AI.

  cf_ai_worker_agent

  Overview
  --------
  This repository contains two pieces:

  - The main Worker (root of the repo) which serves the web UI in `public/` and forwards chat API requests to a
    Durable Object namespace called `CHAT_AGENT`.
  - A separate Durable Object worker at `chat-agent-worker/` which implements the `ChatAgent` class (stateful
    memory, summarization alarms, etc.).

  Status summary
  --------------
  - Durable Object worker (`chat-agent-worker`) has been scaffolded and can be deployed to your Cloudflare account.
  - The main worker is configured to use `script_name = "chat-agent-worker"` in `wrangler.toml` so it routes
    Durable Object calls to the deployed DO implementation.
  - Local `wrangler dev` can encounter errors resolving Cloudflare internal wrapped bindings (AI/Vectorize).
    To make local development reliable, the project includes a mock fallback in `src/llm.ts` so the UI and chat
    flows work without an AI binding.

  Recommended workflows
  ---------------------

  1) Quick local development (mock AI)

     # Install dependencies
     npm install
     cd chat-agent-worker && npm install

     # Optional (recommended): start DO worker locally
     cd chat-agent-worker
     npx wrangler dev --local

     # In a second terminal, start the main worker
     cd ../
     npx wrangler dev --local

     If Wrangler errors during startup about wrapped bindings, temporarily comment out the `ai`/`vectorize`
     bindings in `wrangler.toml` and rely on the mock fallback in `src/llm.ts`.

  2) End-to-end testing (recommended for full functionality)

     # Deploy the Durable Object worker
     cd chat-agent-worker
     npx wrangler deploy

     # Start the main worker locally (it will route Durable Object calls to the deployed DO)
     cd ../
     npx wrangler dev --local

  3) Publish the main worker

     cd /path/to/CloudFlare
     npx wrangler deploy

  Smoke test (POST to /api/chat)
  --------------------------------

  Once your dev server is up on localhost:8787 (or the worker is deployed), run:

    curl -X POST http://localhost:8787/api/chat \
      -H "Content-Type: application/json" \
      -d '{"sessionId":"test","message":"hello"}'

  If running against the deployed main worker, replace the URL with your worker's URL.

  Troubleshooting notes
  ---------------------

  - If `npx wrangler dev --local` fails with "wrapped binding module can't be resolved", try:
    - Ensuring `remote = true` is set for `AI` (and vectorize if supported) in `wrangler.toml`.
    - Publishing the DO worker (so `script_name` points to a deployed script).
    - Temporarily removing AI/vectorize binding entries from `wrangler.toml` while developing locally.

  Files added/edited
  ------------------

  - `chat-agent-worker/` — Durable Object worker scaffold and wrangler config.
  - `src/llm.ts` — added mock fallback for local dev.
  - `wrangler.toml` — updated to reference `chat-agent-worker` via `script_name` and mark AI as remote.

  Quick clone-and-run checklist for collaborators
  ----------------------------------------------

  1) Prerequisites
     - Node 18+ (the project was tested with Node v22)
     - npm
     - A Cloudflare account and permission to create workers (if testing AI/vectorize or publishing)
     - `wrangler` is used via `npx wrangler` (no global install required)

  2) Clone
     git clone <repo>
     cd <repo>

  3) Install dependencies
     npm install
     cd chat-agent-worker && npm install

  4) Local dev with mock AI (recommended for initial testing)
     - Start the DO worker (optional but recommended):
         cd chat-agent-worker
         npx wrangler dev --local
     - In another terminal, start the main worker:
         cd ../
         npx wrangler dev --local

  5) End-to-end test (requires Cloudflare account)
     - Publish the DO worker:
         cd chat-agent-worker
         npx wrangler deploy
     - Start the main worker locally (it will route DO calls to the published DO):
         cd ../
         npx wrangler dev --local

  6) Run smoke test
     curl -X POST http://localhost:8787/api/chat -H 'Content-Type: application/json' -d '{"sessionId":"test","message":"hello"}'

  Notes
  -----

  - The project includes a fallback mock AI so UI and conversation flows can be tested without billing Cloudflare AI usage.
  - To test the real AI & Vectorize flows, configure the appropriate bindings in your Cloudflare account and set `remote = true` where necessary.
