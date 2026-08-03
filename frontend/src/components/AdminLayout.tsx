import { AppShell, Group, NavLink, Text, Title } from '@mantine/core';
import { IconCalendarStats, IconClockHour4, IconList, IconSettings } from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router';

const NAV_ITEMS = [
  { to: '/admin/event-types', label: 'Типы встреч', icon: IconList },
  { to: '/admin/availability', label: 'График доступности', icon: IconClockHour4 },
  { to: '/admin/bookings', label: 'Брони', icon: IconCalendarStats },
];

/** Общий каркас страниц владельца календаря ("/admin/*"). */
export function AdminLayout() {
  const location = useLocation();

  return (
    <AppShell header={{ height: 64 }} navbar={{ width: 260, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <IconSettings size={24} color="var(--mantine-color-blue-6)" />
            <Title order={3} c="dark">
              Управление календарём
            </Title>
          </Group>
          <Text size="sm" c="dimmed">
            Вы владелец
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={18} />}
            active={location.pathname.startsWith(item.to)}
            mb={4}
          />
        ))}
      </AppShell.Navbar>
      <AppShell.Main bg="gray.0">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
