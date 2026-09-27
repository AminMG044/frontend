import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'],
    },
  },
  args: {
    children: 'Badge',
    variant: 'default',
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Destructive: Story = { args: { variant: 'destructive' } };

export const Outline: Story = { args: { variant: 'outline' } };

export const Success: Story = { args: { variant: 'success', children: 'Verified' } };

export const Warning: Story = { args: { variant: 'warning', children: 'Pending' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
    </div>
  ),
};
