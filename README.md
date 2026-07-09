# GhostAPI

Turn websites that never had APIs into clean, callable JSON endpoints.

GhostAPI controls browser workflows with Playwright, stores the workflow definition, records every run, and exposes the result through a normal HTTP API. It started with a mock college portal attendance API, and now supports generic workflows like “open a page, extract data, return JSON.”

## Why this exists

Many portals still trap useful data behind old dashboards, forms, and login screens. GhostAPI makes those flows programmable without waiting for the portal owner to ship an API.

```txt
Website UI
  → browser workflow
  → extraction steps
  → structured JSON
  → API endpoint
```

## Current capabilities

- Fastify HTTP API
- Playwright browser automation engine
- Chrome/Edge extension recorder for creating APIs directly from websites
- Chrome Web Store readiness docs for the extension
- Render deployment blueprint for the API/dashboard
- Bookmarklet fallback for quick experiments
- Workflow JSON format
- Generic workflow runner
- Mock college portal for safe local testing
- Attendance extraction demo
- Generic `portal-summary` workflow
- Experimental `google-search` workflow
- SQLite persistence for workflows, versions, API keys, and runs
- Run history with step logs
- Failure screenshot artifact route
- Workflow version list, restore, and diff APIs
- API key records hashed in SQLite
- Production-style dashboard with GhostAPI branding
- Static dashboard assets in `public/dashboard`

## Tech stack

- Node.js
- TypeScript
- Fastify
- Playwright
- SQLite via Node’s built-in `node:sqlite`
- Zod
- HTML, CSS, vanilla browser JavaScript
- Render for the first production API deploy
- Supabase Postgres planned for hosted database
- Upstash Redis planned for cloud worker queues

## Quick start

```bash
npm install
npx playwright install chromium
npm start
```

Open:

```txt
http://127.0.0.1:4000/dashboard
```

The dashboard shows these same commands in the `Setup commands` panel so non-technical users do not need to hunt through the README.

## Create an API from any website with the extension

1. Start GhostAPI:

   ```bash
   npm start
   ```

2. Open the dashboard:

   ```txt
   http://127.0.0.1:4000/dashboard
   ```

3. Install the extension:

   - Open `chrome://extensions` or `edge://extensions`.
   - Enable `Developer mode`.
   - Click `Load unpacked`.
   - Select this folder:

     ```txt
     extensions/chrome
     ```

4. Pin `👻 GhostAPI Capture` in the browser toolbar.

5. Open a website such as Google, Instagram, a college portal, or an internal dashboard.

6. Click the extension and choose `Open recorder on this page`.

7. Use the floating recorder:

   - `Record clicks/fills` captures normal clicks and typed fields.
   - `Pick data to extract` lets you click visible text and name it as JSON output.
   - `Preview JSON` shows the generated workflow.
   - `Save API` stores it in GhostAPI.

8. Run your new API:

   ```bash
   curl -X POST http://127.0.0.1:4000/v1/workflows/YOUR_WORKFLOW_ID/run \
     -H "content-type: application/json" \
     -d '{"variables":{}}'
   ```

The extension is the recommended production path because it is more reliable than a bookmarklet. Some websites can still show CAPTCHA, login challenges, MFA, or bot protection. GhostAPI should pause for human review in those cases instead of bypassing protections.

## Make the extension usable by more users

For local testers, send them this repo and tell them to load:

```txt
extensions/chrome
```

For wider distribution, package the extension:

```bash
npm run package:extension
```

This creates:

```txt
extensions/dist/ghostapi-capture.zip
```

That ZIP is the file you submit to the Chrome Web Store when the product is ready. Do not commit `.pem`, `.crx`, or `.zip` package artifacts.

## Week 12 extension store readiness

Week 12 moves the extension closer to public distribution:

- Manifest V3
- reduced permissions: `activeTab`, `scripting`, `storage`
- local/cloud server switcher in the popup
- server connection check
- privacy note in the extension
- Chrome permission justification
- Chrome Web Store listing draft
- package command for extension ZIP

Store-readiness docs:

```txt
extensions/PRIVACY.md
extensions/PERMISSIONS.md
extensions/STORE_LISTING.md
```

Still needed before public Chrome Web Store launch:

- final extension icons
- screenshots and promo tiles
- hosted privacy policy URL
- hosted support URL
- Chrome Web Store developer account
- production cloud API endpoint

