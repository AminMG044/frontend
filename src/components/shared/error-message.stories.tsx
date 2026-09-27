import type { Meta, StoryObj } from '@storybook/react';

import { ErrorMessage } from './error-message';

const meta = {
  title: 'Shared/ErrorMessage',
  component: ErrorMessage,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    message: { control: 'text' },
    onDismiss: { control: false },
  },
  args: {
    message: 'We could not load your analytics. Please try again.',
  },
  render: (args) => (
    <div className="w-[420px]">
      <ErrorMessage {...args} />
    </div>
  ),
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTitle: Story = {
  args: { title: 'Something went wrong', message: 'The request timed out.' },
};

export const Dismissible: Story = {
  args: { onDismiss: () => undefined },
};
