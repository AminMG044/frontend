import type { Preview } from '@storybook/react';

import '../src/app/globals.css';

/**
 * Global preview decorators/parameters.
 *
 * `globals.css` is imported so Tailwind utilities and the app's CSS custom
 * properties (colours, radii, dark mode tokens) are available in every story.
 */
const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
    a11y: {
      // Surface accessibility violations in the addon panel rather than
      // failing the story, so existing debt is visible without blocking docs.
      config: {},
    },
  },
};

export default preview;
