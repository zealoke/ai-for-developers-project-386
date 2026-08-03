import { Button, Group, ScrollArea } from '@mantine/core';
import type { DaySlots } from '../../../api/types';
import { formatDayShortLabel } from '../../../lib/datetime';

interface DayPickerProps {
  days: DaySlots[];
  selectedDate: string | undefined;
  onSelect: (date: string) => void;
}

/** Список дней в окне бронирования (14 дней от сегодня, окно задаёт сервер). */
export function DayPicker({ days, selectedDate, onSelect }: DayPickerProps) {
  return (
    <ScrollArea type="auto" offsetScrollbars>
      <Group gap="xs" wrap="nowrap" pb="xs">
        {days.map((day) => {
          const hasAvailable = day.slots.some((slot) => slot.available);
          const isSelected = day.date === selectedDate;
          return (
            <Button
              key={day.date}
              variant={isSelected ? 'filled' : 'default'}
              color={isSelected ? 'blue' : 'gray'}
              disabled={!hasAvailable}
              onClick={() => onSelect(day.date)}
              size="sm"
              style={{ flexShrink: 0 }}
            >
              {formatDayShortLabel(day.date)}
            </Button>
          );
        })}
      </Group>
    </ScrollArea>
  );
}
