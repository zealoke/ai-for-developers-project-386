import { useEffect, useState } from 'react';
import { Button, Card, Container, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router';
import { notifications } from '@mantine/notifications';
import { useEventType } from '../../api/hooks/useEventTypes';
import { useSlots } from '../../api/hooks/useSlots';
import { useCreateBooking } from '../../api/hooks/useBookings';
import { QueryBoundary } from '../../components/QueryBoundary';
import { TimeZoneNote } from '../../components/TimeZoneNote';
import { ApiError, describeApiError, validationErrorsToFieldMap } from '../../api/errors';
import { DayPicker } from './booking/DayPicker';
import { SlotGrid } from './booking/SlotGrid';
import { BookingForm } from './booking/BookingForm';
import type { EventTypeId, Slot } from '../../api/types';

export function BookingPage() {
  const { eventTypeId } = useParams<{ eventTypeId: string }>();
  const navigate = useNavigate();
  const typedEventTypeId = eventTypeId as EventTypeId;

  const eventTypeQuery = useEventType(typedEventTypeId);
  const slotsQuery = useSlots(typedEventTypeId);
  const createBooking = useCreateBooking();

  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedSlot, setSelectedSlot] = useState<Slot>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();

  // Тип встречи удалили или он никогда не существовал — контракт отвечает
  // 404, гостю в этой ветке делать больше нечего.
  useEffect(() => {
    if (eventTypeQuery.isError && eventTypeQuery.error instanceof ApiError) {
      if (eventTypeQuery.error.is('NOT_FOUND')) {
        notifications.show({ color: 'red', message: 'Этот тип встречи больше не доступен' });
        navigate('/', { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeQuery.isError, eventTypeQuery.error]);

  return (
    <Container size="sm" py="xl">
      <Button
        component={Link}
        to="/"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
      >
        Назад к списку
      </Button>

      <QueryBoundary query={eventTypeQuery}>
        {(eventType) => (
          <Stack gap="lg">
            <div>
              <Title order={2}>{eventType.title}</Title>
              <Text c="dimmed">{eventType.durationMinutes} минут</Text>
            </div>

            <QueryBoundary query={slotsQuery}>
              {(slotsResponse) => {
                const { days, timeZone } = slotsResponse;
                const activeDate =
                  selectedDate ??
                  days.find((day) => day.slots.some((slot) => slot.available))?.date ??
                  days[0]?.date;
                const activeDay = days.find((day) => day.date === activeDate);

                return (
                  <Stack gap="lg">
                    <Card withBorder radius="md" padding="lg">
                      <Stack gap="md">
                        <TimeZoneNote timeZone={timeZone} />
                        <DayPicker
                          days={days}
                          selectedDate={activeDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setSelectedSlot(undefined);
                          }}
                        />
                        {activeDay && (
                          <SlotGrid
                            slots={activeDay.slots}
                            timeZone={timeZone}
                            selectedSlot={selectedSlot}
                            onSelect={setSelectedSlot}
                          />
                        )}
                      </Stack>
                    </Card>

                    {selectedSlot && (
                      <Card withBorder radius="md" padding="lg">
                        <Stack gap="md">
                          <Title order={4}>Ваши данные</Title>
                          <BookingForm
                            submitting={createBooking.isPending}
                            fieldErrors={fieldErrors}
                            onCancel={() => setSelectedSlot(undefined)}
                            onSubmit={(values) => {
                              setFieldErrors(undefined);
                              createBooking.mutate(
                                {
                                  eventTypeId: typedEventTypeId,
                                  start: selectedSlot.start,
                                  guestName: values.guestName,
                                  guestEmail: values.guestEmail,
                                  notes: values.notes.trim() || undefined,
                                },
                                {
                                  onSuccess: (booking) => {
                                    navigate(`/book/${typedEventTypeId}/done`, {
                                      state: {
                                        booking,
                                        eventTypeTitle: eventType.title,
                                        timeZone,
                                      },
                                    });
                                  },
                                  onError: (error) => {
                                    if (error instanceof ApiError) {
                                      if (error.is('VALIDATION_ERROR')) {
                                        const details =
                                          'details' in (error.body ?? {})
                                            ? (
                                                error.body as {
                                                  details: { field: string; message: string }[];
                                                }
                                              ).details
                                            : [];
                                        setFieldErrors(validationErrorsToFieldMap(details));
                                        return;
                                      }
                                      if (error.is('SLOT_TAKEN')) {
                                        notifications.show({
                                          color: 'red',
                                          message: 'Это время только что заняли. Выберите другое.',
                                        });
                                        setSelectedSlot(undefined);
                                        void slotsQuery.refetch();
                                        return;
                                      }
                                      if (
                                        error.is('SLOT_OUT_OF_RANGE') ||
                                        error.is('SLOT_NOT_ALIGNED')
                                      ) {
                                        notifications.show({
                                          color: 'red',
                                          message: 'Сетка слотов изменилась. Выберите слот заново.',
                                        });
                                        setSelectedSlot(undefined);
                                        void slotsQuery.refetch();
                                        return;
                                      }
                                      if (error.is('NOT_FOUND')) {
                                        notifications.show({
                                          color: 'red',
                                          message: 'Этот тип встречи больше не доступен',
                                        });
                                        navigate('/', { replace: true });
                                        return;
                                      }
                                    }
                                    notifications.show({
                                      color: 'red',
                                      message: describeApiError(error),
                                    });
                                  },
                                },
                              );
                            }}
                          />
                        </Stack>
                      </Card>
                    )}
                  </Stack>
                );
              }}
            </QueryBoundary>
          </Stack>
        )}
      </QueryBoundary>
    </Container>
  );
}
