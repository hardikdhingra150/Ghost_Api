# Week 4 Architecture

```txt
Dashboard / curl / n8n later
        ↓
Fastify GhostAPI server
        ↓
Dashboard routes + API routes
        ↓
POST /v1/actions/get-attendance/run
        ↓
Persisted workflow definition
        ↓
Generic workflow executor
        ↓
Mock college portal
        ↓
Attendance table extractor
        ↓
Run history store
        ↓
JSON response
```

## Current boundaries

### API

File: `src/api/ghostApi.ts`

Responsible for:

- HTTP endpoints
- dashboard routes
- request validation
- calling action runners that now use workflow definitions
- returning JSON

### Dashboard

File: `src/dashboard/dashboardHtml.ts`

Responsible for:

- rendering the browser control room
- running the attendance action from the UI
- loading recent runs
- showing selected run details
- showing step logs and workflow JSON

### Workflow definition

Files:

- `src/workflows/definitions/getAttendanceWorkflow.ts`
- `data/workflows/get-attendance.json`

Responsible for:

- describing the portal action as persisted data
- defining steps like `goto`, `fill`, `click`, `wait_for_url`, and `extract_table`
- defining how raw extracted data maps to the attendance response

### Storage repositories

Files:

- `src/storage/workflowRepository.ts`
- `src/storage/runRepository.ts`
- `src/storage/jsonFile.ts`

Responsible for:

- loading workflows from disk
- seeding bundled workflows into `data/workflows`
- storing run history in `data/runs.json`
- redacting sensitive input values before persistence

### Workflow engine

Files:

- `src/workflows/engine/workflowExecutor.ts`
- `src/workflows/engine/targetResolver.ts`
- `src/workflows/engine/interpolate.ts`

Responsible for:

- launching Chromium
- running workflow steps in order
- resolving targets such as `label:Student ID` and `role:button/Login`
- interpolating variables such as `{{username}}`
- producing step logs
- saving failure screenshots to `data/screenshots`

### Runner

File: `src/runner/getAttendanceRunner.ts`

Responsible for:

- calling the workflow engine
- validating workflow output
- returning the product-level attendance response

### Extractors

File: `src/workflows/extractors/tableExtractor.ts`

Responsible for:

- converting HTML tables into clean JSON objects
- applying column types such as `string`, `number`, and `percentage`

### Mock portal

File: `src/mock-portal/mockPortal.ts`

Responsible for:

- safe local demo target
- login page
- dashboard page
- attendance page

## Important product rule

GhostAPI should automate only actions the user is allowed to do manually.

Do not bypass OTP, CAPTCHA, rate limits, or access control. The production version should pause and ask the user when those appear.
