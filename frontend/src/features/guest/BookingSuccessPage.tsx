import { Alert, Button, Container, Stack, Text, Title } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router';
import type { Booking } from '../../api/types';
import { formatDateTime } from '../../lib/datetime';

interface BookingSuccessState {
  booking?: Booking;
  eventTypeTitle?: string;
  timeZone?: string;
}

/**
 * Контракт не даёт гостю способа получить бронь по id (нет GET /bookings/{id}
 * для гостей), поэтому данные о брони передаются через state роутера сразу
 * после успешного POST /bookings. При прямом заходе/обновлении страницы
 * показываем понятное сообщение вместо попытки что-то запросить.
 */
export function BookingSuccessPage() {
  const location = useLocation();
  const state = (location.state as BookingSuccessState | null) ?? {};

  if (!state.booking) {
    return (
      <Container size="sm" py="xl">
        <Alert color="yellow" title="Данные о брони недоступны">
          <Stack gap="md">
            <Text size="sm">
              Похоже, вы обновили страницу или перешли по прямой ссылке. Контракт API не позволяет
              запросить данные брони повторно — пожалуйста, начните бронирование заново.
            </Text>
            <Button component={Link} to="/" style={{ alignSelf: 'flex-start' }}>
              К списку типов встреч
            </Button>
          </Stack>
        </Alert>
      </Container>
    );
  }

  const { booking, eventTypeTitle, timeZone } = state;

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="md" ta="center">
        <IconCircleCheck size={64} color="var(--mantine-color-green-6)" />
        <Title order={2}>Встреча забронирована</Title>
        {eventTypeTitle && <Text size="lg">{eventTypeTitle}</Text>}
        <Text fw={600} size="lg">
          {timeZone ? formatDateTime(booking.start, timeZone) : booking.start}
        </Text>
        <Text c="dimmed">
          {booking.guestName} · {booking.guestEmail}
        </Text>
        {booking.notes && <Text c="dimmed">«{booking.notes}»</Text>}
        <Button component={Link} to="/" mt="md">
          Забронировать ещё одну встречу
        </Button>
      </Stack>
    </Container>
  );
}
