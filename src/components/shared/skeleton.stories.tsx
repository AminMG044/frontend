import type { Meta, StoryObj } from '@storybook/react';

import { Skeleton, SkeletonCard, SkeletonGrid, SkeletonText } from './skeleton';

const meta = {
  title: 'Shared/Skeleton',
  component: Skeleton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { className: { control: 'text' } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Skeleton {...args} className="h-6 w-48" />,
};

export const Text: Story = {
  render: () => (
    <div className="w-[420px]">
      <SkeletonText lines={4} />
    </div>
  ),
};

export const CardPlaceholder: Story = {
  render: () => (
    <div className="w-[360px]">
      <SkeletonCard />
    </div>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="w-[720px]">
      <SkeletonGrid count={6} cols={3} />
    </div>
  ),
};
