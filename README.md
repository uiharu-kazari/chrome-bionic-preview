# Bionic Preview

A Chrome extension that enhances reading experience with bionic text highlighting and gradient reading for any webpage.

## Features

### Bionic Text Highlighting
- **Bold word beginnings** - Emphasizes the first characters of each word to guide your eye through text faster
- **Adjustable fixation point** (1-5) - Control how many characters are bolded per word
- **Dim opacity control** - Adjust the visibility of non-emphasized text

### Gradient Reading
- **10 color themes** - Ocean, Sunset, Forest, Berry, Lavender, Autumn, Mint, Twilight, Coffee, Monochrome
- **Automatic theme adaptation** - Colors adjust for light and dark mode
- **Line-by-line coloring** - Different colors for different paragraphs aid visual tracking

### Markdown Preview
- **Markdown file rendering** - Formats raw `.md` content when Bionic Preview is activated
- **Common Markdown and GFM support** - Headers, lists, code blocks, tables, links, images, and more
- **Dark mode support** - Adapts to your system color scheme

## Installation

### From Chrome Web Store
Not yet available on Chrome Web Store. Use manual installation below.

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-bionic-preview` folder
5. The extension icon should appear in your toolbar

## Usage

Reading effects are scoped to the current page. Settings are remembered across pages; ordinary pages start with effects off. Raw Markdown is rendered when you open the popup if “Render Markdown files” is enabled. Local files require “Allow access to file URLs” in Chrome’s extension settings. Chrome internal pages and the Chrome Web Store cannot be changed.

1. **Click the extension icon** to open the settings popup
2. **Toggle the switch** to enable/disable bionic preview on the current page
3. **Adjust settings**:
   - **Fixation Point**: How many characters are emphasized (1-5)
   - **Dim Opacity**: Opacity of non-emphasized text (10-90%)
   - **Gradient Theme**: Choose a color theme or "None" to disable
   - **Render Markdown files**: Convert raw Markdown into a formatted preview

Fixation point, opacity, and gradient-theme changes take effect immediately on
the current page.

## How Bionic Text Works

Bionic text highlighting is a reading method that guides the eye through text by bolding the beginning of words. Some readers prefer these emphasis points for scanning prose. The effect is a personal reading preference; this extension does not claim a proven improvement in reading speed or comprehension.

Example:
- Normal: "The quick brown fox jumps over the lazy dog"
- Bionic: "**Th**e **qui**ck **bro**wn **fo**x **jum**ps **ov**er **th**e **la**zy **do**g"

## Project Structure

```
chrome-bionic-preview/
├── CHANGELOG.md           # Release notes
├── manifest.json           # Extension manifest (v3)
├── package.json            # Test commands and development dependencies
├── playwright.config.cjs   # Chromium end-to-end test configuration
├── vitest.config.mjs       # Unit and integration test configuration
├── popup/
│   ├── popup.html         # Settings popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── content/
│   ├── content.js         # Page transformation script
│   └── content.css        # Content styles
├── background/
│   └── service-worker.js  # Background service worker
├── lib/
│   ├── bionic.js          # Bionic text implementation
│   ├── gradient.js        # Gradient reading implementation
│   └── markdown.js        # Markdown parser
├── e2e/                   # Playwright extension tests
├── test/                  # Vitest unit and integration tests
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Development

### Prerequisites
- Chrome browser
- Node.js 20.19 or newer (or Node.js 22.12+) for automated tests
- Basic knowledge of Chrome extension development

### Testing
Install dependencies and the test browser once with `npm install` and
`npx playwright install chromium`, then run:

```bash
npm test          # unit and integration tests
npm run test:e2e  # real Chromium extension test
npm run test:all  # both suites
```

For manual testing, go to `chrome://extensions/`, click the refresh icon on
the extension card, then test on a webpage or Markdown file.

### Building for Production
Runtime libraries are bundled locally and pinned in the lockfile. Regenerate them
with `npm run vendor` after changing a runtime dependency. Prepare the runtime-only
ZIP and a SHA-256 inventory with:

```bash
npm ci
npm run release:check
```

The upload artifact is `dist/bionic-preview-0.2.3.zip`; the unpacked folder is
`dist/bionic-preview-0.2.3/`. Packaging verifies the version and least-privilege
manifest and excludes tests, dependencies, Git history and local reports.
Upload this ZIP in the Chrome Web Store Developer Dashboard only after final
review and approval. Store-account access, listing screenshots, disclosures and
store review remain separate publication steps.

Third-party licenses for Marked, DOMPurify and KaTeX are included in `lib/`.

## Also Available On

| Platform | Link |
|----------|------|
| **Web App** | [bionicmarkdown.com](https://bionicmarkdown.com) |
| **VS Code** | [Marketplace](https://marketplace.visualstudio.com/items?itemName=BionicMarkdown.bionic-markdown-preview) |
| **Chrome** | You are here! |

**Source Code:**
- [Web App](https://github.com/uiharu-kazari/bionic-markdown-preview-web)
- [VS Code Extension](https://github.com/uiharu-kazari/vscode-bionic-markdown-preview)
- [Chrome Extension](https://github.com/uiharu-kazari/chrome-bionic-preview)

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Privacy Policy

**Bionic Preview does not collect document content or send it to a service.**

- All processing happens locally in your browser
- User preferences (fixation point, opacity, theme) are stored locally using Chrome's storage API
- No document text or preferences are sent to a service by the extension
- Markdown images may load from their source URLs when rendered, just like webpage images
- No analytics or tracking
- No user accounts required

This extension accesses the current page only after you click its toolbar icon,
solely to detect or render Markdown and apply the selected reading effects.

## License

MIT License - See LICENSE file for details
