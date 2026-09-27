'use client';

/**
 * Mobile-friendly Date & Time Picker Component wrapping react-datepicker
 * Enforces future-date-only selection with clean styling
 */

import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateTimePickerProps {
  id?: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  minDate?: Date;
  placeholderText?: string;
  className?: string;
}

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onClick?: () => void;
}

const CustomDateInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, placeholder, disabled, id }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        id={id}
        type="text"
        readOnly
        value={value || ''}
        onClick={onClick}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Delivery date and time"
        className={cn(
          'w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground',
          'cursor-pointer placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
      <Calendar
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
);
CustomDateInput.displayName = 'CustomDateInput';

export function DateTimePicker({
  id = 'scheduled-date-picker',
  selected,
  onChange,
  disabled = false,
  minDate = new Date(),
  placeholderText = 'Select delivery date and time',
  className,
}: DateTimePickerProps): JSX.Element {
  return (
    <div className={cn('relative w-full datepicker-wrapper', className)}>
      <DatePicker
        id={id}
        selected={selected}
        onChange={onChange}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="MMM d, yyyy h:mm aa"
        minDate={minDate}
        disabled={disabled}
        placeholderText={placeholderText}
        customInput={<CustomDateInput id={id} />}
        popperPlacement="bottom-start"
        popperModifiers={[
          {
            name: 'preventOverflow',
            options: {
              padding: 8,
            },
          },
        ]}
      />
    </div>
  );
}
