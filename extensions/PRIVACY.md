# GhostAPI Capture Privacy Policy Draft

GhostAPI Capture helps users record browser workflows and save them as GhostAPI APIs.

## What the extension collects

The extension can collect workflow-building data only after the user opens the recorder:

- clicked element selectors
- typed form values needed for a workflow
- selected extraction targets
- current page URL used as the workflow starting URL

Password inputs are converted into workflow variables instead of being stored as raw text.

## What the extension does not do

- It does not run in the background on every page.
- It does not record browsing history.
- It does not sell user data.
- It does not bypass CAPTCHA, MFA, consent screens, or bot protections.

## Where data is sent

Workflow data is sent to the GhostAPI server configured by the user:

- local development: `http://127.0.0.1:4000`
- future cloud: `https://api.ghostapi.app`

## User control

Users choose when to open the recorder, what to record, and when to save a workflow.

## Production note

Before Chrome Web Store submission, replace this draft with a hosted privacy policy URL.
