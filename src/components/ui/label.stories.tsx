import type { Meta, StoryObj } from '@storybook/react';

import { Label } from './label';

const meta = {
  title: 'UI/Label',
  component: Label,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    children: 'Wallet address',
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDisabledPeer: Story = {
  render: (args) => (
    <div className="grid gap-2">
      <Label {...args} htmlFor="storybook-disabled-input" />
      <input
        id="storybook-disabled-input"
        disabled
        className="peer h-10 w-[320px] rounded-md border border-input px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  ),
};
