import type { Meta, StoryObj } from '@storybook/react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Creator earnings</CardTitle>
        <CardDescription>Last 30 days of USDC tips</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">$1,204.50</p>
        <p className="text-sm text-muted-foreground">+12% vs. previous period</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Details</Button>
        <Button>Withdraw</Button>
      </CardFooter>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardContent className="pt-6">
        <p className="text-sm">A bare card with content only.</p>
      </CardContent>
    </Card>
  ),
};
