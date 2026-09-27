import type { Meta, StoryObj } from '@storybook/react';

import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from './modal';
import { Button } from './button';

const meta = {
  title: 'UI/Modal',
  component: ModalContent,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ModalContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => (
    <Modal defaultOpen>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Confirm subscription</ModalTitle>
          <ModalDescription>
            You will be charged 5 USDC per month until you cancel.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </ModalFooter>
        <ModalClose />
      </ModalContent>
    </Modal>
  ),
};

export const WithTrigger: Story = {
  render: () => (
    <Modal>
      <ModalTrigger asChild>
        <Button>Open modal</Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Modal title</ModalTitle>
          <ModalDescription>Triggered from a button.</ModalDescription>
        </ModalHeader>
        <ModalClose />
      </ModalContent>
    </Modal>
  ),
};
