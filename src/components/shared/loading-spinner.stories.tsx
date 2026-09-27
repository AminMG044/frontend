import type { Meta, StoryObj } from '@storybook/react';

import { LoadingSpinner } from './loading-spinner';

const meta = {
  title: 'Shared/LoadingSpinner',
  component: LoadingSpinner,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    message: { control: 'text' },
  },
  args: {
    size: 'md',
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMessage: Story = { args: { message: 'Loading your dashboard…' } };

export const Large: Story = { args: { size: 'lg', message: 'Connecting wallet…' } };

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <LoadingSpinner size="sm" message="sm" />
      <LoadingSpinner size="md" message="md" />
      <LoadingSpinner size="lg" message="lg" />
    </div>
  ),
};
