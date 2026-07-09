# GhostAPI Capture Permission Justification

This document explains why the extension asks for each permission.

## `activeTab`

Used only when the user clicks the extension on the current tab. This allows GhostAPI to inject the recorder into the active page without requesting access to every website all the time.

## `scripting`

Used to inject `content-recorder.js` into the current tab after the user clicks `Open recorder on this page`.

## `storage`

Used to remember the configured GhostAPI server URL, such as `http://127.0.0.1:4000` or the future cloud API URL.

## Host permissions

```json
[
  "http://127.0.0.1:4000/*",
  "http://localhost:4000/*",
  "https://api.ghostapi.app/*",
  "https://*.ghostapi.app/*"
]
```

These allow the extension popup and recorder to communicate with the configured GhostAPI backend.

## Permissions intentionally avoided

- `tabs`: avoided because `activeTab` is enough for user-triggered injection.
- broad `<all_urls>` host permission: avoided to reduce review risk and protect user trust.
- background page recording: not used.
