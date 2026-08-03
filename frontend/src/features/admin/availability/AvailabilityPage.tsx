import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAvailability, useReplaceAvailability } from '../../../api/hooks/useAvailability';
import { QueryBoundary } from '../../../components/QueryBoundary';
import { describeApiError } from '../../../api/errors';
import { validateIntervals } from '../../../lib/validation';
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from '../../../lib/weekdays';
import { inputValueToPlainTime, plainTimeToInputValue } from '../../../lib/datetime';
import { getSupportedTimeZones } from '../../../lib/timezones';
import type { AvailabilityInterval, AvailabilitySchedule, Weekday } from '../../../api/types';

const TIME_ZONE_OPTIONS = getSupportedTimeZones();
const DEFAULT_NEW_INTERVAL = { startTime: '09:00:00', endTime: '18:00:00' };

function AvailabilityEditor({ initial }: { initial: AvailabilitySchedule }) {
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [intervals, setIntervals] = useState<AvailabilityInterval[]>(initial.intervals);
  const replaceMutation = useReplaceAvailability();

  const errors = useMemo(() => validateIntervals(intervals), [intervals]);
  const errorsByIndex = useMemo(() => {
    const map = new Map<number, string>();
    errors.forEach((error) => map.set(error.index, error.message));
    return map;
  }, [errors]);

  const hasChanges =
    timeZone !== initial.timeZone ||
    JSON.stringify(intervals) !== JSON.stringify(initial.intervals);

  const addInterval = (weekday: Weekday) => {
    setIntervals((prev) => [...prev, { weekday, ...DEFAULT_NEW_INTERVAL }]);
  };

  const updateInterval = (index: number, patch: Partial<AvailabilityInterval>) => {
    setIntervals((prev) =>
      prev.map((interval, i) => (i === index ? { ...interval, ...patch } : interval)),
    );
  };

  const removeInterval = (index: number) => {
    setIntervals((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setTimeZone(initial.timeZone);
    setIntervals(initial.intervals);
  };

  const handleSave = () => {
    if (errors.length > 0) {
      notifications.show({
        color: 'red',
        message: 'Исправьте ошибки в интервалах перед сохранением',
      });
      return;
    }
    replaceMutation.mutate(
      { timeZone, intervals },
      {
        onSuccess: () => notifications.show({ color: 'green', message: 'График сохранён' }),
        onError: (error) => notifications.show({ color: 'red', message: describeApiError(error) }),
      },
    );
  };

  return (
    <Stack gap="lg">
      <Select
        label="Часовой пояс"
        description="Все интервалы ниже указаны в этом часовом поясе"
        data={TIME_ZONE_OPTIONS}
        searchable
        value={timeZone}
        onChange={(value) => value && setTimeZone(value)}
        maw={360}
      />

      {WEEKDAY_ORDER.map((weekday) => {
        const dayIntervals = intervals
          .map((interval, index) => ({ interval, index }))
          .filter(({ interval }) => interval.weekday === weekday);

        return (
          <Card
            key={weekday}
            withBorder
            radius="md"
            padding="md"
            data-testid={`weekday-card-${weekday}`}
          >
            <Group justify="space-between" mb="sm">
              <Text fw={600}>{WEEKDAY_LABELS[weekday]}</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => addInterval(weekday)}
              >
                Добавить интервал
              </Button>
            </Group>

            {dayIntervals.length === 0 ? (
              <Text size="sm" c="dimmed">
                Нет рабочих интервалов — в этот день бронирование недоступно
              </Text>
            ) : (
              <Stack gap="xs">
                {dayIntervals.map(({ interval, index }) => (
                  <Stack key={index} gap={2}>
                    <Group align="flex-end">
                      <TimeInput
                        label="С"
                        value={plainTimeToInputValue(interval.startTime)}
                        onChange={(event) =>
                          updateInterval(index, {
                            startTime: inputValueToPlainTime(event.currentTarget.value),
                          })
                        }
                      />
                      <TimeInput
                        label="До"
                        value={plainTimeToInputValue(interval.endTime)}
                        onChange={(event) =>
                          updateInterval(index, {
                            endTime: inputValueToPlainTime(event.currentTarget.value),
                          })
                        }
                      />
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        aria-label="Удалить интервал"
                        onClick={() => removeInterval(index)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                    {errorsByIndex.has(index) && (
                      <Text size="xs" c="red">
                        {errorsByIndex.get(index)}
                      </Text>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Card>
        );
      })}

      <Group justify="flex-end">
        <Button variant="default" disabled={!hasChanges} onClick={reset}>
          Сбросить изменения
        </Button>
        <Button
          onClick={handleSave}
          loading={replaceMutation.isPending}
          disabled={!hasChanges || errors.length > 0}
        >
          Сохранить график
        </Button>
      </Group>
    </Stack>
  );
}

export function AvailabilityPage() {
  const query = useAvailability();

  return (
    <Container size="md">
      <Title order={2} mb="lg">
        График доступности
      </Title>
      <Text c="dimmed" mb="lg" size="sm">
        Ниже — интервалы, когда вас можно забронировать (в контракте API они называются
        &laquo;интервалами занятости&raquo;, но сетка слотов строится именно нарезкой этих
        интервалов).
      </Text>
      <QueryBoundary query={query}>
        {(schedule) => <AvailabilityEditor initial={schedule} />}
      </QueryBoundary>
    </Container>
  );
}
