import { useEffect } from 'react';
import { Button, Group, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { BOOKING_LIMITS } from '../../../lib/validation';

export interface BookingFormValues {
  guestName: string;
  guestEmail: string;
  notes: string;
}

interface BookingFormProps {
  onSubmit: (values: BookingFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  fieldErrors?: Record<string, string>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BookingForm({ onSubmit, onCancel, submitting, fieldErrors }: BookingFormProps) {
  const form = useForm<BookingFormValues>({
    initialValues: { guestName: '', guestEmail: '', notes: '' },
    validate: {
      guestName: (value) => {
        const trimmed = value.trim();
        if (trimmed.length < BOOKING_LIMITS.guestNameMin) {
          return 'Укажите имя';
        }
        if (value.length > BOOKING_LIMITS.guestNameMax) {
          return `Имя не должно превышать ${BOOKING_LIMITS.guestNameMax} символов`;
        }
        return null;
      },
      guestEmail: (value) => (EMAIL_PATTERN.test(value) ? null : 'Введите корректный email'),
      notes: (value) =>
        value.length > BOOKING_LIMITS.notesMax
          ? `Комментарий не должен превышать ${BOOKING_LIMITS.notesMax} символов`
          : null,
    },
  });

  // Серверные ошибки валидации (VALIDATION_ERROR.details) накладываем поверх
  // полей формы по имени поля.
  useEffect(() => {
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      form.setErrors(fieldErrors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);

  return (
    <form onSubmit={form.onSubmit(onSubmit)} noValidate>
      <Stack gap="sm">
        <TextInput
          label="Имя"
          placeholder="Как к вам обращаться"
          required
          maxLength={BOOKING_LIMITS.guestNameMax}
          {...form.getInputProps('guestName')}
        />
        <TextInput
          label="Email"
          placeholder="you@example.com"
          type="email"
          required
          {...form.getInputProps('guestEmail')}
        />
        <Textarea
          label="Комментарий"
          placeholder="Необязательно"
          minRows={2}
          maxLength={BOOKING_LIMITS.notesMax}
          {...form.getInputProps('notes')}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onCancel} disabled={submitting}>
            Отмена
          </Button>
          <Button type="submit" loading={submitting}>
            Подтвердить бронь
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
