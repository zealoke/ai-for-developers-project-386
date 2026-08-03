import { Button, SimpleGrid, Text, Tooltip } from '@mantine/core';
import type { Slot } from '../../../api/types';
import { formatTime } from '../../../lib/datetime';

interface SlotGridProps {
  slots: Slot[];
  timeZone: string;
  selectedSlot: Slot | undefined;
  onSelect: (slot: Slot) => void;
}

/**
 * Сетка слотов выбранного дня. Занятые слоты (`available: false` — пересечение
 * с любой другой бронью) показываем, но недоступными для выбора — так гостю
 * понятно, что время существует, но его нельзя выбрать.
 */
export function SlotGrid({ slots, timeZone, selectedSlot, onSelect }: SlotGridProps) {
  if (slots.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="md">
        На этот день нет слотов.
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="xs">
      {slots.map((slot) => {
        const isSelected = selectedSlot?.start === slot.start;
        const button = (
          <Button
            variant={isSelected ? 'filled' : 'default'}
            disabled={!slot.available}
            onClick={() => onSelect(slot)}
            fullWidth
          >
            {formatTime(slot.start, timeZone)}
          </Button>
        );

        return (
          <Tooltip key={slot.start} label="Время уже занято" withArrow disabled={slot.available}>
            <div>{button}</div>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
