import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search'] },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  args: {
    type: 'text',
    placeholder: 'you@example.com',
    disabled: false,
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-[320px] gap-2">
      <Label htmlFor="storybook-email">Email</Label>
      <Input {...args} id="storybook-email" />
    </div>
  ),
};
