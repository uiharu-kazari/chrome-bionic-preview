# Changelog

## 0.2.3 - 2026-10-08

- Render GFM tables, nested lists and reference links while preserving literal code and math.
- Bundle Marked, DOMPurify and patched KaTeX locally; sanitize markup and disable trusted math commands.
- Protect editable fields, nested code, SVG and MathML; update newly inserted page text.
- Scope enabled state to each document and preserve original Markdown DOM nodes on disable.
- Add accessible popup names, focus feedback, reduced-motion support and page-access error messages.
- Prepare a validated runtime-only ZIP with third-party licenses and SHA-256 checksums.

## 0.2.2 - 2026-08-29

- Make fixation, opacity, and gradient-theme changes take effect immediately on the active page.
- Reliably inject and initialize the page renderer before popup controls send updates.
- Display gradient themes on text-only page layouts and remove them cleanly.
- Sanitize rendered Markdown HTML and unsafe URLs.
- Remove the unnecessary persistent `tabs` permission; `activeTab` already covers the user-invoked page.
- Align the reusable bionic and gradient libraries with extension behavior.
- Add unit, integration, and Chromium end-to-end coverage for popup controls.
