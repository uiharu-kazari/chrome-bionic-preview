import { defineConfig } from 'vitest/config';

// The content-script libs (bionic.js, gradient.js) walk the DOM and read
// computed styles, so the default environment is jsdom. markdown.js is pure
// but runs fine here too.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.js'],
  },
});
