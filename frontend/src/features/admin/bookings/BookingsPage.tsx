import { useMemo, useState } from 'react';
import { Badge, Container, Group, Stack, Switch, Table, Text, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useAvailability } from '../../../api/hooks/useAvailability';
import { useBookings } from '../../../api/hooks/useBookings';
import { QueryBoundary } from '../../../components/QueryBoundary';
import { formatDayLabel, formatTimeRange, toOwnerTime } from '../../../lib/datetime';
import type { BookingListItem } from '../../../api/types';

function BookingsTable({ bookings, timeZone }: { bookings: BookingListItem[]; timeZone: string }) {
  const groupedByDay = useMemo(() => {
    const groups = new Map<string, BookingListItem[]>();
    for (const booking of bookings) {
      const dayKey = toOwnerTime(booking.start, timeZone).format('YYYY-MM-DD');
      const list = groups.get(dayKey) ?? [];
      list.push(booking);
      groups.set(dayKey, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [bookings, timeZone]);

  if (bookings.length === 0) {
    return <Text c="dimmed">Броней не найдено.</Text>;
  }

  return (
    <Stack gap="xl">
      {groupedByDay.map(([day, dayBookings]) => (
        <div key={day}>
          <Text fw={600} mb="xs">
            {formatDayLabel(day)}
          </Text>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Время</Table.Th>
                <Table.Th>Тип встречи</Table.Th>
                <Table.Th>Гость</Table.Th>
                <Table.Th>Комментарий</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {dayBookings.map((booking) => (
                <Table.Tr key={booking.id}>
                  <Table.Td>{formatTimeRange(booking.start, booking.end, timeZone)}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{booking.eventTypeTitle}</Text>
                    <Badge variant="light" size="sm">
                      {booking.durationMinutes} мин
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{booking.guestName}</Text>
                    <Text size="xs" c="dimmed">
                      {booking.guestEmail}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {booking.notes || '\u2014'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      ))}
    </Stack>
  );
}

export function BookingsPage() {
  const [range, setRange] = useState<[string | null, string | null]>([null, null]);
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const params = useMemo(
    () => ({
      from: range[0] ?? undefined,
      to: range[1] ?? undefined,
      upcoming: upcomingOnly,
    }),
    [range, upcomingOnly],
  );

  // BookingListItem не содержит timeZone — он общий для всего календаря и
  // приходит из графика доступности владельца.
  const availabilityQuery = useAvailability();
  const bookingsQuery = useBookings(params);

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Title order={2}>Брони</Title>

        <Group align="flex-end">
          <DatePickerInput
            type="range"
            label="Диапазон дат (по началу встречи)"
            placeholder="Все даты"
            value={range}
            onChange={setRange}
            clearable
            maw={320}
          />
          <Switch
            label="Только предстоящие"
            checked={upcomingOnly}
            onChange={(event) => setUpcomingOnly(event.currentTarget.checked)}
          />
        </Group>

        <QueryBoundary query={availabilityQuery}>
          {(schedule) => (
            <QueryBoundary query={bookingsQuery}>
              {(bookings) => <BookingsTable bookings={bookings} timeZone={schedule.timeZone} />}
            </QueryBoundary>
          )}
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
