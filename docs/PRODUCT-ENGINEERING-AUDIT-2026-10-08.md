# Bionic Preview product and engineering review — 2026-10-08

> This report records the review before publication. The user subsequently approved public source synchronization and the prepared release candidates; publication results are verified separately.

## Decision

The Chrome extension now has a locally prepared 0.2.3 candidate with the core reading and Markdown journeys tested in Chromium. Publishing is pending explicit approval and Chrome Web Store listing/account readiness. This review does not claim improved reading speed, clinical benefit, an exhaustive security audit, or store acceptance.

## Scope and starting state

- Repository: `chrome-bionic-preview`; initial Git working tree was clean.
- Inspected all authored runtime files: manifest, service worker, popup HTML/CSS/JS, content HTML transformation/CSS, bionic/gradient/Markdown libraries, package configuration, tests, documentation, SVG source and PNG icon dimensions. Inspected local bundling and licenses for third-party runtime dependencies; their implementations were not independently audited line by line.
- All four manifest PNG icons match their declared 16/32/48/128 pixel sizes.
- Read-only GitHub verification: `uiharu-kazari/chrome-bionic-preview` is already public; no existing GitHub releases were listed. GitHub CLI is authenticated. No public push, commit, release, store submission, or visibility change was performed.
- No repository AGENTS.md exists in this repository; the provided global public-publication approval rules apply.

## Product findings and improvements

| Priority | Before | Candidate behavior |
| --- | --- | --- |
| High | Content-script Markdown implementation lacked tables although documentation advertised them; regex transformations rewrote code samples. | One locally bundled Marked parser handles GFM tables, nested lists, reference links, and literal fenced/inline code. Reading content and library tests use the same implementation. |
| High | Trusted KaTeX commands and hand-written filtering left a broad markup attack surface; vendored KaTeX was below the fixed version for a current prototype-pollution-gadget advisory (which requires prior prototype pollution). | DOMPurify 3.4.16 sanitizes rendered HTML/MathML; SVG, executable markup, event handlers, CSS, unsafe URLs and document-clobbering attributes are removed. KaTeX 0.19.0 uses `trust: false`, bounded expansion and size. |
| High | Nested code, editor, SVG and MathML text could be rewritten because only a text node's direct parent was checked. | Ancestor protections leave editable fields, code, diagrams and math untouched. |
| High | A toggle described as applying to the current page persisted globally and could activate another page. | Enabled state belongs to the current document; reading preferences persist. Markdown auto-render occurs only after the user opens the extension. |
| High | Markdown restoration replaced body HTML and discarded original node identity and listeners. | Actual original nodes are detached and restored, preserving identity and listeners. Ordinary webpage enable/disable only transforms reading text. |
| Medium | Newly loaded article text did not acquire reading effects. | A debounced observer applies the current preference to newly inserted text; extension changes disconnect the observer to avoid feedback loops. |
| Medium | Popup controls lacked programmatic labels/visible keyboard focus; page-access failures could show an inaccurate enabled toggle. | Named controls, visible focus, reduced-motion support, legible supporting copy, and actual connection/error feedback. Restricted pages stay off, and missing local-file permission has recovery instructions. |
| Medium | Transparent body backgrounds could be misclassified as dark. | Theme detection considers opaque body/root backgrounds, then the user's color-scheme preference; an enabled page recolors when the system color scheme changes. |
| Medium | Publication used an informal ZIP command that could omit new libraries or leak extra files. | An explicit 21-file runtime/license allowlist validates versions and minimal permissions, checks bundled dependencies against the lockfile, and writes a ZIP plus SHA-256 inventory. |

The existing fixation formula remains `max(1, floor(wordLength * fixationPoint / 6))`, clamped to word length. Defaults remain fixation 3, opacity 0.5 and no gradient. The ten existing themes remain available. The web application's text-vide Unicode/table algorithm differs; this patch preserves extension behavior and does not claim cross-platform numerical equivalence. Unicode word segmentation and formal theme contrast guarantees remain future work.

Privacy language now reflects that Markdown images may load from their source URLs. Document text and preferences are not sent to an extension service. Speed/comprehension claims have been replaced with preference-based wording.

## Verification

On Node.js 24.4.0:

```sh
export PATH=/Users/hina/.nvm/versions/node/v24.4.0/bin:$PATH
npm run release:check
```

- 56 unit/integration tests pass across five suites. Added regression cases include code/math literal preservation, nested lists/references/tables, safe math, malicious SVG/HTML/URLs, protected DOM ancestors, corrupt-setting bounds, legacy global enable state, restricted pages, and denied file access.
- Three actual Chromium Manifest V3 extension tests pass: immediate popup changes/restoration; protected editors/diagrams, dynamic content and separate tabs; raw Markdown tables/code/MathML, sanitation and restoration of original node/listener.
- Extension tests grant only a temporary localhost host permission in a copied test fixture. The release manifest remains `activeTab`, `storage`, `scripting`, with no persistent host permissions or content scripts. Native toolbar-click permission granting was not separately tested.
- `npm audit` reports zero known vulnerabilities for installed dependencies at review time. The previous KaTeX and source-map-js advisory ranges were resolved. The KaTeX advisory describes a gadget requiring prior prototype pollution, not an independent exploit: https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7.
- Vendored runtime bytes match their exact dependency versions and licenses. Manifest/package versions match.
- ZIP entries manually inspected: only the 21 expected runtime/license files; tests, reports, screenshots, node_modules, Git and local metadata excluded.
- `git diff --check` passes.

### Rendered evidence

Screenshots are produced by the actual extension tests in Chromium, with popup tabs sized to 340 pixels wide. They are local QA files, excluded from the upload ZIP:

- `test-results/qa/chrome-popup-light.png`
- `test-results/qa/chrome-popup-dark.png`
- `test-results/qa/chrome-article-light.png`
- `test-results/qa/chrome-markdown-light.png`
- `test-results/qa/chrome-markdown-dark.png`

These screenshots cover the candidate's fixture pages and light/dark styles. They do not establish arbitrary website compatibility, physical-device comfort, screen-reader interoperability, or user preference outcomes. All five screenshots were visually inspected: controls are readable, code remains literal, tables and native MathML render, and no layout clipping occurs in these fixtures. Rendered review exposed a live color-scheme change issue; the candidate now recolors enabled pages, and the browser regression verifies the change. Final cross-application review is coordinated by the parent task.

## Release artifacts and remaining gates

- Upload candidate: `dist/bionic-preview-0.2.3.zip`.
- Unpacked installation folder: `dist/bionic-preview-0.2.3/`.
- Exact file/archive hashes: `dist/bionic-preview-0.2.3.checksums.json`.
- Third-party runtime licenses included: Marked MIT, DOMPurify MPL-2.0/Apache-2.0, KaTeX MIT.

Before publication: obtain explicit approval for exposing these new changes publicly; identify/access the Chrome Web Store developer account and intended listing; prepare listing screenshots and privacy/disclosure answers; review the candidate on representative real webpages and local files via actual toolbar interaction. The repository has no store-item ID or publishing configuration, and README says it is not yet on the store. No store dashboard access was verified.

For a large SPA or infinite article, the observer scans the readable body after a debounced mutation; performance has not been profiled on a broad website corpus. User customization can reduce contrast, so this candidate does not certify every opacity/theme/background combination against an accessibility standard. Headings, code, math, and Markdown layout have fixture coverage; broad real-site and assistive-technology review remain distinct gates.
