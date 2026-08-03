import { useEffect } from 'react';
import { Button, Group, Modal, NumberInput, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCreateEventType, useUpdateEventType } from '../../../api/hooks/useEventTypes';
import { ApiError, describeApiError, validationErrorsToFieldMap } from '../../../api/errors';
import { EVENT_TYPE_LIMITS } from '../../../lib/validation';
import type { EventType, ValidationErrorDetail } from '../../../api/types';

interface EventTypeFormModalProps {
  opened: boolean;
  onClose: () => void;
  eventType?: EventType;
}

interface FormValues {
  title: string;
  description: string;
  durationMinutes: number;
}

const EMPTY_VALUES: FormValues = { title: '', description: '', durationMinutes: 30 };

export function EventTypeFormModal({ opened, onClose, eventType }: EventTypeFormModalProps) {
  const isEditing = Boolean(eventType);
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const mutation = isEditing ? updateMutation : createMutation;

  const form = useForm<FormValues>({
    initialValues: eventType
      ? {
          title: eventType.title,
          description: eventType.description,
          durationMinutes: eventType.durationMinutes,
        }
      : EMPTY_VALUES,
    validate: {
      title: (value) => {
        const trimmed = value.trim();
        if (trimmed.length < EVENT_TYPE_LIMITS.titleMin) {
          return 'Укажите название';
        }
        if (value.length > EVENT_TYPE_LIMITS.titleMax) {
          return `Не более ${EVENT_TYPE_LIMITS.titleMax} символов`;
        }
        return null;
      },
      description: (value) =>
        value.length > EVENT_TYPE_LIMITS.descriptionMax
          ? `Не более ${EVENT_TYPE_LIMITS.descriptionMax} символов`
          : null,
      durationMinutes: (value) =>
        value < EVENT_TYPE_LIMITS.durationMin || value > EVENT_TYPE_LIMITS.durationMax
          ? `От ${EVENT_TYPE_LIMITS.durationMin} до ${EVENT_TYPE_LIMITS.durationMax} минут`
          : null,
    },
  });

  // Синхронизируем форму при каждом открытии модалки (новая карточка или
  // повторное открытие для другого типа события).
  useEffect(() => {
    if (opened) {
      form.setValues(
        eventType
          ? {
              title: eventType.title,
              description: eventType.description,
              durationMinutes: eventType.durationMinutes,
            }
          : EMPTY_VALUES,
      );
      form.clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, eventType]);

  const handleApiError = (error: unknown) => {
    if (error instanceof ApiError && error.is('VALIDATION_ERROR')) {
      const details =
        'details' in (error.body ?? {})
          ? (error.body as { details: ValidationErrorDetail[] }).details
          : [];
      form.setErrors(validationErrorsToFieldMap(details));
      return;
    }
    notifications.show({ color: 'red', message: describeApiError(error) });
  };

  const handleSubmit = form.onSubmit((values) => {
    if (isEditing && eventType) {
      updateMutation.mutate(
        { eventTypeId: eventType.id, body: values },
        {
          onSuccess: () => {
            notifications.show({ color: 'green', message: 'Тип встречи обновлён' });
            onClose();
          },
          onError: handleApiError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          notifications.show({ color: 'green', message: 'Тип встречи создан' });
          form.reset();
          onClose();
        },
        onError: handleApiError,
      });
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Редактировать тип встречи' : 'Новый тип встречи'}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="sm">
          <TextInput
            label="Название"
            required
            maxLength={EVENT_TYPE_LIMITS.titleMax}
            {...form.getInputProps('title')}
          />
          <Textarea
            label="Описание"
            maxLength={EVENT_TYPE_LIMITS.descriptionMax}
            minRows={3}
            {...form.getInputProps('description')}
          />
          <NumberInput
            label="Длительность (мин)"
            min={EVENT_TYPE_LIMITS.durationMin}
            max={EVENT_TYPE_LIMITS.durationMax}
            step={5}
            required
            {...form.getInputProps('durationMinutes')}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEditing ? 'Сохранить' : 'Создать'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
