import { Group, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

/**
 * Контракт возвращает время в UTC, но интерфейс показывает его в часовом
 * поясе владельца календаря (см. src/lib/datetime.ts). Эта плашка всегда
 * рядом со временем, чтобы для гостя не было сюрпризов.
 */
export function TimeZoneNote({ timeZone }: { timeZone: string }) {
  return (
    <Group gap="xs" c="dimmed">
      <IconClock size={16} />
      <Text size="sm">Время указано в часовом поясе владельца: {timeZone}</Text>
    </Group>
  );
}
