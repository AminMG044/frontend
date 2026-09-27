import type { Meta, StoryObj } from '@storybook/react';
import { Inbox, SearchX } from 'lucide-react';

import { EmptyState } from './empty-state';

const meta = {
  title: 'Shared/EmptyState',
  component: EmptyState,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: false },
    action: { control: false },
  },
  args: {
    title: 'No tips yet',
    description: 'Once supporters send USDC, their tips will show up here.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIcon: Story = { args: { icon: Inbox } };

export const WithAction: Story = {
  args: {
    icon: SearchX,
    title: 'No creators found',
    description: 'Try a different search term.',
    action: { label: 'Clear filters', onClick: () => undefined },
  },
};
