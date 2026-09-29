import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from './avatar';

const meta = {
  title: 'Shared/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    alt: { control: 'text' },
    fallback: { control: 'text' },
    src: { control: 'text' },
  },
  args: {
    alt: 'Ada Lovelace',
    size: 'md',
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InitialsFallback: Story = {};

export const ExplicitFallback: Story = { args: { fallback: 'AL' } };

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar alt="Ada Lovelace" size="sm" />
      <Avatar alt="Ada Lovelace" size="md" />
      <Avatar alt="Ada Lovelace" size="lg" />
      <Avatar alt="Ada Lovelace" size="xl" />
    </div>
  ),
};
