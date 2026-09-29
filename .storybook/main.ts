import type { StorybookConfig } from '@storybook/nextjs';

/**
 * Storybook configuration for the Dorisio frontend.
 *
 * Stories live next to the components they document (`*.stories.tsx`), and the
 * Next.js framework preset is used so App Router components, CSS modules and
 * the Tailwind/PostCSS pipeline behave exactly as they do in the app.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
};

export default config;