## Week 13 deployment target

GhostAPI should deploy first on Render.

Why Render first: GhostAPI is a long-running Fastify API with Playwright browser automation. Render can run it as a Docker web service behind HTTPS. Supabase Postgres and Upstash Redis are planned next, but they are not required for the first deploy-ready build.

Deployment files:

```txt
Dockerfile
.dockerignore
render.yaml
.env.example
docs/week13-deployment.md
```

Production check:

```bash
npm run check
npm run test:deployment
npm run test:extension
npm run package:extension
```

Deployment plan API:

```bash
curl http://127.0.0.1:4000/v1/deployment/plan
```

## Bookmarklet fallback

The dashboard still includes a bookmarklet fallback for quick experiments. Use it only if you do not want to load the extension.

Health check:

```bash
curl http://127.0.0.1:4000/health
```

## Useful scripts

```bash
npm run check
npm run test:dashboard
npm run test:attendance
npm run test:generic
npm run test:extension
npm run test:cloud
npm run test:deployment
```

## Main API routes

### List actions

```bash
curl http://127.0.0.1:4000/v1/actions
```

### Run attendance API

```bash
curl -X POST http://127.0.0.1:4000/v1/actions/get-attendance/run \
  -H "content-type: application/json" \
  -d '{"credentials":{}}'
```

### List workflows

```bash
curl http://127.0.0.1:4000/v1/workflows
```

### Current account context

```bash
curl http://127.0.0.1:4000/v1/me
```

### Cloud readiness plan

```bash
curl http://127.0.0.1:4000/v1/cloud/plan
```

Week 11 adds the hosted-product foundation: local data now has a default user and organization, and workflows/runs/API keys are stored with ownership fields. The product still needs hosted auth, encrypted credential vault, and queue-backed cloud browser workers before normal internet users can use it without running GhostAPI locally.

### Run a generic workflow

```bash
curl -X POST http://127.0.0.1:4000/v1/workflows/portal-summary/run \
  -H "content-type: application/json" \
  -d '{"variables":{}}'
```

### Try the Google search workflow

```bash
curl -X POST http://127.0.0.1:4000/v1/workflows/google-search/run \
  -H "content-type: application/json" \
  -d '{"variables":{"query":"ghostapi"}}'
```

Google may show consent screens, CAPTCHA, bot checks, or localized pages. GhostAPI should detect those and pause for human review; it should not bypass protections.

## Example response

```json
{
  "ok": true,
  "workflowId": "portal-summary",
  "runId": "generated-run-id",
  "result": {
    "workflowId": "portal-summary",
    "source": {
      "portal": "mock-college-portal",
      "extractedAt": "2026-07-09T00:00:00.000Z"
    },
    "data": {
      "pageText": "Welcome, Hardik ..."
    }
  },
  "stepLog": [
    {
      "stepId": "open-dashboard",
      "type": "goto",
      "status": "success"
    }
  ]
}
```

## Workflow shape

```json
{
  "id": "portal-summary",
  "portal": "mock-college-portal",
  "name": "Portal Summary",
  "description": "Extract visible dashboard text as generic JSON.",
  "version": 1,
  "defaultVariables": {
    "portalUrl": "http://127.0.0.1:4100"
  },
  "steps": [
    {
      "id": "open-dashboard",
      "type": "goto",
      "url": "{{portalUrl}}/dashboard"
    },
    {
      "id": "extract-page-text",
      "type": "extract_text",
      "name": "pageText",
      "selector": "body"
    }
  ],
  "output": {
    "type": "generic",
    "sourcePortal": "mock-college-portal",
    "fields": {
      "pageText": "pageText"
    }
  }
}
```

## Project structure

```txt
src/
  actions/              API action services
  api/                  Fastify routes
  mock-portal/          local demo portal
  runner/               attendance runner compatibility layer
  storage/              SQLite repositories
  workflows/            workflow definitions, validation, engine
public/
  dashboard/            production-style dashboard UI
  assets/               GhostAPI logo
docs/                   architecture notes
```

## Production roadmap

- Chrome extension recorder
- Visual workflow builder
- Credential vault with encryption
- User accounts and organizations
- Background worker queue
- Run cancellation and retries
- Rate limiting and audit logs
- Deployment packaging
- Human-review mode for CAPTCHA, consent, and MFA screens

## License

Private prototype.
