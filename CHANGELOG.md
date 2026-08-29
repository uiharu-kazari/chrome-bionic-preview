# Changelog

## 0.2.2 - 2026-08-29

- Make fixation, opacity, and gradient-theme changes take effect immediately on the active page.
- Reliably inject and initialize the page renderer before popup controls send updates.
- Display gradient themes on text-only page layouts and remove them cleanly.
- Sanitize rendered Markdown HTML and unsafe URLs.
- Remove the unnecessary persistent `tabs` permission; `activeTab` already covers the user-invoked page.
- Align the reusable bionic and gradient libraries with extension behavior.
- Add unit, integration, and Chromium end-to-end coverage for popup controls.
