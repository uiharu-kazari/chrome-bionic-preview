# Bionic Preview

A Chrome extension that enhances reading experience with bionic text highlighting and gradient reading for any webpage.

## Features

### Bionic Text Highlighting
- **Bold word beginnings** - Emphasizes the first characters of each word to guide your eye through text faster
- **Adjustable fixation point** (1-5) - Control how many characters are bolded per word
- **Dim opacity control** - Adjust the visibility of non-emphasized text

### Gradient Reading
- **11 color themes** - Ocean, Sunset, Forest, Berry, Lavender, Autumn, Mint, Twilight, Coffee, Monochrome
- **Automatic theme adaptation** - Colors adjust for light and dark mode
- **Line-by-line coloring** - Different colors for different paragraphs aid visual tracking

### Markdown Preview
- **Markdown file rendering** - Formats raw `.md` content when Bionic Preview is activated
- **Full markdown support** - Headers, lists, code blocks, tables, links, images, and more
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

1. **Click the extension icon** to open the settings popup
2. **Toggle the switch** to enable/disable bionic preview on the current page
3. **Adjust settings**:
   - **Fixation Point**: How many characters are emphasized (1-5)
   - **Dim Opacity**: Opacity of non-emphasized text (10-90%)
   - **Gradient Theme**: Choose a color theme or "None" to disable
   - **Render Markdown files**: Convert raw Markdown into a formatted preview

## How Bionic Text Works

Bionic text highlighting is a reading method that guides the eye through text by bolding the beginning of words. This creates artificial fixation points that help the brain complete words more quickly, potentially improving reading speed and comprehension.

Example:
- Normal: "The quick brown fox jumps over the lazy dog"
- Bionic: "**Th**e **qui**ck **bro**wn **fo**x **jum**ps **ov**er **th**e **la**zy **do**g"

## Project Structure

```
chrome-bionic-preview/
├── manifest.json           # Extension manifest (v3)
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
The extension is ready to use as-is. For publishing to the Chrome Web Store,
create a ZIP containing only the runtime files, then upload it in the Developer
Dashboard:

```bash
zip -r bionic-preview.zip manifest.json background content icons popup \
  lib/katex.min.js \
  -x '*.DS_Store'
```

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

## Privacy Policy

**Bionic Preview does not collect, store, or transmit any personal data.**

- All processing happens locally in your browser
- User preferences (fixation point, opacity, theme) are stored locally using Chrome's storage API
- No data is sent to external servers
- No analytics or tracking
- No user accounts required

This extension only accesses webpage content when you explicitly enable it, solely to apply the bionic preview transformation.

## License

MIT License - See LICENSE file for details
