import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { Link } from 'react-router';
import { useEventTypes } from '../../api/hooks/useEventTypes';
import { QueryBoundary } from '../../components/QueryBoundary';

export function EventTypeListPage() {
  const query = useEventTypes();

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Выберите тип встречи</Title>
          <Text c="dimmed">Забронируйте удобное время без регистрации.</Text>
        </div>
        <QueryBoundary query={query}>
          {(eventTypes) =>
            eventTypes.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Пока нет доступных типов встреч. Загляните позже.
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                {eventTypes.map((eventType) => (
                  <Card
                    key={eventType.id}
                    withBorder
                    radius="md"
                    padding="lg"
                    data-testid={`event-type-card-${eventType.id}`}
                  >
                    <Stack gap="xs" h="100%" justify="space-between">
                      <div>
                        <Group justify="space-between" mb={4} wrap="nowrap" align="flex-start">
                          <Title order={4}>{eventType.title}</Title>
                          <Badge variant="light" leftSection={<IconClock size={12} />}>
                            {eventType.durationMinutes} мин
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed" lineClamp={3}>
                          {eventType.description || 'Без описания'}
                        </Text>
                      </div>
                      <Button component={Link} to={`/book/${eventType.id}`} fullWidth mt="sm">
                        Выбрать время
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            )
          }
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
