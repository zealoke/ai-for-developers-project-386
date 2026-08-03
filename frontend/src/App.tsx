import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { theme } from './theme';
import { GuestLayout } from './components/GuestLayout';
import { AdminLayout } from './components/AdminLayout';
import { EventTypeListPage } from './features/guest/EventTypeListPage';
import { BookingPage } from './features/guest/BookingPage';
import { BookingSuccessPage } from './features/guest/BookingSuccessPage';
import { EventTypesPage } from './features/admin/eventTypes/EventTypesPage';
import { AvailabilityPage } from './features/admin/availability/AvailabilityPage';
import { BookingsPage } from './features/admin/bookings/BookingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              {/* Гостевой путь: список типов встреч и бронирование, без авторизации. */}
              <Route element={<GuestLayout />}>
                <Route index element={<EventTypeListPage />} />
                <Route path="book/:eventTypeId" element={<BookingPage />} />
                <Route path="book/:eventTypeId/done" element={<BookingSuccessPage />} />
              </Route>

              {/* Путь владельца календаря: управление типами встреч, графиком и бронями. */}
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="event-types" replace />} />
                <Route path="event-types" element={<EventTypesPage />} />
                <Route path="availability" element={<AvailabilityPage />} />
                <Route path="bookings" element={<BookingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default App;
