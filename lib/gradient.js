/**
 * Gradient Reading Implementation
 * Applies color gradients to text for enhanced visual tracking
 */

const GradientReader = {
  // Gradient theme definitions
  themes: {
    none: {
      name: 'None',
      colors: []
    },
    ocean: {
      name: 'Ocean',
      colors: [
        [200, 70, 50],  // Blue
        [180, 60, 45],  // Teal
        [190, 65, 48],  // Cyan
        [210, 75, 52],  // Azure
        [170, 55, 42]   // Sea green
      ]
    },
    sunset: {
      name: 'Sunset',
      colors: [
        [0, 70, 55],    // Red
        [20, 80, 55],   // Orange-red
        [35, 85, 50],   // Orange
        [45, 90, 52],   // Gold
        [55, 75, 48]    // Yellow
      ]
    },
    forest: {
      name: 'Forest',
      colors: [
        [120, 45, 40],  // Forest green
        [90, 50, 42],   // Olive
        [140, 40, 38],  // Moss
        [100, 55, 44],  // Sage
        [80, 35, 36]    // Moss brown
      ]
    },
    berry: {
      name: 'Berry',
      colors: [
        [330, 60, 50],  // Pink
        [300, 50, 45],  // Purple-pink
        [280, 55, 48],  // Violet
        [320, 65, 52],  // Magenta
        [340, 58, 47]   // Rose
      ]
    },
    lavender: {
      name: 'Lavender',
      colors: [
        [260, 50, 55],  // Lavender
        [270, 45, 52],  // Purple
        [250, 55, 58],  // Periwinkle
        [280, 40, 50],  // Violet
        [240, 48, 54]   // Blue-violet
      ]
    },
    autumn: {
      name: 'Autumn',
      colors: [
        [25, 75, 45],   // Rust
        [35, 80, 48],   // Orange
        [15, 70, 42],   // Brown-orange
        [45, 65, 50],   // Gold
        [5, 60, 40]     // Dark rust
      ]
    },
    mint: {
      name: 'Mint',
      colors: [
        [160, 50, 48],  // Mint
        [150, 45, 45],  // Seafoam
        [170, 55, 50],  // Aqua
        [140, 40, 42],  // Sage
        [180, 48, 46]   // Teal
      ]
    },
    twilight: {
      name: 'Twilight',
      colors: [
        [250, 50, 45],  // Deep blue
        [270, 45, 48],  // Purple
        [290, 40, 42],  // Violet
        [230, 55, 50],  // Blue
        [310, 35, 46]   // Plum
      ]
    },
    coffee: {
      name: 'Coffee',
      colors: [
        [30, 40, 35],   // Brown
        [25, 35, 38],   // Coffee
        [35, 45, 40],   // Caramel
        [20, 30, 32],   // Dark brown
        [40, 50, 42]    // Amber
      ]
    },
    monochrome: {
      name: 'Monochrome',
      colors: [
        [0, 0, 30],     // Dark gray
        [0, 0, 40],     // Medium-dark gray
        [0, 0, 50],     // Medium gray
        [0, 0, 45],     // Gray
        [0, 0, 35]      // Darker gray
      ]
    }
  },

  /**
   * Detect if the page is using dark mode
   * @returns {boolean} True if dark mode
   */
  isDarkMode() {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    if (!bodyBg || bodyBg === 'transparent') return false;

    const match = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return false;

    const [, r, g, b] = match.map(Number);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  },

  /**
   * Adjust color for dark/light mode
   * @param {number[]} hsl - HSL color array [h, s, l]
   * @param {boolean} isDark - Whether in dark mode
   * @returns {number[]} Adjusted HSL color
   */
  adjustForTheme(hsl, isDark) {
    const [h, s, l] = hsl;
    if (isDark) {
      // For dark mode: increase lightness, adjust saturation
      return [h, Math.min(s + 10, 100), Math.min(l + 25, 75)];
    }
    // For light mode: keep colors darker
    return [h, s, Math.max(l - 10, 25)];
  },

  /**
   * Convert HSL to CSS string
   * @param {number[]} hsl - HSL color array [h, s, l]
   * @returns {string} CSS hsl() string
   */
  hslToString(hsl) {
    return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
  },

  /**
   * Apply gradient reading to an element
   * @param {Element} element - DOM element to process
   * @param {string} themeName - Name of the gradient theme
   */
  applyGradient(element, themeName = 'ocean') {
    const theme = this.themes[themeName];
    if (!theme || theme.colors.length === 0) {
      this.removeGradient(element);
      return;
    }

    const isDark = this.isDarkMode();
    const colors = theme.colors.map(color => this.adjustForTheme(color, isDark));

    // Find all block-level elements that contain text
    const selectors = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, dt, dd';
    const elements = element.querySelectorAll(selectors);

    let colorIndex = 0;
    elements.forEach(el => {
      // Skip empty elements
      if (!el.textContent.trim()) return;

      // Skip elements that are inside code blocks
      if (el.closest('pre, code')) return;

      const color = colors[colorIndex % colors.length];
      el.style.setProperty('--gradient-color', this.hslToString(color));
      el.classList.add('gradient-text');
      colorIndex++;
    });
  },

  /**
   * Remove gradient reading from an element
   * @param {Element} element - DOM element to clean
   */
  removeGradient(element) {
    const gradientElements = element.querySelectorAll('.gradient-text');
    gradientElements.forEach(el => {
      el.style.removeProperty('--gradient-color');
      el.classList.remove('gradient-text');
    });
  },

  /**
   * Get list of available theme names
   * @returns {string[]} Array of theme names
   */
  getThemeNames() {
    return Object.keys(this.themes);
  },

  /**
   * Get theme display name
   * @param {string} themeName - Theme key
   * @returns {string} Display name
   */
  getThemeDisplayName(themeName) {
    return this.themes[themeName]?.name || themeName;
  },

  /**
   * Get preview colors for a theme
   * @param {string} themeName - Theme key
   * @returns {string[]} Array of CSS color strings
   */
  getPreviewColors(themeName) {
    const theme = this.themes[themeName];
    if (!theme || theme.colors.length === 0) return [];
    return theme.colors.map(color => this.hslToString(color));
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GradientReader;
}
