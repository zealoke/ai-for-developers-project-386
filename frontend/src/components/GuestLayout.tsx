import { AppShell, Group, Text, Title } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { Link, Outlet } from 'react-router';

/** Общий каркас гостевых страниц ("/", "/book/:eventTypeId"). */
export function GuestLayout() {
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Group gap="xs">
              <IconCalendarEvent size={24} color="var(--mantine-color-blue-6)" />
              <Title order={3} c="dark">
                Забронировать встречу
              </Title>
            </Group>
          </Link>
          <Text size="sm" c="dimmed">
            Вы гость
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Main bg="gray.0">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
