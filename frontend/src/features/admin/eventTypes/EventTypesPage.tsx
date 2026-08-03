import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useDeleteEventType, useEventTypes } from '../../../api/hooks/useEventTypes';
import { QueryBoundary } from '../../../components/QueryBoundary';
import { describeApiError } from '../../../api/errors';
import { EventTypeFormModal } from './EventTypeFormModal';
import type { EventType } from '../../../api/types';

interface ModalState {
  opened: boolean;
  eventType?: EventType;
}

export function EventTypesPage() {
  const query = useEventTypes();
  const deleteMutation = useDeleteEventType();
  const [modalState, setModalState] = useState<ModalState>({ opened: false });

  const openCreate = () => setModalState({ opened: true, eventType: undefined });
  const openEdit = (eventType: EventType) => setModalState({ opened: true, eventType });
  const close = () => setModalState((state) => ({ ...state, opened: false }));

  const confirmDelete = (eventType: EventType) => {
    modals.openConfirmModal({
      title: 'Удалить тип встречи?',
      children: (
        <Text size="sm">
          «{eventType.title}» будет удалён без возможности восстановления. Уже созданные брони этого
          типа не удаляются.
        </Text>
      ),
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        deleteMutation.mutate(eventType.id, {
          onSuccess: () => notifications.show({ color: 'green', message: 'Тип встречи удалён' }),
          onError: (error) =>
            notifications.show({ color: 'red', message: describeApiError(error) }),
        });
      },
    });
  };

  return (
    <Container size="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Типы встреч</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Добавить
          </Button>
        </Group>

        <QueryBoundary query={query}>
          {(eventTypes) =>
            eventTypes.length === 0 ? (
              <Text c="dimmed">Пока нет ни одного типа встречи. Добавьте первый.</Text>
            ) : (
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Название</Table.Th>
                    <Table.Th>Длительность</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {eventTypes.map((eventType) => (
                    <Table.Tr key={eventType.id}>
                      <Table.Td>
                        <Text fw={500}>{eventType.title}</Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {eventType.description}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{eventType.durationMinutes} мин</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <ActionIcon
                            variant="subtle"
                            aria-label="Редактировать"
                            onClick={() => openEdit(eventType)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Удалить"
                            onClick={() => confirmDelete(eventType)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )
          }
        </QueryBoundary>
      </Stack>

      <EventTypeFormModal
        opened={modalState.opened}
        eventType={modalState.eventType}
        onClose={close}
      />
    </Container>
  );
}
